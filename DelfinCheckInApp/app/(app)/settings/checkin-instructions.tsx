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
  const [titleEs, setTitleEs] = useState('');
  const [bodyEs, setBodyEs] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [bodyEn, setBodyEn] = useState('');

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
      const roomId = editor?.room_id ?? null;
      const requests: Promise<any>[] = [];
      if (bodyEs.trim()) {
        requests.push(
          api.put('/api/settings/checkin-instructions', {
            room_id: roomId,
            locale: 'es',
            title: titleEs.trim() || null,
            body_html: bodyEs,
          })
        );
      }
      if (bodyEn.trim()) {
        requests.push(
          api.put('/api/settings/checkin-instructions', {
            room_id: roomId,
            locale: 'en',
            title: titleEn.trim() || null,
            body_html: bodyEn,
          })
        );
      }
      if (requests.length === 0) {
        throw new Error(t('settings.checkinInstructions.contentPlaceholder'));
      }
      await Promise.all(requests);
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
    const siblings = items.filter((it) => (it.room_id || '') === (item.room_id || ''));
    const es = siblings.find((it) => it.locale === 'es');
    const en = siblings.find((it) => it.locale === 'en');
    setEditor(item);
    setTitleEs(es?.title || '');
    setBodyEs(es?.body_html || '');
    setTitleEn(en?.title || '');
    setBodyEn(en?.body_html || '');
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
                <ScrollView
                  style={{ flexGrow: 0 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                  contentContainerStyle={{ paddingBottom: 8 }}
                >
            <Text style={styles.modalTitle}>{t('settings.checkinInstructions.title')}</Text>
            <Text style={styles.hintSmall}>{t('mobile.settings.checkinBodyHint')}</Text>

            <View style={styles.localeSection}>
              <Text style={styles.localeHeader}>ES</Text>
              <TextInput style={styles.input} value={titleEs} onChangeText={setTitleEs} placeholder={t('settings.checkinInstructions.titleLabel')} />
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
                value={bodyEs}
                onChangeText={setBodyEs}
                placeholder={t('settings.checkinInstructions.contentPlaceholder')}
              />
            </View>

            <View style={styles.localeSection}>
              <Text style={styles.localeHeader}>EN</Text>
              <TextInput style={styles.input} value={titleEn} onChangeText={setTitleEn} placeholder={t('settings.checkinInstructions.titleLabel')} />
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
                value={bodyEn}
                onChangeText={setBodyEn}
                placeholder={t('settings.checkinInstructions.contentPlaceholder')}
              />
            </View>

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
  localeSection: {
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  localeHeader: { fontSize: 13, fontWeight: '800', color: '#111827', marginBottom: 8 },
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
  textArea: { minHeight: 180, marginTop: 4 },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  btnGhost: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  btnGhostText: { fontWeight: '700' },
  btnPrimary: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#2563eb' },
  btnPrimaryText: { color: 'white', fontWeight: '800' },
  btnDanger: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fef2f2' },
  btnDangerText: { color: '#b91c1c', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
