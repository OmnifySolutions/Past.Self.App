import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Switch, Platform, Keyboard, FlatList, Modal, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, PrefillData } from '../../App';
import { getVideos, updateVideo, scheduleVideoNotification, cancelVideoNotification } from '../utils/storage';
import { ScheduledVideo, TriggerType, RepeatOption } from '../types/video';
import { colors, fonts, spacing, radius } from '../styles/theme';
import { BrandAlert, useBrandAlert } from '../components/BrandAlert';
import { getRepeatDescription, getNextOccurrence } from '../utils/repeatUtils';
import AppGuard, { InstalledApp } from '../../modules/app-guard/index';

type Props = NativeStackScreenProps<RootStackParamList, 'Edit'>;

const REPEAT_OPTIONS: { label: string; value: RepeatOption }[] = [
  { label: 'Never',    value: 'never'    },
  { label: 'Daily',    value: 'daily'    },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Weekly',   value: 'weekly'   },
  { label: 'Monthly',  value: 'monthly'  },
];

export function EditScreen({ route, navigation }: Props) {
  const { videoId } = route.params;
  const insets = useSafeAreaInsets();

  const [video, setVideo]             = useState<ScheduledVideo | null>(null);
  const [title, setTitle]             = useState('');
  const [message, setMessage]         = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('datetime');
  const [date, setDate]               = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeat, setRepeat]           = useState<RepeatOption>('never');
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);
  const [playOnce, setPlayOnce]       = useState(true);

  const [guardEnabled, setGuardEnabled]         = useState(false);
  const [installedApps, setInstalledApps]       = useState<InstalledApp[]>([]);
  const [appsLoading, setAppsLoading]           = useState(false);
  const [appPickerVisible, setAppPickerVisible] = useState(false);
  const [appSearch, setAppSearch]               = useState('');

  const { alertConfig, showAlert, hideAlert } = useBrandAlert();

  useEffect(() => {
    getVideos().then(videos => {
      const found = videos.find(v => v.id === videoId);
      if (found) {
        setVideo(found);
        setTitle(found.title);
        setMessage(found.message || '');
        setTriggerType(found.scheduledFor ? 'datetime' : 'app');
        if (found.scheduledFor) setDate(new Date(found.scheduledFor));
        if (found.repeat) setRepeat(found.repeat);
        if (found.appTrigger) {
          setSelectedApp({
            appName:     found.appTrigger.appName,
            packageName: found.appTrigger.packageName || '',
          });
          setPlayOnce(found.appTrigger.playOnce);
        }
      }
    });
  }, [videoId]);

  useFocusEffect(useCallback(() => {
    setGuardEnabled(AppGuard.isServiceEnabled());
  }, []));

  useEffect(() => {
    if (triggerType === 'app' && installedApps.length === 0) {
      setAppsLoading(true);
      AppGuard.getInstalledApps()
        .then(setInstalledApps)
        .catch(() => setInstalledApps([]))
        .finally(() => setAppsLoading(false));
    }
  }, [triggerType]);

  const buildPrefill = (): PrefillData => ({
    id: videoId,
    title,
    message,
    triggerType,
    scheduledFor: date.toISOString(),
    repeat,
    appName:     selectedApp?.appName,
    packageName: selectedApp?.packageName,
    playOnce,
    createdAt: video?.createdAt,
  });

  const handleReRecord = () => {
    showAlert(
      'Re-record video?',
      "You'll go to the camera. Your title and settings will be kept.",
      [
        { label: 'Cancel', onPress: hideAlert, style: 'cancel' },
        {
          label: 'Re-record', style: 'danger',
          onPress: () => { hideAlert(); navigation.navigate('Record', { prefill: buildPrefill() }); },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showAlert('Title required', 'Please give your video a name before saving.', [
        { label: 'OK', onPress: hideAlert, style: 'default' },
      ]);
      return;
    }
    if (triggerType === 'app' && !selectedApp) {
      showAlert('Select an app', 'Please choose which app should trigger this video.', [
        { label: 'OK', onPress: hideAlert, style: 'default' },
      ]);
      return;
    }

    const updates: Partial<ScheduledVideo> = {
      title: title.trim(),
      message: message.trim(),
      isActive: true,
    };

    if (triggerType === 'datetime') {
      updates.scheduledFor = date.toISOString();
      updates.repeat       = repeat;
      updates.appTrigger   = undefined;
      if (video?.notificationId) await cancelVideoNotification(video.notificationId);
      const tempVideo      = { ...video!, ...updates } as ScheduledVideo;
      const notificationId = await scheduleVideoNotification(tempVideo);
      updates.notificationId = notificationId ?? undefined;
    } else {
      if (video?.notificationId) await cancelVideoNotification(video.notificationId);
      updates.notificationId = undefined;
      updates.appTrigger     = {
        appName:     selectedApp!.appName,
        packageName: selectedApp!.packageName,
        playOnce,
        hasPlayed: false,
      };
      updates.scheduledFor = undefined;
      updates.repeat       = undefined;
    }

    await updateVideo(videoId, updates);

    navigation.navigate('Confirmation', {
      videoId,
      thumbnail:    video?.thumbnail || '',
      title:        title.trim(),
      message:      message.trim(),
      scheduledFor: triggerType === 'datetime' ? date.toISOString() : undefined,
      repeat:       triggerType === 'datetime' ? repeat : undefined,
      appName:      triggerType === 'app' ? selectedApp?.appName : undefined,
      playOnce:     triggerType === 'app' ? playOnce : undefined,
    });
  };

  const repeatDesc     = repeat !== 'never' ? getRepeatDescription(date, repeat) : null;
  const nextOccurrence = repeat !== 'never' ? getNextOccurrence(date.toISOString(), repeat) : null;
  const filteredApps   = installedApps.filter(a =>
    a.appName.toLowerCase().includes(appSearch.toLowerCase())
  );

  if (!video) return <View style={{ flex: 1, backgroundColor: colors.card }} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Message</Text>
        <TouchableOpacity onPress={handleReRecord} style={styles.reRecordBtn}>
          <Ionicons name="camera-outline" size={16} color={colors.danger} />
          <Text style={styles.reRecordText}>Re-record</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle}
            placeholderTextColor={colors.textLight} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput style={[styles.input, styles.textarea]} value={message} onChangeText={setMessage}
            multiline numberOfLines={3} placeholderTextColor={colors.textLight}
            returnKeyType="done" blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>When should this play?</Text>
          <View style={styles.triggerRow}>
            <TouchableOpacity style={[styles.triggerCard, triggerType === 'datetime' && styles.triggerCardActive]}
              onPress={() => setTriggerType('datetime')} activeOpacity={0.85}>
              <Ionicons name="calendar-outline" size={24} color={triggerType === 'datetime' ? colors.danger : colors.text} />
              <Text style={styles.triggerLabel}>Date &amp; Time</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.triggerCard, triggerType === 'app' && styles.triggerCardActive]}
              onPress={() => setTriggerType('app')} activeOpacity={0.85}>
              <Ionicons name="phone-portrait-outline" size={24} color={triggerType === 'app' ? colors.danger : colors.text} />
              <Text style={styles.triggerLabel}>App Opening</Text>
            </TouchableOpacity>
          </View>
        </View>

        {triggerType === 'datetime' && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.dateDisplay} onPress={() => setShowDatePicker(true)} activeOpacity={0.85}>
              <Ionicons name="calendar-outline" size={18} color={colors.danger} />
              <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={date} mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={new Date()}
                onChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selected) { const next = new Date(selected); next.setHours(date.getHours(), date.getMinutes(), 0, 0); setDate(next); }
                }} />
            )}
            <TouchableOpacity style={styles.dateDisplay} onPress={() => setShowTimePicker(true)} activeOpacity={0.85}>
              <Ionicons name="time-outline" size={18} color={colors.danger} />
              <Text style={styles.dateText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker value={date} mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (selected) { const next = new Date(date); next.setHours(selected.getHours(), selected.getMinutes(), 0, 0); setDate(next); }
                }} />
            )}
            <Text style={styles.sublabel}>Repeat</Text>
            <View style={styles.repeatGrid}>
              {REPEAT_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value}
                  style={[styles.chip, repeat === opt.value && styles.chipActive]}
                  onPress={() => setRepeat(opt.value)} activeOpacity={0.85}>
                  <Text style={[styles.chipText, repeat === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {repeatDesc && (
              <View style={styles.repeatInfo}>
                <Ionicons name="sync-outline" size={14} color={colors.danger} />
                <Text style={styles.repeatInfoText}>{repeatDesc}</Text>
              </View>
            )}
            {nextOccurrence && (
              <View style={styles.repeatInfo}>
                <Ionicons name="time-outline" size={14} color={'#9898d6'} />
                <Text style={styles.repeatNextText}>
                  Next: {nextOccurrence.toLocaleDateString()} at {nextOccurrence.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          </View>
        )}

        {triggerType === 'app' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.guardRow, guardEnabled ? styles.guardRowOn : styles.guardRowOff]}
              onPress={() => { if (!guardEnabled) AppGuard.openAccessibilitySettings(); }}
              activeOpacity={guardEnabled ? 1 : 0.85}
            >
              <Ionicons name={guardEnabled ? 'shield-checkmark-outline' : 'shield-outline'} size={18}
                color={guardEnabled ? colors.danger : colors.textLight} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.guardTitle, guardEnabled && { color: colors.danger }]}>
                  {guardEnabled ? 'App Guard is active' : 'App Guard needs permission'}
                </Text>
                {!guardEnabled && <Text style={styles.guardSub}>Tap to open Accessibility Settings and enable Past.Self.</Text>}
              </View>
              {!guardEnabled && <Ionicons name="chevron-forward" size={16} color={colors.textLight} />}
            </TouchableOpacity>

            <Text style={styles.sublabel}>Select App</Text>
            <TouchableOpacity style={styles.appPickerBtn} onPress={() => setAppPickerVisible(true)} activeOpacity={0.85}>
              <Ionicons name="phone-portrait-outline" size={18} color={selectedApp ? colors.danger : colors.textLight} />
              <Text style={[styles.appPickerBtnText, selectedApp && { color: colors.text }]}>
                {selectedApp?.appName || 'Choose an app...'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>

            <View style={styles.playOnceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.playOnceTitle}>Play once</Text>
                {playOnce && <Text style={styles.playOnceHint}>Only plays the first time you open the app</Text>}
              </View>
              <Switch value={playOnce} onValueChange={setPlayOnce}
                trackColor={{ false: '#d1d5db', true: colors.accent }} thumbColor="#fff" />
            </View>
            {!playOnce && (
              <Text style={styles.alwaysHint}>{`Video will play every time you open ${selectedApp?.appName || 'this app'}`}</Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </View>

      <BrandAlert {...alertConfig} />

      <Modal visible={appPickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAppPickerVisible(false)}>
        <View style={[styles.pickerModal, { paddingTop: insets.top || spacing.lg }]}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choose an app</Text>
            <TouchableOpacity onPress={() => setAppPickerVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={colors.textLight} />
            <TextInput style={styles.searchInput} placeholder="Search apps..." placeholderTextColor={colors.textLight}
              value={appSearch} onChangeText={setAppSearch} autoFocus returnKeyType="search" />
          </View>
          {appsLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.danger} />
          ) : (
            <FlatList
              data={filteredApps}
              keyExtractor={item => item.packageName}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.appRow, selectedApp?.packageName === item.packageName && styles.appRowSelected]}
                  onPress={() => { setSelectedApp(item); setAppPickerVisible(false); setAppSearch(''); }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.appRowText, selectedApp?.packageName === item.packageName && styles.appRowTextSelected]}>
                    {item.appName}
                  </Text>
                  {selectedApp?.packageName === item.packageName && <Ionicons name="checkmark" size={18} color={colors.danger} />}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.appSeparator} />}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.card },
  header:             { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:            { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:        { flex: 1, fontFamily: fonts.montserratBold, fontSize: 18, color: colors.text },
  reRecordBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  reRecordText:       { fontFamily: fonts.montserratMedium, fontSize: 12, color: colors.danger },
  scroll:             { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  field:              { gap: spacing.xs },
  label:              { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  sublabel:           { fontFamily: fonts.montserratMedium, fontSize: 13, color: colors.text },
  input:              { backgroundColor: colors.background, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontFamily: fonts.inter, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border },
  textarea:           { height: 80, textAlignVertical: 'top' },
  triggerRow:         { flexDirection: 'row', gap: spacing.sm },
  triggerCard:        { flex: 1, backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.xs, borderWidth: 2, borderColor: colors.border },
  triggerCardActive:  { borderColor: colors.accent },
  triggerLabel:       { fontFamily: fonts.interMedium, fontSize: 13, color: colors.text },
  section:            { backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  dateDisplay:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  dateText:           { flex: 1, fontFamily: fonts.inter, fontSize: 14, color: colors.text },
  repeatGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:               { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  chipActive:         { backgroundColor: colors.danger, borderColor: colors.danger },
  chipText:           { fontFamily: fonts.inter, fontSize: 13, color: colors.text },
  chipTextActive:     { color: '#fff' },
  repeatInfo:         { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  repeatInfoText:     { fontFamily: fonts.montserratBold, fontSize: 12, color: colors.danger, flex: 1 },
  repeatNextText:     { fontFamily: fonts.inter, fontSize: 12, color: '#9898d6', flex: 1 },
  guardRow:           { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  guardRowOn:         { backgroundColor: '#fde5ea', borderColor: colors.danger },
  guardRowOff:        { backgroundColor: colors.card, borderColor: colors.border },
  guardTitle:         { fontFamily: fonts.montserratMedium, fontSize: 13, color: colors.text },
  guardSub:           { fontFamily: fonts.inter, fontSize: 11, color: colors.textLight, marginTop: 2 },
  appPickerBtn:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  appPickerBtnText:   { flex: 1, fontFamily: fonts.inter, fontSize: 14, color: colors.textLight },
  playOnceRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  playOnceTitle:      { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  playOnceHint:       { fontFamily: fonts.inter, fontSize: 11, color: colors.textLight, marginTop: 2 },
  alwaysHint:         { fontFamily: fonts.montserratBold, fontSize: 12, color: colors.danger },
  footer:             { padding: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.card },
  saveBtn:            { backgroundColor: colors.danger, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  saveBtnText:        { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
  pickerModal:        { flex: 1, backgroundColor: colors.card },
  pickerHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerTitle:        { fontFamily: fonts.montserratBold, fontSize: 18, color: colors.text },
  searchRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchInput:        { flex: 1, fontFamily: fonts.inter, fontSize: 14, color: colors.text },
  appRow:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  appRowSelected:     { backgroundColor: '#fde5ea' },
  appRowText:         { fontFamily: fonts.inter, fontSize: 15, color: colors.text },
  appRowTextSelected: { fontFamily: fonts.montserratMedium, color: colors.danger },
  appSeparator:       { height: 1, backgroundColor: colors.border, marginLeft: spacing.md },
});
