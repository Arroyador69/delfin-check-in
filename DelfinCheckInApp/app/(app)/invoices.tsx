// =====================================================
// FACTURAS / RECIBOS - Crear, listar, PDF y compartir
// =====================================================

import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Download, Plus, Share2 } from 'lucide-react-native';

import { api, getAuthorizedDownloadHeaders } from '@/lib/api';
import { downloadToCache, shareFile } from '@/lib/files';
import { getLocaleTag, t } from '@/lib/i18n';
import { useMajorActionAd } from '@/lib/use-major-action-ad';

type Tab = 'facturas' | 'recibos';

interface Factura {
  id: number;
  numero_factura: string;
  fecha_emision: string;
  cliente_nombre: string;
  cliente_tipo_documento?: string;
  cliente_nif?: string;
  concepto: string;
  precio_base: number;
  iva_importe: number;
  total: number;
  forma_pago?: string;
}

interface Recibo {
  id: number;
  numero_recibo: string;
  fecha_emision: string;
  cliente_nombre: string;
  cliente_tipo_documento?: string;
  cliente_nif?: string;
  concepto: string;
  descripcion?: string | null;
  fecha_pago?: string | null;
  fecha_estancia_desde?: string | null;
  fecha_estancia_hasta?: string | null;
  importe_total: number;
  incluir_iva: boolean;
  iva_porcentaje?: number;
  forma_pago?: string;
}

function formatMoney(value: number) {
  const n = Number(value || 0);
  return `${n.toFixed(2)} €`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(getLocaleTag());
  } catch {
    return value;
  }
}

