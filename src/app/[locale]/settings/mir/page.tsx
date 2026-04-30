'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/useTenant';
import { useTranslations, useLocale } from 'next-intl';
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

type MirUnitType = 'habitacion' | 'apartamento';

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

type UnitCredDraft = {
  nombre: string;
  usuario: string;
  contraseña: string;
  codigoArrendador: string;
  codigoEstablecimiento: string;
  baseUrl: string;
};

interface MirUnitConfigRow {
  room_id: string;
  room_name: string;
  unit_type: MirUnitType;
  credencial_id: number | null;
}

const COUNTRY_CODES = ['ES', 'IT', 'PT', 'FR', 'DE'] as const;

export default function MirSettingsPage() {
  const t = useTranslations('settings.mir');
  const tCommon = useTranslations('common');
  const locale = useLocale();
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
      setLimits({ maxRooms: Number(limitsJson?.tenant?.limits?.maxRooms ?? 0) });
      setCredenciales(Array.isArray(credsJson?.credenciales) ? credsJson.credenciales : []);
      setUnits(Array.isArray(unitsJson?.units) ? unitsJson.units : []);
    } catch (e) {
      console.warn('⚠️ Error cargando multi MIR:', e);
    } finally {
      setLoadingMulti(false);
    }
  };

  const configured = credenciales.filter((c) => c.activo).length;
  const maxAllowed = limits?.maxRooms ?? 0;
  const canCreateMoreCreds = maxAllowed > 0 ? configured < maxAllowed : false;

  const credById = useMemo(() => {
    const m = new Map<number, MirCredencialLite>();
    for (const c of credenciales) m.set(c.id, c);
    return m;
  }, [credenciales]);

  const guardarUnitRow = async (
    roomId: string,
    patch: Partial<Pick<MirUnitConfigRow, 'unit_type' | 'credencial_id'>>
  ) => {
    const res = await fetch('/api/ministerio/unidades-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        unit_type: patch.unit_type,
        credencial_id: patch.credencial_id,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.success) {
      throw new Error(String(j?.error || t('multi.saveUnitFail')));
    }
  };

  const getOrInitDraft = (u: MirUnitConfigRow): UnitCredDraft => {
    const existing = unitCredDrafts[u.room_id];
    if (existing) return existing;
    return {
      nombre: u.room_name || t('multi.name'),
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

  const crearCredencialGlobal = async () => {
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
        throw new Error(String(j?.error || t('multi.createdFail')));
      }
      setSuccess(`✅ ${t('multi.createdOk')}`);
      setNewCred((p) => ({
        ...p,
        nombre: '',
        usuario: '',
        contraseña: '',
        codigoArrendador: '',
        codigoEstablecimiento: '',
      }));
      await cargarMultiMir();
    } catch (e: any) {
      setError(`❌ ${e?.message || t('multi.createdFail')}`);
    } finally {
      setCreatingCred(false);
    }
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
        throw new Error(String(j?.error || t('multi.assignedFail')));
      }
      const id = Number(j?.credencial?.id);
      if (!id) throw new Error(t('multi.assignedFail'));

      await guardarUnitRow(u.room_id, { credencial_id: id });
      setUnits((prev) => prev.map((x) => (x.room_id === u.room_id ? { ...x, credencial_id: id } : x)));
      setSuccess(`✅ ${t('multi.assignedOk')}`);
      await cargarMultiMir();
    } catch (e: any) {
      setError(`❌ ${e?.message || t('multi.assignedFail')}`);
    } finally {
      setCreatingForRoom(null);
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
        throw new Error(String(j?.error || j?.message || t('multi.credentialSaveError')));
      }
      setSuccess(`✅ ${t('multi.credentialUpdated')}`);
      setEditCredId(null);
      await cargarMultiMir();
    } catch (e: any) {
      setError(`❌ ${e?.message || t('multi.credentialSaveError')}`);
    } finally {
      setSavingCredEdit(false);
    }
  };

  const deleteCred = async (c: MirCredencialLite) => {
    if (!window.confirm(t('multi.deleteCredentialConfirm', { name: c.nombre }))) return;
    setDeletingCred(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/ministerio/credenciales/${c.id}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        throw new Error(String(j?.error || t('multi.credentialDeleteError')));
      }
      setSuccess(`✅ ${t('multi.credentialDeleted')}`);
      if (editCredId === c.id) setEditCredId(null);
      if (expandedCredId === c.id) setExpandedCredId(null);
      await cargarMultiMir();
    } catch (e: any) {
      setError(`❌ ${e?.message || t('multi.credentialDeleteError')}`);
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
      setError(t('selectCountry'));
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
        setSuccess(`✅ ${t('countrySaved')}`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`❌ ${data.error || t('errorSavingCountry')}`);
      }
    } catch (err) {
      setError(t('connectionError'));
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

  const guardarConfiguracion = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/ministerio/config-produccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ ${t('configSaved')}`);
      } else {
        setError(`❌ ${data.message || t('errorSavingConfig')}`);
      }
    } catch (err) {
      setError(t('connectionError'));
      console.error('Error guardando configuración:', err);
    } finally {
      setLoading(false);
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
        // Nota: enviamos contraseña vacía para que el backend conserve la ya guardada (si existe)
        // y cree/actualice la credencial principal en mir_credenciales.
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
        throw new Error(String(data?.message || data?.error || t('errorSavingConfig')));
      }
      setSuccess(`✅ ${t('configSaved')}`);
      await cargarMultiMir();
      await cargarConfiguracion();
    } catch (e: any) {
      setError(`❌ ${e?.message || t('errorSavingConfig')}`);
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
      status: hasRequired ? t('statusComplete') : t('statusIncomplete'),
      variant: hasRequired ? ('default' as const) : ('destructive' as const),
    };
  };

  const status = getConfigStatus();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h2 className="text-3xl font-bold mb-4 text-center">
            <span className="text-4xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏛️</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t('title')}</span>
          </h2>
          <p className="text-gray-700 font-medium text-lg">{t('subtitle')}</p>
        </div>

        {/* Banner Recordatorio MIR - Solo si no tiene módulo activado */}
        {tenant && (!tenant.legal_module || tenant.plan_type === 'free') && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-blue-900 mb-2">
                  💰 {t('moduleBannerTitle')}
                </h3>
                <p className="text-base text-blue-800 mb-2">
                  {t('moduleBannerReminder')}
                </p>
                <p className="text-sm text-blue-700 mb-2">
                  {t('moduleBannerPrice')}
                </p>
                <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
                  <li>{t('moduleBannerItem1')}</li>
                  <li>{t('moduleBannerItem2')}</li>
                  <li>{t('moduleBannerItem3')}</li>
                  <li>{t('moduleBannerItem4')}</li>
                </ul>
              </div>
              <Link
                href={`/${locale}/upgrade-plan`}
                className="whitespace-nowrap bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-md hover:shadow-lg"
              >
                {t('activateModule')}
              </Link>
            </div>
          </div>
        )}

        {/* Estado de configuración */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 font-bold">
              📊 {t('configStatusTitle')}
              <Badge variant={status.variant}>{status.status}</Badge>
            </CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              {t('configStatusDescription')}
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
              <span className="text-sm font-semibold text-gray-800">{t('userMir')}</span>
            </div>
            <div className="flex items-center space-x-2">
              {(editingContraseña ? Boolean(config.contraseña) : serverHasContraseña) ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">{t('passwordMir')}</span>
            </div>
            <div className="flex items-center space-x-2">
              {(Boolean(config.codigoArrendador) || serverHasCodigoArrendador) ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">{t('codigoArrendador')}</span>
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

      <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl">
        <CardHeader>
          <CardTitle className="text-gray-900 font-bold">🔑 {t('multi.title')}</CardTitle>
          <CardDescription className="text-gray-700 font-medium">
            {loadingMulti ? t('saving') : t('multi.counter', { configured, max: maxAllowed || '—' })}
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
                    {loading ? t('saving') : 'Importar credencial heredada'}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-gray-600">
            {t('multi.rule')}
          </p>
          <p className="text-xs text-gray-500 mt-2">{t('multi.mirRoutingNote')}</p>

          {!canCreateMoreCreds && maxAllowed > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-800 font-semibold">{t('multi.limitReached')}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <div className="text-sm font-semibold text-gray-900">{t('multi.existingTitle')}</div>
            <div className="text-xs text-gray-600">{t('multi.existingSubtitle')}</div>
            {credenciales.length === 0 ? (
              <div className="text-sm text-gray-600">{t('multi.existingEmpty')}</div>
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
                          aria-label={t('multi.viewCredential')}
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
                          aria-label={t('multi.editCredential')}
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
                          aria-label={t('multi.deleteCredential')}
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
                          <span className="font-semibold">{t('multi.establishment')}:</span> {c.codigoEstablecimiento}
                        </div>
                      </div>
                    ) : null}
                    {editCredId === c.id ? (
                      <div className="border-t border-gray-200 pt-3 space-y-2">
                        <div className="text-xs font-semibold text-gray-800">{t('multi.editingCredentialTitle')}</div>
                        <p className="text-xs text-gray-500">{t('multi.leavePasswordEmptyHint')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{t('multi.name')}</Label>
                            <Input
                              value={editDraft.nombre}
                              onChange={(e) => setEditDraft((p) => ({ ...p, nombre: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t('multi.user')}</Label>
                            <Input
                              value={editDraft.usuario}
                              onChange={(e) => setEditDraft((p) => ({ ...p, usuario: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t('multi.password')}</Label>
                            <Input
                              type="password"
                              value={editDraft.contraseña}
                              onChange={(e) => setEditDraft((p) => ({ ...p, contraseña: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t('multi.landlord')}</Label>
                            <Input
                              value={editDraft.codigoArrendador}
                              onChange={(e) => setEditDraft((p) => ({ ...p, codigoArrendador: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t('multi.establishment')}</Label>
                            <Input
                              value={editDraft.codigoEstablecimiento}
                              onChange={(e) => setEditDraft((p) => ({ ...p, codigoEstablecimiento: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs">{t('multi.baseUrl')}</Label>
                            <Input
                              value={editDraft.baseUrl}
                              onChange={(e) => setEditDraft((p) => ({ ...p, baseUrl: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button type="button" size="sm" onClick={saveEditCred} disabled={savingCredEdit}>
                            {savingCredEdit ? t('saving') : t('saveConfig')}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={cancelEditCred}>
                            {tCommon('cancel')}
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
            <div className="text-sm font-semibold text-gray-900">{t('multi.createTitle')}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-800 font-semibold">{t('multi.name')}</Label>
                <Input value={newCred.nombre} onChange={(e) => setNewCred((p) => ({ ...p, nombre: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-800 font-semibold">{t('multi.user')}</Label>
                <Input value={newCred.usuario} onChange={(e) => setNewCred((p) => ({ ...p, usuario: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-800 font-semibold">{t('multi.password')}</Label>
                <Input
                  type="password"
                  value={newCred.contraseña}
                  onChange={(e) => setNewCred((p) => ({ ...p, contraseña: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-800 font-semibold">{t('multi.landlord')}</Label>
                <Input
                  value={newCred.codigoArrendador}
                  onChange={(e) => setNewCred((p) => ({ ...p, codigoArrendador: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-800 font-semibold">{t('multi.establishment')}</Label>
                <Input
                  value={newCred.codigoEstablecimiento}
                  onChange={(e) => setNewCred((p) => ({ ...p, codigoEstablecimiento: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-800 font-semibold">{t('multi.baseUrl')}</Label>
                <Input value={newCred.baseUrl} onChange={(e) => setNewCred((p) => ({ ...p, baseUrl: e.target.value }))} />
              </div>
            </div>
            <Button onClick={crearCredencialGlobal} disabled={creatingCred || !canCreateMoreCreds} className="w-full sm:w-auto">
              {creatingCred ? t('saving') : t('multi.createButton')}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900">{t('multi.unitsTitle')}</div>
            {units.map((u) => (
              <div key={u.room_id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{u.room_name}</div>
                    <div className="text-xs text-gray-600">ID: {u.room_id}</div>
                    {u.credencial_id ? (
                      <div className="text-xs text-gray-700 mt-1">
                        {t('multi.assignedTo', { name: credById.get(u.credencial_id)?.nombre || `#${u.credencial_id}` })}
                        {credById.get(u.credencial_id)?.codigoEstablecimiento
                          ? ` · ${t('multi.assignedEstablishment', { code: credById.get(u.credencial_id)!.codigoEstablecimiento })}`
                          : ''}
                      </div>
                    ) : (
                      <div className="text-xs text-amber-800 mt-1">{t('multi.none')}</div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <select
                      value={u.unit_type}
                      onChange={async (e) => {
                        const unit_type = e.target.value as MirUnitType;
                        try {
                          await guardarUnitRow(u.room_id, { unit_type });
                          setUnits((prev) => prev.map((x) => (x.room_id === u.room_id ? { ...x, unit_type } : x)));
                        } catch (err: any) {
                          setError(`❌ ${err?.message || t('multi.saveUnitFail')}`);
                        }
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    >
                      <option value="habitacion">{t('multi.typeRoom')}</option>
                      <option value="apartamento">{t('multi.typeApartment')}</option>
                    </select>

                    <select
                      value={u.credencial_id ?? ''}
                      onChange={async (e) => {
                        const raw = e.target.value;
                        const credencial_id = raw ? Number(raw) : null;
                        try {
                          await guardarUnitRow(u.room_id, { credencial_id });
                          setUnits((prev) => prev.map((x) => (x.room_id === u.room_id ? { ...x, credencial_id } : x)));
                        } catch (err: any) {
                          setError(`❌ ${err?.message || t('multi.saveUnitFail')}`);
                        }
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    >
                      <option value="">{`— ${t('multi.none')} —`}</option>
                      {credenciales.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} · {c.codigoEstablecimiento}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {u.unit_type === 'apartamento' && (() => {
                  const assistantVisible = u.credencial_id
                    ? Boolean(apartmentAssistOpen[u.room_id])
                    : apartmentAssistOpen[u.room_id] !== false;

                  return (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{t('multi.apartmentAssistantTitle')}</div>
                        <div className="text-xs text-gray-700 mt-1">{t('multi.apartmentAssistantHint')}</div>
                      </div>
                      {!u.credencial_id ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button type="button" variant="outline" onClick={() => toggleApartmentAssistant(u)}>
                            {assistantVisible ? t('multi.toggleAssistantHide') : t('multi.toggleAssistantShow')}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => prefillDraftFromMain(u.room_id)}>
                            {t('multi.prefillFromMain')}
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {u.credencial_id ? (
                      <p className="text-xs text-gray-700">{t('multi.apartmentAssignedNote')}</p>
                    ) : assistantVisible ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(() => {
                          const draft = unitCredDrafts[u.room_id] || getOrInitDraft(u);
                          const setDraft = (patch: Partial<UnitCredDraft>) =>
                            setUnitCredDrafts((d) => ({ ...d, [u.room_id]: { ...draft, ...patch } }));

                          return (
                            <>
                              <div className="space-y-2 md:col-span-2">
                                <Label className="text-gray-800 font-semibold">{t('multi.name')}</Label>
                                <Input value={draft.nombre} onChange={(e) => setDraft({ nombre: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-gray-800 font-semibold">{t('multi.user')}</Label>
                                <Input value={draft.usuario} onChange={(e) => setDraft({ usuario: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-gray-800 font-semibold">{t('multi.password')}</Label>
                                <Input
                                  type="password"
                                  value={draft.contraseña}
                                  onChange={(e) => setDraft({ contraseña: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-gray-800 font-semibold">{t('multi.landlord')}</Label>
                                <Input
                                  value={draft.codigoArrendador}
                                  onChange={(e) => setDraft({ codigoArrendador: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-gray-800 font-semibold">{t('multi.establishment')}</Label>
                                <Input
                                  value={draft.codigoEstablecimiento}
                                  onChange={(e) => setDraft({ codigoEstablecimiento: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label className="text-gray-800 font-semibold">{t('multi.baseUrl')}</Label>
                                <Input value={draft.baseUrl} onChange={(e) => setDraft({ baseUrl: e.target.value })} />
                              </div>
                              <div className="md:col-span-2">
                                <Button
                                  type="button"
                                  onClick={() => crearCredencialYAsignar(u)}
                                  disabled={creatingForRoom === u.room_id || !canCreateMoreCreds}
                                  className="w-full sm:w-auto"
                                >
                                  {creatingForRoom === u.room_id ? t('saving') : t('multi.createAndAssign')}
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
            {units.length === 0 && !loadingMulti && <div className="text-sm text-gray-600">{t('multi.noUnits')}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Selector de País para Módulo Legal */}
      {tenant?.legal_module && (
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="text-gray-900 font-bold flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              {t('countryCardTitle')}
            </CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              {tenant?.plan_type === 'pro' 
                ? t('countryCardDescriptionPro')
                : t('countryCardDescriptionFree')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenant?.plan_type === 'free_legal' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="country_code" className="text-gray-800 font-semibold">{t('countryLabel')}</Label>
                  <select
                    id="country_code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    <option value="">{t('selectCountry')}</option>
                    {COUNTRY_CODES.map(code => (
                      <option key={code} value={code}>
                        {t(`countries.${code}`)} ({code})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 font-medium">
                    {t('countryHint')}
                  </p>
                </div>
                <Button
                  onClick={guardarCountryCode}
                  disabled={savingCountry || !countryCode}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingCountry ? t('saving') : t('saveCountry')}
                </Button>
              </>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>{t('planProInfo')}</strong>
                </p>
                {countryCode && (
                  <p className="text-xs text-blue-700 mt-2">
                    {t('countryConfigured', { name: t(`countries.${countryCode}`) || countryCode })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

        {/* Información importante */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 font-bold">
              <Info className="h-5 w-5 mr-2" />
              ℹ️ {t('infoTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            <p><strong>{t('infoHowToTitle')}</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>{t('infoStep1')} <a href="https://hospedajes.ses.mir.es" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">hospedajes.ses.mir.es</a></li>
              <li>{t('infoStep2')}</li>
              <li>{t('infoStep3')}</li>
              <li>{t('infoStep4')}</li>
            </ol>
          </div>
          
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
            <p className="text-sm text-orange-600">
              <strong>{t('infoWarning')}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      </div>

    </div>
  );
}