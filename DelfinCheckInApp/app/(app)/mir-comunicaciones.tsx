// =====================================================
// COMUNICACIONES MIR - Registros de formularios
// =====================================================

import { View, Text, FlatList, StyleSheet, RefreshControl, TextInput, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Search, Mail, Phone, Calendar, Users } from 'lucide-react-native';
import { t } from '@/lib/i18n';

interface GuestRegistration {
  id: string;
  reserva_ref?: string;
  fecha_entrada: string;
  fecha_salida: string;
  created_at: string;
  updated_at?: string;
  viajero?: {
    nombre: string;
    apellido1: string;
    apellido2?: string;
    nacionalidad?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
  };
  contrato?: {
    codigoEstablecimiento?: string;
    referencia?: string;
    numHabitaciones?: number;
    internet?: boolean;
    tipoPago?: string;
  };
  data?: any;
}

interface GuestRegistrationStats {
  total_submissions: number;
  submissions_last_7_days: number;
  submissions_last_30_days: number;
}

export default function MIRComunicacionesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['guest-registrations', searchTerm],
    queryFn: async () => {
      try {
        console.log('📱 App móvil: Obteniendo registros de guest-registrations...');
        const response = await api.get('/api/guest-registrations');
        
        console.log('📦 Respuesta completa:', {
          status: response.status,
          hasData: !!response.data,
          isArray: Array.isArray(response.data),
          hasItems: !!response.data?.items,
          itemsLength: response.data?.items?.length || 0,
          ok: response.data?.ok,
          dataKeys: response.data ? Object.keys(response.data) : []
        });
        
        // La API puede devolver array directo o objeto con items
        let registrationsData: any[] = [];
        
        if (Array.isArray(response.data)) {
          registrationsData = response.data;
          console.log('✅ Datos recibidos como array directo');
        } else if (response.data?.items && Array.isArray(response.data.items)) {
          registrationsData = response.data.items;
          console.log('✅ Datos recibidos como objeto con items');
        } else if (response.data?.ok && response.data?.items) {
          registrationsData = response.data.items;
          console.log('✅ Datos recibidos como objeto con ok:true e items');
        } else {
          console.warn('⚠️ Formato de respuesta no reconocido:', response.data);
          registrationsData = [];
        }
        
        console.log(`✅ ${registrationsData.length} registros obtenidos en app móvil`);
        
        // Asegurar que los datos tengan la estructura correcta
        const processedData = registrationsData.map((item: any) => {
          // Si el item tiene data anidado, extraer la información del viajero
          if (item.data && !item.viajero) {
            const comunicacion = item.data?.comunicaciones?.[0];
            const persona = comunicacion?.personas?.[0];
            const contrato = comunicacion?.contrato;
            
            return {
              ...item,
              viajero: persona ? {
                nombre: persona.nombre || '',
                apellido1: persona.apellido1 || '',
                apellido2: persona.apellido2 || '',
                nacionalidad: persona.nacionalidad || '',
                tipoDocumento: persona.tipoDocumento || '',
                numeroDocumento: persona.numeroDocumento || ''
              } : undefined,
              contrato: contrato ? {
                codigoEstablecimiento: item.data?.codigoEstablecimiento || contrato.codigoEstablecimiento || '',
                referencia: contrato.referencia || '',
                numHabitaciones: contrato.numHabitaciones || 1,
                internet: contrato.internet || false,
                tipoPago: contrato.pago?.tipoPago || ''
              } : item.contrato
            };
          }
          return item;
        });
        
        console.log(`✅ ${processedData.length} registros procesados con estructura correcta`);
        
        // Filtrar por búsqueda si existe
        let filtered = processedData;
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          filtered = registrationsData.filter((item: GuestRegistration) => {
            const nombre = item.viajero?.nombre?.toLowerCase() || '';
            const apellido = item.viajero?.apellido1?.toLowerCase() || '';
            const referencia = item.contrato?.referencia?.toLowerCase() || '';
            const reservaRef = item.reserva_ref?.toLowerCase() || '';
            return nombre.includes(searchLower) || 
                   apellido.includes(searchLower) || 
                   referencia.includes(searchLower) ||
                   reservaRef.includes(searchLower);
          });
        }
        
        // Calcular estadísticas
        const now = new Date();
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const stats = {
          total_submissions: processedData.length,
          submissions_last_7_days: processedData.filter((item: GuestRegistration) => {
            const created = new Date(item.created_at);
            return created >= last7Days;
          }).length,
          submissions_last_30_days: processedData.filter((item: GuestRegistration) => {
            const created = new Date(item.created_at);
            return created >= last30Days;
          }).length,
        };
        
        return {
          registrations: filtered,
          stats,
        };
      } catch (err: any) {
        console.error('❌ Error obteniendo registros:', err.message);
        // Retornar datos vacíos en lugar de lanzar error
        return {
          registrations: [],
          stats: {
            total_submissions: 0,
            submissions_last_7_days: 0,
            submissions_last_30_days: 0,
          },
        };
      }
    },
  });

  const registrations: GuestRegistration[] = data?.registrations || [];
  const stats: GuestRegistrationStats = (data?.stats as GuestRegistrationStats | undefined) ?? {
    total_submissions: 0,
    submissions_last_7_days: 0,
    submissions_last_30_days: 0,
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading && !data) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Si hay error pero tenemos datos vacíos, mostrar la lista vacía en lugar del error
  const showError = error && (!data || registrations.length === 0);

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, email o mensaje..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Estadísticas */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_submissions || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.submissions_last_7_days || 0}</Text>
            <Text style={styles.statLabel}>Últimos 7 días</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.submissions_last_30_days || 0}</Text>
            <Text style={styles.statLabel}>Últimos 30 días</Text>
          </View>
        </View>
      )}

      {/* Mensaje de error si es necesario */}
      {showError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            No se pudieron cargar las comunicaciones. Mostrando datos locales.
          </Text>
          <Pressable style={styles.retryButtonSmall} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {/* Lista de registros */}
      <FlatList
        data={registrations}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const nombreCompleto = item.viajero 
            ? `${item.viajero.nombre || ''} ${item.viajero.apellido1 || ''} ${item.viajero.apellido2 || ''}`.trim()
            : 'Sin nombre';
          
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{nombreCompleto || 'Registro MIR'}</Text>
                <Text style={styles.date}>{formatDate(item.created_at)}</Text>
              </View>

              {item.contrato?.referencia && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Referencia:</Text>
                  <Text style={styles.infoText}>{item.contrato.referencia}</Text>
                </View>
              )}

              {item.reserva_ref && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Reserva:</Text>
                  <Text style={styles.infoText}>{item.reserva_ref}</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Calendar size={16} color="#6b7280" />
                <Text style={styles.infoText}>
                  Entrada: {new Date(item.fecha_entrada).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'short',
                    year: 'numeric'
                  })}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Calendar size={16} color="#6b7280" />
                <Text style={styles.infoText}>
                  Salida: {new Date(item.fecha_salida).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'short',
                    year: 'numeric'
                  })}
                </Text>
              </View>

              {item.viajero?.nacionalidad && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nacionalidad:</Text>
                  <Text style={styles.infoText}>{item.viajero.nacionalidad}</Text>
                </View>
              )}

              {item.viajero?.numeroDocumento && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Documento:</Text>
                  <Text style={styles.infoText}>
                    {item.viajero.tipoDocumento || 'NIF'} {item.viajero.numeroDocumento}
                  </Text>
                </View>
              )}

              {item.contrato?.codigoEstablecimiento && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Establecimiento:</Text>
                  <Text style={styles.infoText}>{item.contrato.codigoEstablecimiento}</Text>
                </View>
              )}

              {item.contrato?.numHabitaciones && (
                <View style={styles.infoRow}>
                  <Users size={16} color="#6b7280" />
                  <Text style={styles.infoText}>
                    {item.contrato.numHabitaciones} habitación{item.contrato.numHabitaciones > 1 ? 'es' : ''}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm ? t('reservations.noResultsTitle') : t('mobile.guestRegistrations.empty')}
            </Text>
            <Text style={styles.emptySubtext}>
              {t('mobile.guestRegistrations.hint')}
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    marginRight: 8,
    minWidth: 100,
  },
  roomType: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 8,
  },
  messageContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonSmall: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorBannerText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 4,
  },
});
