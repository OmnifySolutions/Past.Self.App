import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Switch, Platform, Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
// FIX: Removed SafeAreaView from react-native — caused pink status bar gap on iOS.
// Use useSafeAreaInsets hook instead (same pattern as ScheduleScreen).
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, PrefillData } from '../../App';
import { getVideos, updateVideo } from '../utils/storage';
import { ScheduledVideo, TriggerType, RepeatOption } from '../types/video';
import { colors, fonts, spacing, radius } from '../styles/theme';
import { BrandAlert, useBrandAlert } from '../components/BrandAlert';
import { getRepeatDescription, getNextOccurrence } from '../utils/repeatUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'Edit'>;

const POPULAR_APPS = ['Instagram','TikTok','Twitter/X','Facebook','Snapchat','LinkedIn','YouTube','Email','Notes'];
const REPEAT_OPTIONS: { label: string; value: RepeatOption }[] = [
  { label: 'Never', value: 'never' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export function EditScreen({ route, navigation }: Props) {
  const { videoId } = route.params;
  // FIX: useSafeAreaInsets instead of SafeAreaView wrapper
  const insets = useSafeAreaInsets();
  const [video, setVideo] = useState<ScheduledVideo | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('datetime');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [repeat, setRepeat] = useState<RepeatOption>('never'); // FIX: RepeatOption not string
  const [selectedApp, setSelectedApp] = useState('');
  const [playOnce, setPlayOnce] = useState(true);
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
          setSelectedApp(found.appTrigger.appName);
          setPlayOnce(found.appTrigger.playOnce);
        }
      }
    });
  }, [videoId]);

  const buildPrefill = (): PrefillData => ({
    id: videoId,
    title,
    message,
    triggerType,
    scheduledFor: date.toISOString(),
    repeat,
    appName: selectedApp,
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
          onPress: () => {
            hideAlert();
            navigation.navigate('Record', { prefill: buildPrefill() });
          },
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
      updates.repeat = repeat;
      updates.appTrigger = undefined;
    } else {
      updates.appTrigger = { appName: selectedApp, playOnce, hasPlayed: false };
      updates.scheduledFor = undefined;
      updates.repeat = undefined;
    }

    await updateVideo(videoId, updates);

    navigation.navigate('Confirmation', {
      videoId,
      thumbnail: video?.thumbnail || '',
      title: title.trim(),
      message: message.trim(),
      scheduledFor: triggerType === 'datetime' ? date.toISOString() : undefined,
      repeat: triggerType === 'datetime' ? repeat : undefined,
      appName: triggerType === 'app' ? selectedApp : undefined,
      playOnce: triggerType === 'app' ? playOnce : undefined,
    });
  };

  const repeatDesc = repeat !== 'never' ? getRepeatDescription(date, repeat) : null;
  const nextOccurrence = repeat !== 'never' ? getNextOccurrence(date.toISOString(), repeat) : null;

  if (!video) return <View style={{ flex: 1, backgroundColor: colors.card }} />;

  // FIX: Replaced <SafeAreaView> wrapper with <View> + paddingTop from insets
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
          <TextInput
            style={styles.input} value={title} onChangeText={setTitle}
            placeholderTextColor={colors.textLight}
            returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={message} onChangeText={setMessage}
            multiline numberOfLines={3}
            placeholderTextColor={colors.textLight}
            returnKeyType="done" blurOnSubmit={true}
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>When should this play?</Text>
          <View style={styles.triggerRow}>
            <TouchableOpacity
              style={[styles.triggerCard, triggerType === 'datetime' && styles.triggerCardActive]}
              onPress={() => setTriggerType('datetime')} activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={24} color={triggerType === 'datetime' ? colors.danger : colors.text} />
              <Text style={styles.triggerLabel}>Date & Time</Text>
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
            <TouchableOpacity style={styles.dateDisplay} onPress={() => setShowPicker(true)} activeOpacity={0.85}>
              <Ionicons name="calendar-outline" size={18} color={colors.danger} />
              <Text style={styles.dateText}>
                {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={date} mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_, s) => { setShowPicker(Platform.OS === 'ios'); if (s) setDate(s); }}
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
            {/* FIX: "Coming Soon" notice — app trigger is not yet functional */}
            <View style={styles.comingSoonBanner}>
              <Ionicons name="construct-outline" size={14} color={colors.accent} />
              <Text style={styles.comingSoonText}>App Guard is coming soon — video won't auto-trigger yet</Text>
            </View>
            <Text style={styles.sublabel}>Select App</Text>
            <View style={styles.repeatGrid}>
              {POPULAR_APPS.map(app => (
                <TouchableOpacity
                  key={app}
                  style={[styles.chip, selectedApp === app && styles.chipActive]}
                  onPress={() => setSelectedApp(app)} activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, selectedApp === app && styles.chipTextActive]}>{app}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.playOnceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.playOnceTitle}>Play once</Text>
                {playOnce && <Text style={styles.playOnceHint}>Only plays the first time you open the app</Text>}
              </View>
              <Switch value={playOnce} onValueChange={setPlayOnce}
                trackColor={{ false: '#d1d5db', true: colors.accent }} thumbColor="#fff" />
            </View>
            {!playOnce && (
              <Text style={styles.alwaysHint}>{`Video will play every time you open ${selectedApp || 'this app'}`}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: fonts.montserratBold, fontSize: 18, color: colors.text },
  reRecordBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
  },
  reRecordText: { fontFamily: fonts.montserratMedium, fontSize: 12, color: colors.danger },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  field: { gap: spacing.xs },
  label: { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  sublabel: { fontFamily: fonts.montserratMedium, fontSize: 13, color: colors.text },
  input: {
    backgroundColor: colors.background, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontFamily: fonts.inter, fontSize: 14, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  triggerRow: { flexDirection: 'row', gap: spacing.sm },
  triggerCard: {
    flex: 1, backgroundColor: colors.background, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', gap: spacing.xs,
    borderWidth: 2, borderColor: colors.border,
  },
  triggerCardActive: { borderColor: colors.accent },
  triggerLabel: { fontFamily: fonts.interMedium, fontSize: 13, color: colors.text },
  section: { backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  dateDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  dateText: { flex: 1, fontFamily: fonts.inter, fontSize: 14, color: colors.text },
  repeatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.card, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  chipText: { fontFamily: fonts.inter, fontSize: 13, color: colors.text },
  chipTextActive: { color: '#fff' },
  repeatInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  repeatInfoText: { fontFamily: fonts.montserratBold, fontSize: 12, color: colors.danger, flex: 1 },
  repeatNextText: { fontFamily: fonts.inter, fontSize: 12, color: '#9898d6', flex: 1 },
  comingSoonBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  comingSoonText: { fontFamily: fonts.inter, fontSize: 12, color: colors.accent, flex: 1 },
  playOnceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  playOnceTitle: { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  playOnceHint: { fontFamily: fonts.inter, fontSize: 11, color: colors.textLight, marginTop: 2 },
  alwaysHint: { fontFamily: fonts.montserratBold, fontSize: 12, color: colors.danger },
  footer: { padding: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.card },
  saveBtn: { backgroundColor: colors.danger, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  saveBtnText: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
});
