'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { defaultLocale } from '@/i18n/config';
import { getCurrentLocale } from '@/hooks/useClientTranslations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/useTenant';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Save,
  Info,
  Globe,
  Pencil,
  Trash2,
} from 'lucide-react';

type MirUnitType = 'habitacion' | 'apartamento';

interface MirConfig {
  usuario: string;
  contraseña: string;
  codigoArrendador: string;
  codigoEstablecimiento: string;
  baseUrl: string;
  aplicacion: string;
  simulacion: boolean;
  activo: boolean;
}

interface MirCredencialLite {
  id: number;
  nombre: string;
  usuario: string;
  hasPassword: boolean;
  codigoArrendador: string;
  codigoEstablecimiento: string;
  baseUrl: string;
  activo: boolean;
}

interface MirUnitConfigRow {
  room_id: string;
  room_name: string;
  unit_type: MirUnitType;
  credencial_id: number | null;
}

type UnitCredDraft = {
  nombre: string;
  usuario: string;
  contraseña: string;
  codigoArrendador: string;
  codigoEstablecimiento: string;
  baseUrl: string;
};

const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'IT', name: 'Italia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
];

export default function MirSettingsPage() {
  const { tenant } = useTenant();
  const [config, setConfig] = useState<MirConfig>({
    usuario: '',
    contraseña: '',
    codigoArrendador: '',
    codigoEstablecimiento: '',
    baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
    aplicacion: 'Delfin_Check_in',
    simulacion: false,
    activo: true
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string>('');
  const [savingCountry, setSavingCountry] = useState(false);
  const [hasConfig, setHasConfig] = useState(false); // Para saber si hay datos configurados
  const [editingUsuario, setEditingUsuario] = useState(false);
  const [editingContraseña, setEditingContraseña] = useState(false);
  const [serverHasUsuario, setServerHasUsuario] = useState(false);
  const [serverHasContraseña, setServerHasContraseña] = useState(false);
  const [serverHasCodigoArrendador, setServerHasCodigoArrendador] = useState(false);
  const [serverHasCodigoEstablecimiento, setServerHasCodigoEstablecimiento] = useState(false);
  const [navLocale, setNavLocale] = useState<Locale>(defaultLocale);

  // Nuevo: credenciales múltiples + configuración por unidad
  const [limits, setLimits] = useState<{ maxRooms: number } | null>(null);
  const [credenciales, setCredenciales] = useState<MirCredencialLite[]>([]);
  const [units, setUnits] = useState<MirUnitConfigRow[]>([]);
  const [loadingMulti, setLoadingMulti] = useState(false);
  const [creatingCred, setCreatingCred] = useState(false);
  const [creatingForRoom, setCreatingForRoom] = useState<string | null>(null);
  const [apartmentAssistOpen, setApartmentAssistOpen] = useState<Record<string, boolean>>({});
  const [unitCredDrafts, setUnitCredDrafts] = useState<Record<string, UnitCredDraft>>({});
  const [newCred, setNewCred] = useState<UnitCredDraft>({
    nombre: '',
    usuario: '',
    contraseña: '',
    codigoArrendador: '',
    codigoEstablecimiento: '',
    baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
  });

  const [editCredId, setEditCredId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<UnitCredDraft>({
    nombre: '',
    usuario: '',
    contraseña: '',
    codigoArrendador: '',
    codigoEstablecimiento: '',
    baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
  });
  const [savingCredEdit, setSavingCredEdit] = useState(false);
  const [expandedCredId, setExpandedCredId] = useState<number | null>(null);
  const [deletingCred, setDeletingCred] = useState(false);

  useEffect(() => {
    setNavLocale(getCurrentLocale());
  }, []);

  const upgradePlanHref = `/${navLocale}/upgrade-plan`;

  // Cargar configuración actual
  useEffect(() => {
    cargarConfiguracion();
    cargarCountryCode();
    cargarMultiMir();
  }, []);

  const cargarMultiMir = async () => {
    setLoadingMulti(true);
    try {
      const [limitsRes, credsRes, unitsRes] = await Promise.all([
        fetch('/api/tenant/limits'),
        fetch('/api/ministerio/credenciales'),
        fetch('/api/ministerio/unidades-config'),
      ]);
      const limitsJson = await limitsRes.json().catch(() => ({}));
      const credsJson = await credsRes.json().catch(() => ({}));
      const unitsJson = await unitsRes.json().catch(() => ({}));

      const maxRooms = Number(limitsJson?.tenant?.limits?.maxRooms ?? 0);
      setLimits({ maxRooms });
      setCredenciales(Array.isArray(credsJson?.credenciales) ? credsJson.credenciales : []);
      setUnits(Array.isArray(unitsJson?.units) ? unitsJson.units : []);
    } catch (e) {
      console.warn('⚠️ Error cargando multi MIR:', e);
    } finally {
      setLoadingMulti(false);
    }
  };

  const credencialesConfiguradas = credenciales.filter((c) => c.activo).length;
  const maxCredenciales = limits?.maxRooms ?? 0;
  const canCreateMoreCreds = maxCredenciales > 0 ? credencialesConfiguradas < maxCredenciales : false;

  const credById = useMemo(() => {
    const m = new Map<number, MirCredencialLite>();
    for (const c of credenciales) m.set(c.id, c);
    return m;
  }, [credenciales]);

  const guardarUnitRow = async (roomId: string, patch: Partial<Pick<MirUnitConfigRow, 'unit_type' | 'credencial_id'>>) => {
    await fetch('/api/ministerio/unidades-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        unit_type: patch.unit_type,
        credencial_id: patch.credencial_id,
      }),
    }).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.success) {
        throw new Error(j?.error || 'No se pudo guardar la configuración');
      }
    });
  };

  const getOrInitDraft = (u: MirUnitConfigRow): UnitCredDraft => {
    const existing = unitCredDrafts[u.room_id];
    if (existing) return existing;
    return {
      nombre: u.room_name || 'Nombre',
      usuario: config.usuario || '',
      contraseña: '',
      codigoArrendador: config.codigoArrendador || '',
      codigoEstablecimiento: config.codigoEstablecimiento || '',
      baseUrl: config.baseUrl || newCred.baseUrl,
    };
  };

  const toggleApartmentAssistant = (u: MirUnitConfigRow) => {
    setApartmentAssistOpen((prev) => {
      const prevVal = prev[u.room_id];
      const currentlyOpen = u.credencial_id ? Boolean(prevVal) : prevVal !== false;
      const nextOpen = !currentlyOpen;
      if (nextOpen) {
        setUnitCredDrafts((d) => ({
          ...d,
          [u.room_id]: d[u.room_id] || getOrInitDraft(u),
        }));
      }
      return { ...prev, [u.room_id]: nextOpen };
    });
  };

  const prefillDraftFromMain = (roomId: string) => {
    setUnitCredDrafts((d) => ({
      ...d,
      [roomId]: {
        ...(d[roomId] || {
          nombre: '',
          usuario: '',
          contraseña: '',
          codigoArrendador: '',
          codigoEstablecimiento: '',
          baseUrl: newCred.baseUrl,
        }),
        usuario: config.usuario || '',
        codigoArrendador: config.codigoArrendador || '',
        codigoEstablecimiento: config.codigoEstablecimiento || '',
        baseUrl: config.baseUrl || newCred.baseUrl,
      },
    }));
  };

  const crearCredencialYAsignar = async (u: MirUnitConfigRow) => {
    const draft = unitCredDrafts[u.room_id] || getOrInitDraft(u);
    setCreatingForRoom(u.room_id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/ministerio/credenciales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        throw new Error(j?.error || 'No se pudo crear/asignar la credencial');
      }
      const id = Number(j?.credencial?.id);
      if (!id) throw new Error('No se pudo crear/asignar la credencial');

      await guardarUnitRow(u.room_id, { credencial_id: id });
      setUnits((prev) => prev.map((x) => (x.room_id === u.room_id ? { ...x, credencial_id: id } : x)));
      setSuccess('✅ Credencial creada y asignada a la unidad');
      await cargarMultiMir();
    } catch (e: any) {
      setError(`❌ ${e?.message || 'No se pudo crear/asignar la credencial'}`);
    } finally {
      setCreatingForRoom(null);
    }
  };

  const crearCredencial = async () => {
    setCreatingCred(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/ministerio/credenciales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCred),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        throw new Error(j?.error || 'Error creando credencial');
      }
      setSuccess('✅ Credencial MIR creada');
      setNewCred((p) => ({ ...p, nombre: '', usuario: '', contraseña: '', codigoArrendador: '', codigoEstablecimiento: '' }));
      await cargarMultiMir();
    } catch (e: any) {
      setError(`❌ ${e?.message || 'Error creando credencial'}`);
    } finally {
      setCreatingCred(false);
    }
  };

  const startEditCred = (c: MirCredencialLite) => {
    setEditCredId(c.id);
    setExpandedCredId(null);
    setEditDraft({
      nombre: c.nombre,
      usuario: c.usuario,
      contraseña: '',
      codigoArrendador: c.codigoArrendador,
      codigoEstablecimiento: c.codigoEstablecimiento,
      baseUrl: c.baseUrl || newCred.baseUrl,
    });
  };

  const cancelEditCred = () => {
    setEditCredId(null);
  };

  const saveEditCred = async () => {
    if (!editCredId) return;
    setSavingCredEdit(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/ministerio/credenciales/${editCredId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editDraft.nombre,
          usuario: editDraft.usuario,
          contraseña: editDraft.contraseña,
          codigoArrendador: editDraft.codigoArrendador,
          codigoEstablecimiento: editDraft.codigoEstablecimiento,
          baseUrl: editDraft.baseUrl,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        throw new Error(String(j?.error || j?.message || 'No se pudo guardar la credencial'));
      }
      setSuccess('✅ Credencial actualizada');
      setEditCredId(null);
      await cargarMultiMir();
    } catch (e: any) {
      setError(`❌ ${e?.message || 'No se pudo guardar la credencial'}`);
    } finally {
      setSavingCredEdit(false);
    }
  };

  const deleteCred = async (c: MirCredencialLite) => {
    if (
      !window.confirm(
        `¿Eliminar la credencial «${c.nombre}»? Las unidades que la usaban quedarán sin credencial hasta que asignes otra en Configuración MIR.`
      )
    )
      return;
    setDeletingCred(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/ministerio/credenciales/${c.id}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        throw new Error(String(j?.error || 'No se pudo eliminar la credencial'));
      }
      setSuccess('✅ Credencial eliminada');
      if (editCredId === c.id) setEditCredId(null);
      if (expandedCredId === c.id) setExpandedCredId(null);
      await cargarMultiMir();
    } catch (e: any) {
      setError(`❌ ${e?.message || 'No se pudo eliminar la credencial'}`);
    } finally {
      setDeletingCred(false);
    }
  };

  const cargarCountryCode = async () => {
    try {
      const response = await fetch('/api/tenant/country-code');
      const data = await response.json();
      if (data.success) {
        setCountryCode(data.country_code || '');
      }
    } catch (err) {
      console.error('Error cargando country_code:', err);
    }
  };

  const guardarCountryCode = async () => {
    if (!countryCode) {
      setError('Selecciona un país');
      return;
    }

    setSavingCountry(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/tenant/country-code', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country_code: countryCode })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('✅ País configurado correctamente');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`❌ ${data.error || 'Error guardando país'}`);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error guardando país:', err);
    } finally {
      setSavingCountry(false);
    }
  };

  const cargarConfiguracion = async () => {
    try {
      const response = await fetch('/api/ministerio/verificar-config');
      const data = await response.json();
      
      if (data.success) {
        const hasUsuario = Boolean(data?.status?.credenciales?.usuario);
        const hasContraseña = Boolean(data?.status?.credenciales?.contraseña);
        const hasArr = Boolean(data?.status?.credenciales?.codigoArrendador);
        const hasEst = Boolean(data?.config?.codigoEstablecimiento);

        setServerHasUsuario(hasUsuario);
        setServerHasContraseña(hasContraseña);
        setServerHasCodigoArrendador(hasArr);
        setServerHasCodigoEstablecimiento(hasEst);

        const hasAnySensitive = hasUsuario || hasContraseña || hasArr || hasEst;
        setHasConfig(hasAnySensitive);
        setConfig({
          // Mostrar usuario WS (no es contraseña). Nunca pre-rellenar contraseña.
          usuario: data?.config?.usuario || '',
          contraseña: '',
          codigoArrendador: data?.config?.codigoArrendador || '',
          codigoEstablecimiento: data?.config?.codigoEstablecimiento || '',
          baseUrl: data.config.baseUrl || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
          aplicacion: data.config.aplicacion || 'Delfin_Check_in',
          simulacion: data.config.simulacion || false,
          activo: data.config.activo !== false
        });
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    }
  };

  const legacyOnly =
    credenciales.length === 0 &&
    (serverHasUsuario || serverHasContraseña || serverHasCodigoArrendador || serverHasCodigoEstablecimiento);

  const importarCredencialHeredada = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/ministerio/config-produccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: config.usuario,
          contraseña: '',
          codigoArrendador: config.codigoArrendador,
          codigoEstablecimiento: config.codigoEstablecimiento,
          baseUrl: config.baseUrl,
          aplicacion: config.aplicacion,
          simulacion: config.simulacion,
          activo: true,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(String(data?.message || data?.error || 'No se pudo importar la credencial'));
      }
      setSuccess('✅ Credencial importada');
      await cargarMultiMir();
      await cargarConfiguracion();
    } catch (e: any) {
      setError(`❌ ${e?.message || 'No se pudo importar la credencial'}`);
    } finally {
      setLoading(false);
    }
  };

  const getConfigStatus = () => {
    const effectiveUsuario = editingUsuario ? Boolean(config.usuario) : serverHasUsuario;
    const effectiveContraseña = editingContraseña ? Boolean(config.contraseña) : serverHasContraseña;
    const effectiveCodigoArrendador = Boolean(config.codigoArrendador) || serverHasCodigoArrendador;
    const hasRequired = effectiveUsuario && effectiveContraseña && effectiveCodigoArrendador;
    return {
      hasRequired,
      status: hasRequired ? 'Completa' : 'Incompleta',
      variant: hasRequired ? 'default' : 'destructive' as const
    };
  };

  const status = getConfigStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h2 className="text-3xl font-bold mb-4 text-center">
            <span className="text-4xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏛️</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Configuración MIR</span>
          </h2>
          <p className="text-gray-700 font-medium text-lg">Configura las credenciales para el envío de comunicaciones al Ministerio del Interior</p>
        </div>

        {/* Banner Recordatorio MIR - Solo si no tiene módulo activado */}
        {tenant && (!tenant.legal_module || tenant.plan_type === 'free') && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-blue-900 mb-2">
                  💰 Módulo MIR - Solo 2€/mes (+ IVA)
                </h3>
                <p className="text-base text-blue-800 mb-2">
                  <strong>Recordatorio:</strong> El envío automático de formularios de huéspedes al Ministerio del Interior es <strong>obligatorio</strong> en España.
                </p>
                <p className="text-sm text-blue-700 mb-2">
                  Por solo <strong>2€/mes (+ IVA 21%)</strong> puedes tener el módulo MIR activado, que incluye:
                </p>
                <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
                  <li>Check-in digital automático</li>
                  <li>Envío automático de formularios al gobierno</li>
                  <li>Cumplimiento legal garantizado</li>
                  <li>Sin preocupaciones por multas o sanciones</li>
                </ul>
              </div>
              <Link
                href={upgradePlanHref}
                className="whitespace-nowrap bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-md hover:shadow-lg"
              >
                Activar Módulo MIR
              </Link>
            </div>
          </div>
        )}

        {/* Estado de configuración */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 font-bold">
              📊 Estado de Configuración
              <Badge variant={status.variant as any}>{status.status}</Badge>
            </CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              Verifica que todas las credenciales estén configuradas correctamente
            </CardDescription>
          </CardHeader>
          <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              {(editingUsuario ? Boolean(config.usuario) : serverHasUsuario) ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">Usuario MIR</span>
            </div>
            <div className="flex items-center space-x-2">
              {(editingContraseña ? Boolean(config.contraseña) : serverHasContraseña) ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">Contraseña MIR</span>
            </div>
            <div className="flex items-center space-x-2">
              {(Boolean(config.codigoArrendador) || serverHasCodigoArrendador) ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">Código Arrendador</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800 font-semibold">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-800 font-semibold">{success}</AlertDescription>
        </Alert>
      )}

      {/* El modo antiguo (una credencial global) se oculta para evitar confusión:
          se usa siempre el sistema multi-credencial por unidad. */}

      {/* Selector de País para Módulo Legal */}
      {tenant?.legal_module && (
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="text-gray-900 font-bold flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              País del Módulo Legal
            </CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              {tenant?.plan_type === 'pro' 
                ? 'Plan PRO: Tienes acceso a todos los países. El módulo legal se adaptará automáticamente según el país del viajero.'
                : 'Plan FREE+LEGAL: Selecciona el país para el que está configurado tu módulo legal. Solo podrás registrar viajeros de este país.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenant?.plan_type === 'free_legal' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="country_code" className="text-gray-800 font-semibold">País *</Label>
                  <select
                    id="country_code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    <option value="">Selecciona un país</option>
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 font-medium">
                    Solo podrás registrar viajeros de este país. Para acceder a todos los países, actualiza a PRO.
                  </p>
                </div>
                <Button
                  onClick={guardarCountryCode}
                  disabled={savingCountry || !countryCode}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingCountry ? 'Guardando...' : 'Guardar País'}
                </Button>
              </>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Plan PRO:</strong> Tienes acceso a todos los países. El módulo legal se adaptará automáticamente según el país del viajero en cada registro.
                </p>
                {countryCode && (
                  <p className="text-xs text-blue-700 mt-2">
                    País configurado actualmente: <strong>{COUNTRIES.find(c => c.code === countryCode)?.name || countryCode}</strong>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

        {/* Nuevo: credenciales múltiples por plan + asignación por unidad */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 font-bold">🔑 Credenciales MIR configuradas</CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              {loadingMulti
                ? 'Cargando…'
                : `Configuradas: ${credencialesConfiguradas} · Máximo según tu plan: ${maxCredenciales || '—'}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {legacyOnly && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-gray-800 font-medium">
                  Detectamos una <strong>configuración MIR heredada</strong> (antigua). Para unificar el sistema y que solo haya
                  una forma de configurarlo, puedes importarla al modo multi-credencial sin perder datos.
                  <div className="mt-3">
                    <Button type="button" onClick={importarCredencialHeredada} disabled={loading}>
                      {loading ? 'Guardando…' : 'Importar credencial heredada'}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-gray-600">
              Regla: un apartamento debe tener su propia credencial MIR. Las habitaciones pueden compartirla.
            </p>

            {!canCreateMoreCreds && maxCredenciales > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-800 font-semibold">
                  Has alcanzado el máximo de credenciales MIR según tu plan. Para añadir otra, contrata una unidad más.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <div className="text-sm font-semibold text-gray-900">Credenciales creadas</div>
              <div className="text-xs text-gray-600">
                Estas credenciales aparecen en el desplegable “Sin asignar” de cada unidad.
              </div>
              <p className="text-xs text-gray-500 mt-2">
                El envío al MIR usa siempre la credencial asignada a la unidad (room_id) en el servidor; editar aquí no
                mezcla establecimientos.
              </p>
              {credenciales.length === 0 ? (
                <div className="text-sm text-gray-600">
                  Todavía no has creado credenciales. Crea la primera abajo o usa el asistente por apartamento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {credenciales.map((c) => (
                    <div key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">{c.nombre}</div>
                          <div className="text-xs text-gray-600 truncate">
                            {c.codigoEstablecimiento} · {c.usuario}
                            {c.hasPassword ? '' : ' · ⚠️'}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            aria-label="Ver detalle"
                            onClick={() => {
                              setExpandedCredId((id) => (id === c.id ? null : c.id));
                              setEditCredId(null);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            aria-label="Editar credencial"
                            onClick={() => {
                              startEditCred(c);
                              setExpandedCredId(null);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            disabled={deletingCred}
                            aria-label="Eliminar credencial"
                            onClick={() => deleteCred(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {expandedCredId === c.id ? (
                        <div className="text-xs text-gray-600 space-y-1 border-t border-gray-200 pt-2">
                          <div className="break-all">
                            <span className="font-semibold">URL:</span> {c.baseUrl}
                          </div>
                          <div>
                            <span className="font-semibold">Establecimiento:</span> {c.codigoEstablecimiento}
                          </div>
                        </div>
                      ) : null}
                      {editCredId === c.id ? (
                        <div className="border-t border-gray-200 pt-3 space-y-2">
                          <div className="text-xs font-semibold text-gray-800">Editar credencial</div>
                          <p className="text-xs text-gray-500">Deja la contraseña vacía para mantener la guardada.</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Nombre</Label>
                              <Input
                                value={editDraft.nombre}
                                onChange={(e) => setEditDraft((p) => ({ ...p, nombre: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Usuario MIR (WS)</Label>
                              <Input
                                value={editDraft.usuario}
                                onChange={(e) => setEditDraft((p) => ({ ...p, usuario: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Contraseña MIR (WS)</Label>
                              <Input
                                type="password"
                                value={editDraft.contraseña}
                                onChange={(e) => setEditDraft((p) => ({ ...p, contraseña: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Código Arrendador</Label>
                              <Input
                                value={editDraft.codigoArrendador}
                                onChange={(e) => setEditDraft((p) => ({ ...p, codigoArrendador: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Código Establecimiento</Label>
                              <Input
                                value={editDraft.codigoEstablecimiento}
                                onChange={(e) => setEditDraft((p) => ({ ...p, codigoEstablecimiento: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs">Base URL</Label>
                              <Input
                                value={editDraft.baseUrl}
                                onChange={(e) => setEditDraft((p) => ({ ...p, baseUrl: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button type="button" size="sm" onClick={saveEditCred} disabled={savingCredEdit}>
                              {savingCredEdit ? 'Guardando…' : 'Guardar'}
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={cancelEditCred}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="text-sm font-semibold text-gray-900">Crear credencial</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-gray-800 font-semibold">Nombre</Label>
                  <Input value={newCred.nombre} onChange={(e) => setNewCred((p) => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-800 font-semibold">Usuario MIR (WS)</Label>
                  <Input value={newCred.usuario} onChange={(e) => setNewCred((p) => ({ ...p, usuario: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-800 font-semibold">Contraseña MIR (WS)</Label>
                  <Input
                    type="password"
                    value={newCred.contraseña}
                    onChange={(e) => setNewCred((p) => ({ ...p, contraseña: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-800 font-semibold">Código Arrendador</Label>
                  <Input
                    value={newCred.codigoArrendador}
                    onChange={(e) => setNewCred((p) => ({ ...p, codigoArrendador: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-800 font-semibold">Código Establecimiento</Label>
                  <Input
                    value={newCred.codigoEstablecimiento}
                    onChange={(e) => setNewCred((p) => ({ ...p, codigoEstablecimiento: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-800 font-semibold">Base URL</Label>
                  <Input value={newCred.baseUrl} onChange={(e) => setNewCred((p) => ({ ...p, baseUrl: e.target.value }))} />
                </div>
              </div>
              <Button onClick={crearCredencial} disabled={creatingCred || !canCreateMoreCreds} className="w-full sm:w-auto">
                {creatingCred ? 'Guardando…' : 'Crear credencial'}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-900">Unidades (habitaciones / apartamentos)</div>
              <div className="space-y-2">
                {units.map((u) => (
                  <div key={u.room_id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{u.room_name}</div>
                        <div className="text-xs text-gray-600">ID: {u.room_id}</div>
                        {u.credencial_id ? (
                          <div className="text-xs text-gray-700 mt-1">
                            Asignada: {credById.get(u.credencial_id)?.nombre || `#${u.credencial_id}`}
                            {credById.get(u.credencial_id)?.codigoEstablecimiento
                              ? ` · Establecimiento: ${credById.get(u.credencial_id)!.codigoEstablecimiento}`
                              : ''}
                          </div>
                        ) : (
                          <div className="text-xs text-amber-800 mt-1">Sin asignar</div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <select
                          value={u.unit_type}
                          onChange={async (e) => {
                            const unit_type = (e.target.value as MirUnitType) || 'habitacion';
                            try {
                              await guardarUnitRow(u.room_id, { unit_type });
                              setUnits((prev) => prev.map((x) => (x.room_id === u.room_id ? { ...x, unit_type } : x)));
                            } catch (err: any) {
                              setError(`❌ ${err?.message || 'No se pudo guardar la configuración de la unidad'}`);
                            }
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        >
                          <option value="habitacion">Habitación</option>
                          <option value="apartamento">Apartamento</option>
                        </select>
                        <select
                          value={u.credencial_id ?? ''}
                          onChange={async (e) => {
                            const v = e.target.value ? Number(e.target.value) : null;
                            try {
                              await guardarUnitRow(u.room_id, { credencial_id: v });
                              setUnits((prev) => prev.map((x) => (x.room_id === u.room_id ? { ...x, credencial_id: v } : x)));
                            } catch (err: any) {
                              setError(`❌ ${err?.message || 'No se pudo guardar la configuración de la unidad'}`);
                            }
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        >
                          <option value="">— Sin asignar —</option>
                          {credenciales.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} · {c.codigoEstablecimiento}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {u.unit_type === 'apartamento' &&
                      (() => {
                        const assistantVisible = u.credencial_id
                          ? Boolean(apartmentAssistOpen[u.room_id])
                          : apartmentAssistOpen[u.room_id] !== false;

                        return (
                          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  Configurar credencial para este apartamento
                                </div>
                                <div className="text-xs text-gray-700 mt-1">
                                  Rellena los datos MIR para esta unidad. Al guardar, se crea la credencial y se asigna
                                  automáticamente a esta fila.
                                </div>
                              </div>
                              {!u.credencial_id ? (
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Button type="button" variant="outline" onClick={() => toggleApartmentAssistant(u)}>
                                    {assistantVisible ? 'Ocultar formulario' : 'Rellenar credencial aquí'}
                                  </Button>
                                  <Button type="button" variant="ghost" onClick={() => prefillDraftFromMain(u.room_id)}>
                                    Copiar datos del formulario principal
                                  </Button>
                                </div>
                              ) : null}
                            </div>

                            {u.credencial_id ? (
                              <p className="text-xs text-gray-700">
                                Esta unidad ya tiene credencial asignada. Para cambiarla, usa el desplegable de arriba
                                (elige otra credencial o “Sin asignar”).
                              </p>
                            ) : assistantVisible ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(() => {
                                  const draft = unitCredDrafts[u.room_id] || getOrInitDraft(u);
                                  const setDraft = (patch: Partial<UnitCredDraft>) =>
                                    setUnitCredDrafts((d) => ({ ...d, [u.room_id]: { ...draft, ...patch } }));

                                  return (
                                    <>
                                      <div className="space-y-2 md:col-span-2">
                                        <Label className="text-gray-800 font-semibold">Nombre</Label>
                                        <Input
                                          value={draft.nombre}
                                          onChange={(e) => setDraft({ nombre: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-gray-800 font-semibold">Usuario MIR (WS)</Label>
                                        <Input
                                          value={draft.usuario}
                                          onChange={(e) => setDraft({ usuario: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-gray-800 font-semibold">Contraseña MIR (WS)</Label>
                                        <Input
                                          type="password"
                                          value={draft.contraseña}
                                          onChange={(e) => setDraft({ contraseña: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-gray-800 font-semibold">Código Arrendador</Label>
                                        <Input
                                          value={draft.codigoArrendador}
                                          onChange={(e) => setDraft({ codigoArrendador: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-gray-800 font-semibold">Código Establecimiento</Label>
                                        <Input
                                          value={draft.codigoEstablecimiento}
                                          onChange={(e) => setDraft({ codigoEstablecimiento: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2 md:col-span-2">
                                        <Label className="text-gray-800 font-semibold">Base URL</Label>
                                        <Input value={draft.baseUrl} onChange={(e) => setDraft({ baseUrl: e.target.value })} />
                                      </div>
                                      <div className="md:col-span-2">
                                        <Button
                                          type="button"
                                          onClick={() => crearCredencialYAsignar(u)}
                                          disabled={creatingForRoom === u.room_id || !canCreateMoreCreds}
                                          className="w-full sm:w-auto"
                                        >
                                          {creatingForRoom === u.room_id ? 'Guardando…' : 'Crear y asignar'}
                                        </Button>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                  </div>
                ))}
                {units.length === 0 && !loadingMulti && (
                  <div className="text-sm text-gray-600">No hay unidades creadas todavía.</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información importante */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 font-bold">
              <Info className="h-5 w-5 mr-2" />
              ℹ️ Guía oficial: credenciales MIR (SES Hospedajes)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-700 space-y-3">
              <p className="font-medium">
                Para que Delfín Check-in pueda <strong>enviar automáticamente</strong> los partes al Ministerio del Interior, el
                propietario debe obtener sus credenciales técnicas en el portal oficial de SES Hospedajes.
              </p>

              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <p className="font-semibold text-blue-900 mb-2">✅ Resumen (los 4 datos que debes pegar aquí)</p>
                <ul className="list-disc list-inside space-y-1 text-blue-900">
                  <li><strong>Código de Arrendador</strong> (Entidad/propietario)</li>
                  <li><strong>Código de Establecimiento</strong> (<strong>10 dígitos</strong>, por cada propiedad)</li>
                  <li><strong>Usuario WS</strong> (normalmente <strong>NIF/CIF</strong> en mayúsculas + <strong>“---WS”</strong>, ej. <code>12345678A---WS</code>)</li>
                  <li><strong>Contraseña WS</strong> (la del apartado “Servicio de Comunicación”)</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-2">Paso 1: Alta de la Entidad (Propietario)</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Accede a la Sede Electrónica del Ministerio del Interior y entra en{' '}
                    <span className="font-semibold">“Acceso al registro de establecimientos y entidades”</span>.
                  </li>
                  <li>Identifícate con <strong>certificado digital</strong> o <strong>Cl@ve</strong>.</li>
                  <li>
                    Rellena el formulario de alta y selecciona tipo de entidad <strong>“Hospedaje”</strong>.
                  </li>
                  <li>
                    <strong>Crítico:</strong> marca la casilla <strong>“Envío de comunicaciones por servicio web”</strong>.
                    Si no se marca, el sistema no generará las credenciales que tu software necesita.
                  </li>
                  <li>Indica un <strong>correo de notificaciones de error</strong> (el MIR avisará si algún dato es incorrecto).</li>
                </ol>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-2">Paso 2: Registro de los Establecimientos (Propiedades)</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>En el mismo módulo, entra en <strong>“Registro de establecimiento”</strong>.</li>
                  <li>Completa los datos de cada propiedad y firma (por ejemplo, con <strong>AutoFirma</strong>).</li>
                  <li>
                    Al finalizar, se asigna un <strong>Código de Establecimiento</strong> de <strong>10 dígitos</strong> para cada propiedad.
                  </li>
                </ol>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-2">Paso 3: Dónde ver cada credencial (muy importante)</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    En <strong>“Mis datos registrados”</strong> verás el <strong>Código de Arrendador</strong> y los <strong>Códigos de Establecimiento</strong>.
                  </li>
                  <li>
                    En <strong>“Servicio de Comunicación”</strong> verás el <strong>Usuario del Servicio Web</strong> (formato <strong>NIF/CIF + “---WS”</strong>)
                    y la <strong>Contraseña del Servicio Web</strong> (asignada o modificable).
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-amber-900 mb-1">⏱️ Plazo legal</p>
                <p className="text-amber-900">
                  Recuerda: las comunicaciones (partes de viajeros) deben enviarse en un plazo máximo de <strong>24 horas</strong> desde el inicio del hospedaje.
                </p>
              </div>

              <p className="text-sm text-gray-600">
                Enlaces oficiales:{" "}
                <a
                  href="https://hospedajes.ses.mir.es/hospedajes-sede/#/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Sede SES Hospedajes
                </a>
                {" · "}
                <a
                  href="https://hospedajes.ses.mir.es/hospedajes-sede/#/comunicacion/inicio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Servicio de Comunicación
                </a>
              </p>
            </div>
          
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
            <p className="text-sm text-orange-600">
              <strong>Importante:</strong> Las credenciales son sensibles. Asegúrate de que estén configuradas correctamente antes de usar el sistema en producción.
            </p>
          </div>
        </CardContent>
      </Card>

        {/* El guardado y prueba de conexión se realizan desde la gestión de credenciales multi por unidad. */}
      </div>

    </div>
  );
}