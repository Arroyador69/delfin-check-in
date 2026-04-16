import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type InstructionItem = {
  id: number;
  room_id: string | null;
  locale: string;
  title: string | null;
  body_html: string;
};

export default function CheckinInstructionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<InstructionItem | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [locale, setLocale] = useState<'es' | 'en'>('es');

  const { data, isLoading } = useQuery({
    queryKey: ['checkin-instructions'],
    queryFn: async () => {
      const res = await api.get('/api/settings/checkin-instructions');
      return res.data as { success?: boolean; items?: InstructionItem[] };
    },
  });

  const items = data?.items || [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/api/settings/checkin-instructions', {
        room_id: editor?.room_id ?? null,
        locale,
        title: title.trim() || null,
        body_html: body,
      });
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['checkin-instructions'] });
      Alert.alert(t('common.success'), t('settings.checkinInstructions.saved'));
      setEditor(null);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || t('settings.checkinInstructions.errorSaving');
      Alert.alert(t('common.error'), msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/settings/checkin-instructions?id=${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['checkin-instructions'] });
      setEditor(null);
    },
    onError: () => Alert.alert(t('common.error'), t('settings.checkinInstructions.errorSaving')),
  });

  function openEdit(item: InstructionItem) {
    setEditor(item);
    setTitle(item.title || '');
    setBody(item.body_html || '');
    setLocale(item.locale === 'en' ? 'en' : 'es');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.checkinInstructions.title')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.hubCheckinSubtitle')}</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        refreshing={isLoading}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['checkin-instructions'] })}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListEmptyComponent={
          isLoading ? null : <Text style={styles.muted}>{t('settings.checkinInstructions.noTemplates')}</Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openEdit(item)}>
            <Text style={styles.cardTitle}>
              {item.room_id
                ? t('settings.checkinInstructions.roomLabel', { id: item.room_id })
                : t('settings.checkinInstructions.default')}{' '}
              · {item.locale.toUpperCase()}
            </Text>
            {item.title ? <Text style={styles.cardSub}>{item.title}</Text> : null}
            <Text numberOfLines={2} style={styles.cardPreview}>
              {item.body_html.replace(/<[^>]+>/g, ' ')}
            </Text>
          </Pressable>
        )}
      />

      <Modal visible={editor != null} animationType="slide" transparent onRequestClose={() => setEditor(null)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
              style={{ width: '100%' }}
            >
              <View style={styles.modalBox}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={styles.modalTitle}>{t('settings.checkinInstructions.titleLabel')}</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t('settings.checkinInstructions.titleLabel')} />
            <Text style={styles.label}>{t('settings.general.language')}</Text>
            <View style={styles.localeRow}>
              <Pressable style={[styles.chip, locale === 'es' && styles.chipOn]} onPress={() => setLocale('es')}>
                <Text style={locale === 'es' ? styles.chipOnText : styles.chipText}>ES</Text>
              </Pressable>
              <Pressable style={[styles.chip, locale === 'en' && styles.chipOn]} onPress={() => setLocale('en')}>
                <Text style={locale === 'en' ? styles.chipOnText : styles.chipText}>EN</Text>
              </Pressable>
            </View>
            <Text style={styles.label}>{t('settings.checkinInstructions.contentLabel')}</Text>
            <Text style={styles.hintSmall}>{t('mobile.settings.checkinBodyHint')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              textAlignVertical="top"
              value={body}
              onChangeText={setBody}
              placeholder={t('settings.checkinInstructions.contentPlaceholder')}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.btnGhost} onPress={() => setEditor(null)}>
                <Text style={styles.btnGhostText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={styles.btnDanger}
                onPress={() => {
                  if (!editor) return;
                  Alert.alert(t('settings.checkinInstructions.deleteStep1Title'), t('settings.checkinInstructions.deleteStep1Body', {
                    label: editor.room_id ? t('settings.checkinInstructions.roomLabel', { id: editor.room_id }) : t('settings.checkinInstructions.default'),
                  }), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('common.delete'),
                      style: 'destructive',
                      onPress: () => deleteMutation.mutate(editor.id),
                    },
                  ]);
                }}
              >
                <Text style={styles.btnDangerText}>{t('mobile.settings.checkinDelete')}</Text>
              </Pressable>
              <Pressable
                style={[styles.btnPrimary, saveMutation.isPending && styles.disabled]}
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <Text style={styles.btnPrimaryText}>{t('settings.checkinInstructions.save')}</Text>
              </Pressable>
            </View>
            </ScrollView>
          </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 0 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 22, fontWeight: '900', color: '#111827', marginTop: -2 },
  title: { fontSize: 18, fontWeight: '900', color: '#111827' },
  subtitle: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  cardSub: { fontSize: 13, color: '#374151', marginTop: 4 },
  cardPreview: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  muted: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '92%',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  hintSmall: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f9fafb',
  },
  textArea: { minHeight: 160, marginTop: 4 },
  localeRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontWeight: '700', color: '#374151' },
  chipOnText: { fontWeight: '800', color: 'white' },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  btnGhost: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  btnGhostText: { fontWeight: '700' },
  btnPrimary: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#2563eb' },
  btnPrimaryText: { color: 'white', fontWeight: '800' },
  btnDanger: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fef2f2' },
  btnDangerText: { color: '#b91c1c', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
