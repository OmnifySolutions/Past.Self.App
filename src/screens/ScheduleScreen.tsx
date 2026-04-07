import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Switch, Platform, Keyboard, FlatList, Modal, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import { RootStackParamList, PrefillData } from '../../App';
import { saveVideo, scheduleVideoNotification, cancelVideoNotification, getVideos } from '../utils/storage';
import { ScheduledVideo, TriggerType, RepeatOption } from '../types/video';
import { colors, fonts, spacing, radius } from '../styles/theme';
import { BrandAlert, useBrandAlert } from '../components/BrandAlert';
import { getRepeatDescription, getNextOccurrence } from '../utils/repeatUtils';
import AppGuard, { InstalledApp } from '../../modules/app-guard/index';

type Props = NativeStackScreenProps<RootStackParamList, 'Schedule'>;

const REPEAT_OPTIONS: { label: string; value: RepeatOption }[] = [
  { label: 'Never',    value: 'never'    },
  { label: 'Daily',    value: 'daily'    },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Weekly',   value: 'weekly'   },
  { label: 'Monthly',  value: 'monthly'  },
];

export function ScheduleScreen({ route, navigation }: Props) {
  const { videoUri, duration, thumbnail, prefill } = route.params;
  const insets = useSafeAreaInsets();

  const [title, setTitle]             = useState(prefill?.title || '');
  const [message, setMessage]         = useState(prefill?.message || '');
  const [triggerType, setTriggerType] = useState<TriggerType>(prefill?.triggerType || 'datetime');
  const [date, setDate]               = useState(prefill?.scheduledFor ? new Date(prefill.scheduledFor) : new Date(Date.now() + 3600000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeat, setRepeat]           = useState<RepeatOption>(prefill?.repeat || 'never');
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(
    prefill?.appName ? { appName: prefill.appName, packageName: prefill.packageName || '' } : null
  );
  const [playOnce, setPlayOnce]       = useState(prefill?.playOnce ?? true);
  const [isSaving, setIsSaving]       = useState(false);

  const [guardEnabled, setGuardEnabled]         = useState(false);
  const [installedApps, setInstalledApps]       = useState<InstalledApp[]>([]);
  const [appsLoading, setAppsLoading]           = useState(false);
  const [appPickerVisible, setAppPickerVisible] = useState(false);
  const [appSearch, setAppSearch]               = useState('');

  const { alertConfig, showAlert, hideAlert } = useBrandAlert();

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

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const buildPrefill = (): PrefillData => ({
    id: prefill?.id,
    title,
    message,
    triggerType,
    scheduledFor: date.toISOString(),
    repeat,
    appName:     selectedApp?.appName,
    packageName: selectedApp?.packageName,
    playOnce,
    createdAt: prefill?.createdAt,
  });

  const handleReRecord = () => {
    navigation.replace('Record', { prefill: buildPrefill() });
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

    setIsSaving(true);
    try {
      const videoId      = prefill?.id || Crypto.randomUUID();
      const permanentDir = FileSystem.documentDirectory + 'videos/';
      const thumbnailDir = FileSystem.documentDirectory + 'thumbnails/';

      await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
      await FileSystem.makeDirectoryAsync(thumbnailDir, { intermediates: true });

      const permanentUri = permanentDir + videoId + '.mp4';
      const existingInfo = await FileSystem.getInfoAsync(permanentUri);
      if (existingInfo.exists) await FileSystem.deleteAsync(permanentUri, { idempotent: true });
      await FileSystem.copyAsync({ from: videoUri, to: permanentUri });

      let permanentThumbnail: string | undefined;
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(permanentUri, { time: 500, quality: 0.7 });
        const permanentThumbPath = thumbnailDir + videoId + '.jpg';
        await FileSystem.copyAsync({ from: thumbUri, to: permanentThumbPath });
        permanentThumbnail = permanentThumbPath;
      } catch {
        permanentThumbnail = undefined;
      }

      if (prefill?.id) {
        const allVideos = await getVideos();
        const old = allVideos.find(v => v.id === prefill.id);
        if (old?.notificationId) await cancelVideoNotification(old.notificationId);
      }

      const video: ScheduledVideo = {
        id: videoId,
        videoUri: permanentUri,
        thumbnail: permanentThumbnail,
        title: title.trim(),
        message: message.trim(),
        createdAt: prefill?.createdAt || new Date().toISOString(),
        duration,
        isActive: true,
        ...(triggerType === 'datetime'
          ? { scheduledFor: date.toISOString(), repeat }
          : { appTrigger: {
              appName:     selectedApp!.appName,
              packageName: selectedApp!.packageName,
              playOnce,
              hasPlayed: false,
            }}
        ),
      };

      if (triggerType === 'datetime') {
        const notificationId = await scheduleVideoNotification(video);
        if (notificationId) video.notificationId = notificationId;
      }

      await saveVideo(video);

      navigation.navigate('Confirmation', {
        videoId: video.id,
        thumbnail: permanentThumbnail || thumbnail,
        title: video.title,
        message: video.message,
        scheduledFor: video.scheduledFor,
        repeat: video.repeat,
        appName: video.appTrigger?.appName,
        playOnce: video.appTrigger?.playOnce,
      });
    } catch (e: any) {
      showAlert('Save failed', e?.message || 'Could not save your video. Please try again.', [
        { label: 'OK', onPress: hideAlert, style: 'default' },
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const repeatDesc     = repeat !== 'never' ? getRepeatDescription(date, repeat) : null;
  const nextOccurrence = repeat !== 'never' ? getNextOccurrence(date.toISOString(), repeat) : null;
  const filteredApps   = installedApps.filter(a =>
    a.appName.toLowerCase().includes(appSearch.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Your Video</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.durationRow} onPress={handleReRecord} activeOpacity={0.85}>
          <Ionicons name="videocam-outline" size={16} color={colors.accent} />
          <Text style={styles.durationText}>Video recorded · {formatDuration(duration)}</Text>
          <View style={styles.reRecordChip}>
            <Ionicons name="camera-outline" size={13} color="#fff" />
            <Text style={styles.reRecordChipText}>Re-record</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Give your message a name..."
            placeholderTextColor={colors.textLight}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Add a note to your future self..."
            placeholderTextColor={colors.textLight}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Trigger</Text>
          <View style={styles.triggerRow}>
            <TouchableOpacity
              style={[styles.triggerCard, triggerType === 'datetime' && styles.triggerCardActive]}
              onPress={() => setTriggerType('datetime')} activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={24} color={triggerType === 'datetime' ? colors.danger : colors.text} />
              <Text style={styles.triggerLabel}>Date &amp; Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.triggerCard, triggerType === 'app' && styles.triggerCardActive]}
              onPress={() => setTriggerType('app')} activeOpacity={0.85}
            >
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
              <DateTimePicker
                value={date} mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selected) {
                    const next = new Date(selected);
                    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                    setDate(next);
                  }
                }}
              />
            )}
            <TouchableOpacity style={styles.dateDisplay} onPress={() => setShowTimePicker(true)} activeOpacity={0.85}>
              <Ionicons name="time-outline" size={18} color={colors.danger} />
              <Text style={styles.dateText}>
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={date} mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (selected) {
                    const next = new Date(date);
                    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                    setDate(next);
                  }
                }}
              />
            )}
            <Text style={styles.sublabel}>Repeat</Text>
            <View style={styles.repeatGrid}>
              {REPEAT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, repeat === opt.value && styles.chipActive]}
                  onPress={() => setRepeat(opt.value)} activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, repeat === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {repeatDesc && (
              <View style={styles.repeatInfo}>
                <Ionicons name="repeat-outline" size={14} color={colors.danger} />
                <Text style={styles.repeatInfoText}>{repeatDesc}</Text>
              </View>
            )}
            {nextOccurrence && (
              <View style={styles.repeatInfo}>
                <Ionicons name="time-outline" size={14} color={colors.accent} />
                <Text style={styles.repeatNextText}>
                  Next: {nextOccurrence.toLocaleDateString()} at{' '}
                  {nextOccurrence.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            {!repeatDesc && (
              <Text style={styles.hint}>Your video will play like an alarm at this time</Text>
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
              <Ionicons
                name={guardEnabled ? 'shield-checkmark-outline' : 'shield-outline'}
                size={18}
                color={guardEnabled ? colors.danger : colors.textLight}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.guardTitle, guardEnabled && { color: colors.danger }]}>
                  {guardEnabled ? 'App Guard is active' : 'App Guard needs permission'}
                </Text>
                {!guardEnabled && (
                  <Text style={styles.guardSub}>Tap to open Accessibility Settings and enable Past.Self.</Text>
                )}
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
              <Text style={styles.alwaysHint}>
                {`Video will play every time you open ${selectedApp?.appName || 'this app'}`}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={isSaving}>
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Video'}</Text>
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
            <TextInput
              style={styles.searchInput}
              placeholder="Search apps..."
              placeholderTextColor={colors.textLight}
              value={appSearch}
              onChangeText={setAppSearch}
              autoFocus
              returnKeyType="search"
            />
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
                  {selectedApp?.packageName === item.packageName && (
                    <Ionicons name="checkmark" size={18} color={colors.danger} />
                  )}
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
  container:        { flex: 1, backgroundColor: colors.card },
  header:           { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:          { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:      { fontFamily: fonts.montserratBold, fontSize: 18, color: colors.text },
  scroll:           { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  durationRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md },
  durationText:     { flex: 1, fontFamily: fonts.inter, fontSize: 13, color: colors.textLight },
  reRecordChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  reRecordChipText: { fontFamily: fonts.inter, fontSize: 11, color: '#fff' },
  field:            { gap: spacing.xs },
  label:            { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  sublabel:         { fontFamily: fonts.montserratMedium, fontSize: 13, color: colors.text },
  input:            { backgroundColor: colors.background, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontFamily: fonts.inter, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border },
  textarea:         { height: 80, textAlignVertical: 'top' },
  triggerRow:       { flexDirection: 'row', gap: spacing.sm },
  triggerCard:      { flex: 1, backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.xs, borderWidth: 2, borderColor: colors.border },
  triggerCardActive:{ borderColor: colors.accent },
  triggerLabel:     { fontFamily: fonts.interMedium, fontSize: 13, color: colors.text },
  section:          { backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  dateDisplay:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  dateText:         { flex: 1, fontFamily: fonts.inter, fontSize: 14, color: colors.text },
  repeatGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:             { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  chipActive:       { backgroundColor: colors.danger, borderColor: colors.danger },
  chipText:         { fontFamily: fonts.inter, fontSize: 13, color: colors.text },
  chipTextActive:   { color: '#fff' },
  repeatInfo:       { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  repeatInfoText:   { fontFamily: fonts.montserratBold, fontSize: 12, color: colors.danger, flex: 1 },
  repeatNextText:   { fontFamily: fonts.inter, fontSize: 12, color: colors.accent, flex: 1 },
  hint:             { fontFamily: fonts.inter, fontSize: 12, color: colors.textLight },
  guardRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  guardRowOn:       { backgroundColor: '#fde5ea', borderColor: colors.danger },
  guardRowOff:      { backgroundColor: colors.card, borderColor: colors.border },
  guardTitle:       { fontFamily: fonts.montserratMedium, fontSize: 13, color: colors.text },
  guardSub:         { fontFamily: fonts.inter, fontSize: 11, color: colors.textLight, marginTop: 2 },
  appPickerBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  appPickerBtnText: { flex: 1, fontFamily: fonts.inter, fontSize: 14, color: colors.textLight },
  playOnceRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  playOnceTitle:    { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  playOnceHint:     { fontFamily: fonts.inter, fontSize: 11, color: colors.textLight, marginTop: 2 },
  alwaysHint:       { fontFamily: fonts.montserratBold, fontSize: 12, color: colors.danger },
  footer:           { padding: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.card },
  saveBtn:          { backgroundColor: colors.danger, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  saveBtnText:      { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
  pickerModal:      { flex: 1, backgroundColor: colors.card },
  pickerHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerTitle:      { fontFamily: fonts.montserratBold, fontSize: 18, color: colors.text },
  searchRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchInput:      { flex: 1, fontFamily: fonts.inter, fontSize: 14, color: colors.text },
  appRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  appRowSelected:       { backgroundColor: '#fde5ea' },
  appRowText:           { fontFamily: fonts.inter, fontSize: 15, color: colors.text },
  appRowTextSelected:   { fontFamily: fonts.montserratMedium, color: colors.danger },
  appSeparator:         { height: 1, backgroundColor: colors.border, marginLeft: spacing.md },
});