function parseYmd(value: string): Date {
  if (!value?.trim()) return new Date();
  const [y, m, d] = value.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

type ReciboDateField = 'fecha_pago' | 'fecha_estancia_desde' | 'fecha_estancia_hasta';

export default function InvoicesScreen() {
  const notifyMajorAd = useMajorActionAd();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('facturas');
  const [refreshing, setRefreshing] = useState(false);
  const [iosDateModal, setIosDateModal] = useState<{ field: ReciboDateField; date: Date } | null>(null);

  // Facturas form
  const [facturaForm, setFacturaForm] = useState({
    cliente_nombre: '',
    cliente_tipo_documento: 'dni',
    cliente_nif: '',
    cliente_direccion: '',
    cliente_codigo_postal: '',
    cliente_ciudad: '',
    cliente_provincia: '',
    cliente_pais: 'España',
    concepto: 'Alojamiento',
    descripcion: '',
    total_pagado: '',
    iva_porcentaje: '21',
    forma_pago: '',
  });

  // Recibos form
  const [reciboForm, setReciboForm] = useState({
    cliente_nombre: '',
    cliente_tipo_documento: 'dni',
    cliente_nif: '',
    cliente_direccion: '',
    cliente_codigo_postal: '',
    cliente_ciudad: '',
    cliente_provincia: '',
    cliente_pais: 'España',
    concepto: 'Alojamiento',
    descripcion: '',
    fecha_pago: '',
    fecha_estancia_desde: '',
    fecha_estancia_hasta: '',
    importe_total: '',
    incluir_iva: false,
    iva_porcentaje: '21',
    forma_pago: '',
  });

  const { data: facturasData } = useQuery({
    queryKey: ['facturas'],
    queryFn: async () => {
      const response = await api.get('/api/facturas');
      return response.data as { facturas?: Factura[] };
    },
  });

  const facturas = useMemo(() => (facturasData?.facturas || []) as Factura[], [facturasData]);

  const { data: recibosData } = useQuery({
    queryKey: ['recibos'],
    queryFn: async () => {
      const response = await api.get('/api/recibos');
      return response.data as { recibos?: Recibo[] };
    },
  });

  const recibos = useMemo(() => (recibosData?.recibos || []) as Recibo[], [recibosData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['facturas'] }),
      queryClient.refetchQueries({ queryKey: ['recibos'] }),
    ]);
    setRefreshing(false);
  };

  function setReciboDateField(field: ReciboDateField, ymd: string) {
    setReciboForm((p) => ({ ...p, [field]: ymd }));
  }

  function openReciboDatePicker(field: ReciboDateField) {
    const current = reciboForm[field];
    const value = parseYmd(current);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            setReciboDateField(field, toYmd(date));
          }
        },
      });
    } else {
      setIosDateModal({ field, date: value });
    }
  }

  function confirmIosReciboDate() {
    if (!iosDateModal) return;
    setReciboDateField(iosDateModal.field, toYmd(iosDateModal.date));
    setIosDateModal(null);
  }

  const crearFactura = useMutation({
    mutationFn: async () => {
      const total = parseFloat(facturaForm.total_pagado || '0');
      const ivaPct = parseFloat(facturaForm.iva_porcentaje || '21');
      if (!facturaForm.cliente_nombre || !facturaForm.concepto || !(total > 0)) {
        throw new Error(t('facturas.errorRequired'));
      }
      // mismo cálculo que web: base = total / (1 + iva/100)
      const precio_base = total / (1 + ivaPct / 100);
      const iva_importe = total - precio_base;

      const response = await api.post('/api/facturas', {
        cliente_nombre: facturaForm.cliente_nombre,
        cliente_tipo_documento: facturaForm.cliente_tipo_documento,
        cliente_nif: facturaForm.cliente_nif,
        cliente_direccion: facturaForm.cliente_direccion,
        cliente_codigo_postal: facturaForm.cliente_codigo_postal,
        cliente_ciudad: facturaForm.cliente_ciudad,
        cliente_provincia: facturaForm.cliente_provincia,
        cliente_pais: facturaForm.cliente_pais,
        concepto: facturaForm.concepto,
        descripcion: facturaForm.descripcion,
        precio_base,
        iva_porcentaje: ivaPct,
        iva_importe,
        total,
        forma_pago: facturaForm.forma_pago,
      });
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['facturas'] });
      Alert.alert(t('common.success'), t('facturas.successCreate'));
      notifyMajorAd();
      setFacturaForm((p) => ({
        ...p,
        cliente_nombre: '',
        cliente_nif: '',
        cliente_direccion: '',
        cliente_codigo_postal: '',
        cliente_ciudad: '',
        cliente_provincia: '',
        concepto: 'Alojamiento',
        descripcion: '',
        total_pagado: '',
        forma_pago: '',
      }));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.message || e?.response?.data?.error || t('facturas.errorCreate'));
    },
  });

  const crearRecibo = useMutation({
    mutationFn: async () => {
      const importe = parseFloat(reciboForm.importe_total || '0');
      const ivaPct = parseFloat(reciboForm.iva_porcentaje || '21');
      if (!reciboForm.cliente_nombre || !reciboForm.concepto || !(importe > 0)) {
        throw new Error(t('facturas.errorRequired'));
      }
      const response = await api.post('/api/recibos', {
        cliente_nombre: reciboForm.cliente_nombre,
        cliente_tipo_documento: reciboForm.cliente_tipo_documento,
        cliente_nif: reciboForm.cliente_nif,
        cliente_direccion: reciboForm.cliente_direccion,
        cliente_codigo_postal: reciboForm.cliente_codigo_postal,
        cliente_ciudad: reciboForm.cliente_ciudad,
        cliente_provincia: reciboForm.cliente_provincia,
        cliente_pais: reciboForm.cliente_pais,
        concepto: reciboForm.concepto,
        descripcion: reciboForm.descripcion,
        fecha_pago: reciboForm.fecha_pago || undefined,
        fecha_estancia_desde: reciboForm.fecha_estancia_desde || undefined,
        fecha_estancia_hasta: reciboForm.fecha_estancia_hasta || undefined,
        importe_total: importe,
        incluir_iva: Boolean(reciboForm.incluir_iva),
        iva_porcentaje: reciboForm.incluir_iva ? ivaPct : 0,
        forma_pago: reciboForm.forma_pago,
      });
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recibos'] });
      Alert.alert(t('common.success'), t('facturas.successCreateReceipt'));
      notifyMajorAd();
      setReciboForm((p) => ({
        ...p,
        cliente_nombre: '',
        cliente_nif: '',
        cliente_direccion: '',
        cliente_codigo_postal: '',
        cliente_ciudad: '',
        cliente_provincia: '',
        concepto: 'Alojamiento',
        descripcion: '',
        fecha_pago: '',
        fecha_estancia_desde: '',
        fecha_estancia_hasta: '',
        importe_total: '',
        incluir_iva: false,
        forma_pago: '',
      }));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.message || e?.response?.data?.error || t('facturas.errorCreateReceipt'));
    },
  });

  const descargarYCompartirFactura = async (factura: Factura, share: boolean) => {
    try {
      const url = `${api.defaults.baseURL}/api/facturas/${factura.id}/pdf`;
      const headers = await getAuthorizedDownloadHeaders();
      const uri = await downloadToCache({
        url,
        filename: `factura_${factura.numero_factura}.pdf`,
        headers,
      });
      if (share) {
        await shareFile(uri, 'application/pdf');
      } else {
        Alert.alert(t('common.success'), t('mobile.facturas.pdfDownloadedHint'));
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('facturas.errorDownloadPdf'));
    }
  };

  const descargarYCompartirRecibo = async (recibo: Recibo, share: boolean) => {
    try {
      const url = `${api.defaults.baseURL}/api/recibos/${recibo.id}/pdf`;
      const headers = await getAuthorizedDownloadHeaders();
      const uri = await downloadToCache({
        url,
        filename: `recibo_${recibo.numero_recibo}.pdf`,
        headers,
      });
      if (share) {
        await shareFile(uri, 'application/pdf');
      } else {
        Alert.alert(t('common.success'), t('mobile.facturas.pdfDownloadedHint'));
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('facturas.errorDownloadPdf'));
    }
  };

  const renderTabs = () => (
    <View style={styles.tabs}>
      <Pressable
        style={[styles.tab, tab === 'facturas' && styles.tabActive]}
        onPress={() => setTab('facturas')}
      >
        <Text style={[styles.tabText, tab === 'facturas' && styles.tabTextActive]}>{t('facturas.docTabInvoices')}</Text>
      </Pressable>
      <Pressable
        style={[styles.tab, tab === 'recibos' && styles.tabActiveGreen]}
        onPress={() => setTab('recibos')}
      >
        <Text style={[styles.tabText, tab === 'recibos' && styles.tabTextActiveGreen]}>{t('facturas.docTabReceipts')}</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderTabs()}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {tab === 'facturas' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('facturas.newInvoiceTitle')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('facturas.fullName')}
                value={facturaForm.cliente_nombre}
                onChangeText={(t) => setFacturaForm((p) => ({ ...p, cliente_nombre: t }))}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder={t('facturas.documentType')}
                  value={facturaForm.cliente_tipo_documento}
                  onChangeText={(t) => setFacturaForm((p) => ({ ...p, cliente_tipo_documento: t }))}
                />
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder={t('facturas.documentNumber')}
                  value={facturaForm.cliente_nif}
                  onChangeText={(t) => setFacturaForm((p) => ({ ...p, cliente_nif: t }))}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('facturas.concept')}
                value={facturaForm.concepto}
                onChangeText={(t) => setFacturaForm((p) => ({ ...p, concepto: t }))}
              />
              <TextInput
                style={styles.input}
                placeholder={t('facturas.totalPaid')}
                keyboardType="decimal-pad"
                value={facturaForm.total_pagado}
                onChangeText={(t) => setFacturaForm((p) => ({ ...p, total_pagado: t }))}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder={t('facturas.ivaPercent')}
                  keyboardType="decimal-pad"
                  value={facturaForm.iva_porcentaje}
                  onChangeText={(t) => setFacturaForm((p) => ({ ...p, iva_porcentaje: t }))}
                />
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder={t('facturas.paymentMethod')}
                  value={facturaForm.forma_pago}
                  onChangeText={(t) => setFacturaForm((p) => ({ ...p, forma_pago: t }))}
                />
              </View>
              <Pressable
                style={styles.primaryButton}
                onPress={() => crearFactura.mutate()}
                disabled={crearFactura.isPending}
              >
                <Plus size={18} color="white" />
                <Text style={styles.primaryButtonText}>
                  {crearFactura.isPending ? t('facturas.creating') : t('facturas.createButton')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('facturas.historyTitle')}</Text>
              <FlatList
                data={facturas}
                keyExtractor={(i) => String(i.id)}
                scrollEnabled={false}
                ListEmptyComponent={<Text style={styles.emptyText}>{t('facturas.noInvoices')}</Text>}
                renderItem={({ item }) => (
                  <View style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{item.numero_factura}</Text>
                        <Text style={styles.itemSubtitle}>{item.cliente_nombre}</Text>
                        <Text style={styles.itemMeta}>{formatDate(item.fecha_emision)}</Text>
                      </View>
                      <Text style={styles.itemAmount}>{formatMoney(Number(item.total || 0))}</Text>
                    </View>
                    <View style={styles.itemActions}>
                      <Pressable
                        style={styles.actionChip}
                        onPress={() => descargarYCompartirFactura(item, false)}
                      >
                        <Download size={16} color="#2563eb" />
                        <Text style={styles.actionChipText}>{t('facturas.pdf')}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.actionChip}
                        onPress={() => descargarYCompartirFactura(item, true)}
                      >
                        <Share2 size={16} color="#2563eb" />
                        <Text style={styles.actionChipText}>{t('common.share')}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('facturas.receiptNewTitle')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('facturas.fullName')}
                value={reciboForm.cliente_nombre}
                onChangeText={(t) => setReciboForm((p) => ({ ...p, cliente_nombre: t }))}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder={t('facturas.documentType')}
                  value={reciboForm.cliente_tipo_documento}
                  onChangeText={(t) => setReciboForm((p) => ({ ...p, cliente_tipo_documento: t }))}
                />
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder={t('facturas.documentNumber')}
                  value={reciboForm.cliente_nif}
                  onChangeText={(t) => setReciboForm((p) => ({ ...p, cliente_nif: t }))}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('facturas.concept')}
                value={reciboForm.concepto}
                onChangeText={(t) => setReciboForm((p) => ({ ...p, concepto: t }))}
              />
              <TextInput
                style={styles.input}
                placeholder={t('facturas.receiptAmountLabel')}
                keyboardType="decimal-pad"
                value={reciboForm.importe_total}
                onChangeText={(t) => setReciboForm((p) => ({ ...p, importe_total: t }))}
              />
              <Text style={styles.fieldLabel}>{t('facturas.receiptPaymentDateLabel')}</Text>
              <View style={styles.dateRow}>
                <Pressable style={[styles.input, styles.datePressable]} onPress={() => openReciboDatePicker('fecha_pago')}>
                  <Text style={reciboForm.fecha_pago ? styles.dateText : styles.datePlaceholder}>
                    {reciboForm.fecha_pago || t('facturas.pickDate')}
                  </Text>
                </Pressable>
                {reciboForm.fecha_pago ? (
                  <Pressable style={styles.clearDateBtn} onPress={() => setReciboDateField('fecha_pago', '')}>
                    <Text style={styles.clearDateBtnText}>{t('facturas.clearDate')}</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>{t('facturas.receiptStayFromLabel')}</Text>
              <View style={styles.dateRow}>
                <Pressable style={[styles.input, styles.datePressable]} onPress={() => openReciboDatePicker('fecha_estancia_desde')}>
                  <Text style={reciboForm.fecha_estancia_desde ? styles.dateText : styles.datePlaceholder}>
                    {reciboForm.fecha_estancia_desde || t('facturas.pickDate')}
                  </Text>
                </Pressable>
                {reciboForm.fecha_estancia_desde ? (
                  <Pressable style={styles.clearDateBtn} onPress={() => setReciboDateField('fecha_estancia_desde', '')}>
                    <Text style={styles.clearDateBtnText}>{t('facturas.clearDate')}</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>{t('facturas.receiptStayToLabel')}</Text>
              <View style={styles.dateRow}>
                <Pressable style={[styles.input, styles.datePressable]} onPress={() => openReciboDatePicker('fecha_estancia_hasta')}>
                  <Text style={reciboForm.fecha_estancia_hasta ? styles.dateText : styles.datePlaceholder}>
                    {reciboForm.fecha_estancia_hasta || t('facturas.pickDate')}
                  </Text>
                </Pressable>
                {reciboForm.fecha_estancia_hasta ? (
                  <Pressable style={styles.clearDateBtn} onPress={() => setReciboDateField('fecha_estancia_hasta', '')}>
                    <Text style={styles.clearDateBtnText}>{t('facturas.clearDate')}</Text>
                  </Pressable>
                ) : null}
              </View>

              <TextInput
                style={styles.input}
                placeholder={t('facturas.paymentMethod')}
                value={reciboForm.forma_pago}
                onChangeText={(tx) => setReciboForm((p) => ({ ...p, forma_pago: tx }))}
              />
              <Pressable
                style={[styles.primaryButton, styles.primaryButtonGreen]}
                onPress={() => crearRecibo.mutate()}
                disabled={crearRecibo.isPending}
              >
                <Plus size={18} color="white" />
                <Text style={styles.primaryButtonText}>
                  {crearRecibo.isPending ? t('facturas.receiptCreating') : t('facturas.receiptCreateButton')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('facturas.receiptHistoryTitle')}</Text>
              <FlatList
                data={recibos}
                keyExtractor={(i) => String(i.id)}
                scrollEnabled={false}
                ListEmptyComponent={<Text style={styles.emptyText}>{t('facturas.noReceipts')}</Text>}
                renderItem={({ item }) => (
                  <View style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{item.numero_recibo}</Text>
                        <Text style={styles.itemSubtitle}>{item.cliente_nombre}</Text>
                        <Text style={styles.itemMeta}>{formatDate(item.fecha_emision)}</Text>
                      </View>
                      <Text style={styles.itemAmount}>{formatMoney(Number(item.importe_total || 0))}</Text>
                    </View>
                    <View style={styles.itemActions}>
                      <Pressable
                        style={styles.actionChip}
                        onPress={() => descargarYCompartirRecibo(item, false)}
                      >
                        <Download size={16} color="#2563eb" />
                        <Text style={styles.actionChipText}>{t('facturas.receiptPdf')}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.actionChip}
                        onPress={() => descargarYCompartirRecibo(item, true)}
                      >
                        <Share2 size={16} color="#2563eb" />
                        <Text style={styles.actionChipText}>{t('common.share')}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              />
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={iosDateModal != null} transparent animationType="fade" onRequestClose={() => setIosDateModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('facturas.pickDate')}</Text>
            {iosDateModal ? (
              <DateTimePicker
                value={iosDateModal.date}
                mode="date"
                display="spinner"
                onChange={(_, d) => {
                  if (d) setIosDateModal((m) => (m ? { ...m, date: d } : null));
                }}
              />
            ) : null}
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setIosDateModal(null)}>
                <Text style={styles.modalBtnGhostText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={confirmIosReciboDate}>
                <Text style={styles.modalBtnPrimaryText}>{t('common.save')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  tabActiveGreen: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#2563eb',
  },
  tabTextActiveGreen: {
    color: '#047857',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    marginTop: 4,
  },
  primaryButtonGreen: {
    backgroundColor: '#059669',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
  },
  emptyText: {
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingVertical: 8,
    textAlign: 'center',
  },
  itemCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563eb',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  datePressable: {
    flex: 1,
    marginBottom: 0,
    justifyContent: 'center',
  },
  dateText: { fontSize: 15, color: '#111827' },
  datePlaceholder: { fontSize: 15, color: '#9ca3af' },
  clearDateBtn: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  clearDateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnGhost: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  modalBtnGhostText: { fontWeight: '700', color: '#374151' },
  modalBtnPrimary: { backgroundColor: '#059669' },
  modalBtnPrimaryText: { fontWeight: '800', color: 'white' },
});

