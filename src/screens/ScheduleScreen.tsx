import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Switch, Platform, Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { RootStackParamList, PrefillData } from '../../App';
import { saveVideo } from '../utils/storage';
import { ScheduledVideo, TriggerType, RepeatOption } from '../types/video';
import { colors, fonts, spacing, radius } from '../styles/theme';
import { BrandAlert, useBrandAlert } from '../components/BrandAlert';
import { getRepeatDescription, getNextOccurrence } from '../utils/repeatUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'Schedule'>;

const POPULAR_APPS = ['Instagram','TikTok','Twitter/X','Facebook','Snapchat','LinkedIn','YouTube','Email','Notes'];
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

  const [title, setTitle]           = useState(prefill?.title || '');
  const [message, setMessage]       = useState(prefill?.message || '');
  const [triggerType, setTriggerType] = useState<TriggerType>(prefill?.triggerType || 'datetime');
  const [date, setDate]             = useState(prefill?.scheduledFor ? new Date(prefill.scheduledFor) : new Date(Date.now() + 3600000));
  const [showPicker, setShowPicker] = useState(false);
  const [repeat, setRepeat]         = useState<RepeatOption>(prefill?.repeat || 'never'); // FIX: RepeatOption
  const [selectedApp, setSelectedApp] = useState(prefill?.appName || '');
  const [playOnce, setPlayOnce]     = useState(prefill?.playOnce ?? true);
  const [isSaving, setIsSaving]     = useState(false);
  const { alertConfig, showAlert, hideAlert } = useBrandAlert();

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const buildPrefill = (): PrefillData => ({
    id: prefill?.id,
    title,
    message,
    triggerType,
    scheduledFor: date.toISOString(),
    repeat,
    appName: selectedApp,
    playOnce,
    createdAt: prefill?.createdAt,
  });

  // FIX: use navigation.replace instead of navigate — removes this Schedule
  // from the stack so back-press doesn't return here after re-recording.
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
      // FIX: Use randomUUID() instead of Date.now() — eliminates millisecond collision risk
      const videoId = prefill?.id || Crypto.randomUUID();
      const permanentDir = FileSystem.documentDirectory + 'videos/';
      const thumbnailDir = FileSystem.documentDirectory + 'thumbnails/';

      await FileSystem.makeDirectoryAsync(permanentDir,   { intermediates: true });
      await FileSystem.makeDirectoryAsync(thumbnailDir, { intermediates: true });

      // FIX: Always copy the video when re-recording — delete old file first if
      // a previous version exists at the same path, to prevent stale file retention.
      const permanentUri = permanentDir + videoId + '.mp4';
      const existingInfo = await FileSystem.getInfoAsync(permanentUri);
      if (existingInfo.exists) {
        await FileSystem.deleteAsync(permanentUri, { idempotent: true });
      }
      await FileSystem.copyAsync({ from: videoUri, to: permanentUri });

      let permanentThumbnail: string | undefined;
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(permanentUri, {
          time: 500,
          quality: 0.7,
        });
        const permanentThumbPath = thumbnailDir + videoId + '.jpg';
        await FileSystem.copyAsync({ from: thumbUri, to: permanentThumbPath });
        permanentThumbnail = permanentThumbPath;
      } catch (thumbErr) {
        console.warn('Thumbnail generation failed:', thumbErr);
        permanentThumbnail = undefined;
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
          : { appTrigger: { appName: selectedApp, playOnce, hasPlayed: false } }
        ),
      };

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
      console.error('SAVE ERROR:', e?.message || e);
      showAlert('Save failed', e?.message || 'Could not save your video. Please try again.', [
        { label: 'OK', onPress: hideAlert, style: 'default' },
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const repeatDesc     = repeat !== 'never' ? getRepeatDescription(date, repeat) : null;
  const nextOccurrence = repeat !== 'never' ? getNextOccurrence(date.toISOString(), repeat) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Your Video</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
              onPress={() => setTriggerType('datetime')}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={24} color={triggerType === 'datetime' ? colors.danger : colors.text} />
              <Text style={styles.triggerLabel}>Date &amp; Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.triggerCard, triggerType === 'app' && styles.triggerCardActive]}
              onPress={() => setTriggerType('app')}
              activeOpacity={0.85}
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
                value={date}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_, s) => {
                  setShowPicker(Platform.OS === 'ios');
                  if (s) setDate(s);
                }}
              />
            )}
            <Text style={styles.sublabel}>Repeat</Text>
            <View style={styles.repeatGrid}>
              {REPEAT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, repeat === opt.value && styles.chipActive]}
                  onPress={() => setRepeat(opt.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, repeat === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
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
            {/* FIX: "Coming Soon" banner — App Guard not yet functional */}
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
                  onPress={() => setSelectedApp(app)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, selectedApp === app && styles.chipTextActive]}>
                    {app}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.playOnceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.playOnceTitle}>Play once</Text>
                {playOnce && (
                  <Text style={styles.playOnceHint}>Only plays the first time you open the app</Text>
                )}
              </View>
              <Switch
                value={playOnce}
                onValueChange={setPlayOnce}
                trackColor={{ false: '#d1d5db', true: colors.accent }}
                thumbColor="#fff"
              />
            </View>
            {!playOnce && (
              <Text style={styles.alwaysHint}>
                {`Video will play every time you open ${selectedApp || 'this app'}`}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={isSaving}
        >
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Video'}</Text>
        </TouchableOpacity>
      </View>

      <BrandAlert {...alertConfig} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.card },
  header:           {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn:          { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:      { fontFamily: fonts.montserratBold, fontSize: 18, color: colors.text },
  scroll:           { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  durationRow:      {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md,
  },
  durationText:     { flex: 1, fontFamily: fonts.inter, fontSize: 13, color: colors.textLight },
  reRecordChip:     {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  reRecordChipText: { fontFamily: fonts.inter, fontSize: 11, color: '#fff' },
  field:            { gap: spacing.xs },
  label:            { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  sublabel:         { fontFamily: fonts.montserratMedium, fontSize: 13, color: colors.text },
  input:            {
    backgroundColor: colors.background, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontFamily: fonts.inter, fontSize: 14, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  textarea:         { height: 80, textAlignVertical: 'top' },
  triggerRow:       { flexDirection: 'row', gap: spacing.sm },
  triggerCard:      {
    flex: 1, backgroundColor: colors.background, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', gap: spacing.xs,
    borderWidth: 2, borderColor: colors.border,
  },
  triggerCardActive: { borderColor: colors.accent },
  triggerLabel:     { fontFamily: fonts.interMedium, fontSize: 13, color: colors.text },
  section:          {
    backgroundColor: colors.background, borderRadius: radius.lg,
    padding: spacing.md, gap: spacing.md,
  },
  dateDisplay:      {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  dateText:         { flex: 1, fontFamily: fonts.inter, fontSize: 14, color: colors.text },
  repeatGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:             {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.card, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive:       { backgroundColor: colors.danger, borderColor: colors.danger },
  chipText:         { fontFamily: fonts.inter, fontSize: 13, color: colors.text },
  chipTextActive:   { color: '#fff' },
  repeatInfo:       { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  repeatInfoText:   { fontFamily: fonts.montserratBold, fontSize: 12, color: colors.danger, flex: 1 },
  repeatNextText:   { fontFamily: fonts.inter, fontSize: 12, color: colors.accent, flex: 1 },
  hint:             { fontFamily: fonts.inter, fontSize: 12, color: colors.textLight },
  comingSoonBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  comingSoonText:   { fontFamily: fonts.inter, fontSize: 12, color: colors.accent, flex: 1 },
  playOnceRow:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  playOnceTitle:    { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  playOnceHint:     { fontFamily: fonts.inter, fontSize: 11, color: colors.textLight, marginTop: 2 },
  alwaysHint:       { fontFamily: fonts.montserratBold, fontSize: 12, color: colors.danger },
  footer:           { padding: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.card },
  saveBtn:          {
    backgroundColor: colors.danger, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center',
  },
  saveBtnText:      { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
});
