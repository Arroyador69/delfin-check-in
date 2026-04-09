'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import LocalizedDateInput from '@/components/LocalizedDateInput';

type PlanId = 'free' | 'checkin' | 'standard' | 'pro';
type BillingInterval = 'month' | 'year';
type LodgingType = 'hostal' | 'apartamentos';

interface OnboardingData {
  // Paso 1: Cambiar contraseña
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordChanged: boolean;
  
  // Paso 2: Datos de empresa
  nombreEmpresa: string;
  nifEmpresa: string;
  direccionEmpresa: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  telefono: string;
  email: string;
  web: string;
  fechaCreacion: string; // Fecha de creación de la empresa
  
  // Paso 3: MIR (opcional)
  usuarioMir: string;
  contraseñaMir: string;
  codigoArrendador: string;
  codigoEstablecimiento: string;
  
  // Paso 4: Añadir propiedad
  propertyName: string;
  propertyAdded: boolean;

  // Paso 3: Plan + tipo + unidades
  selectedPlanId: PlanId;
  billingInterval: BillingInterval;
  unitCount: number;
  checkoutCompleted: boolean;
  lodgingType: LodgingType;
}

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const tPlans = useTranslations('plans');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const TOTAL_STEPS = 5;
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [rooms, setRooms] = useState<Array<{ id: number | string; name: string }>>([]);
  const [tenant, setTenant] = useState<{ email?: string } | null>(null);
  const [bootstrappingSession, setBootstrappingSession] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pricing, setPricing] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  
  const [formData, setFormData] = useState<OnboardingData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    passwordChanged: false,
    nombreEmpresa: '',
    nifEmpresa: '',
    direccionEmpresa: '',
    codigoPostal: '',
    ciudad: '',
    provincia: '',
    pais: 'España',
    telefono: '',
    email: '',
    web: '',
    fechaCreacion: '',
    usuarioMir: '',
    contraseñaMir: '',
    codigoArrendador: '',
    codigoEstablecimiento: '',
    propertyName: '',
    propertyAdded: false,
    selectedPlanId: 'checkin',
    billingInterval: 'month',
    unitCount: 1,
    checkoutCompleted: false,
    lodgingType: 'hostal',
  });

  // Persistencia de onboarding para que, si el usuario sale y vuelve, continúe donde estaba.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('onboarding_progress_v1');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const storedPasswordChanged =
        !!(parsed?.formData &&
          typeof parsed.formData === 'object' &&
          parsed.formData.passwordChanged);
      if (parsed?.currentStep && typeof parsed.currentStep === 'number') {
        let step = Math.max(1, Math.min(TOTAL_STEPS, parsed.currentStep));
        // Evitar quedar bloqueado en paso 1 tras éxito guardado sin avanzar de paso (p. ej. recarga a mitad del delay).
        if (storedPasswordChanged && step === 1) {
          step = 2;
        }
        setCurrentStep(step);
      }
      if (parsed?.formData && typeof parsed.formData === 'object') {
        // No restauramos passwords por seguridad, pero sí el flag de passwordChanged.
        setFormData(prev => ({
          ...prev,
          passwordChanged: !!parsed.formData.passwordChanged,
          nombreEmpresa: parsed.formData.nombreEmpresa ?? prev.nombreEmpresa,
          nifEmpresa: parsed.formData.nifEmpresa ?? prev.nifEmpresa,
          direccionEmpresa: parsed.formData.direccionEmpresa ?? prev.direccionEmpresa,
          codigoPostal: parsed.formData.codigoPostal ?? prev.codigoPostal,
          ciudad: parsed.formData.ciudad ?? prev.ciudad,
          provincia: parsed.formData.provincia ?? prev.provincia,
          pais: parsed.formData.pais ?? prev.pais,
          telefono: parsed.formData.telefono ?? prev.telefono,
          email: parsed.formData.email ?? prev.email,
          web: parsed.formData.web ?? prev.web,
          fechaCreacion: parsed.formData.fechaCreacion ?? prev.fechaCreacion,
          usuarioMir: parsed.formData.usuarioMir ?? prev.usuarioMir,
          contraseñaMir: parsed.formData.contraseñaMir ?? prev.contraseñaMir,
          codigoArrendador: parsed.formData.codigoArrendador ?? prev.codigoArrendador,
          codigoEstablecimiento: parsed.formData.codigoEstablecimiento ?? prev.codigoEstablecimiento,
          propertyName: parsed.formData.propertyName ?? prev.propertyName,
          propertyAdded: !!parsed.formData.propertyAdded,
          selectedPlanId: parsed.formData.selectedPlanId ?? prev.selectedPlanId,
          billingInterval: parsed.formData.billingInterval ?? prev.billingInterval,
          unitCount: parsed.formData.unitCount ?? prev.unitCount,
          checkoutCompleted: !!parsed.formData.checkoutCompleted,
          lodgingType: parsed.formData.lodgingType ?? prev.lodgingType,
        }));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'onboarding_progress_v1',
        JSON.stringify({
          currentStep,
          formData: {
            passwordChanged: formData.passwordChanged,
            nombreEmpresa: formData.nombreEmpresa,
            nifEmpresa: formData.nifEmpresa,
            direccionEmpresa: formData.direccionEmpresa,
            codigoPostal: formData.codigoPostal,
            ciudad: formData.ciudad,
            provincia: formData.provincia,
            pais: formData.pais,
            telefono: formData.telefono,
            email: formData.email,
            web: formData.web,
            fechaCreacion: formData.fechaCreacion,
            usuarioMir: formData.usuarioMir,
            contraseñaMir: formData.contraseñaMir,
            codigoArrendador: formData.codigoArrendador,
            codigoEstablecimiento: formData.codigoEstablecimiento,
            propertyName: formData.propertyName,
            propertyAdded: formData.propertyAdded,
            selectedPlanId: formData.selectedPlanId,
            billingInterval: formData.billingInterval,
            unitCount: formData.unitCount,
            checkoutCompleted: formData.checkoutCompleted,
            lodgingType: formData.lodgingType,
          },
        })
      );
    } catch {}
  }, [currentStep, formData]);

  useEffect(() => {
    bootstrapSessionFromToken();
    if (currentStep === 5) {
      loadRooms();
    }
  }, [currentStep]);

  useEffect(() => {
    // Recuperar selección tras volver de Stripe
    try {
      const raw = localStorage.getItem('onboarding_plan_selection');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.selectedPlanId) {
          setFormData(prev => ({
            ...prev,
            selectedPlanId: parsed.selectedPlanId,
            billingInterval: parsed.billingInterval || prev.billingInterval,
            unitCount: parsed.unitCount || prev.unitCount,
          }));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (currentStep !== 3) return;
    loadPricing();
    const checkoutFlag = searchParams?.get('checkout');
    if (checkoutFlag === 'success' && formData.selectedPlanId !== 'free') {
      pollCheckoutCompletion(formData.selectedPlanId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData.selectedPlanId, formData.billingInterval, formData.unitCount, searchParams]);

  const getLocaleFromPath = () => {
    const parts = (pathname || '').split('/').filter(Boolean);
    const maybeLocale = parts[0];
    return maybeLocale && ['es', 'en', 'it', 'pt', 'fr'].includes(maybeLocale) ? maybeLocale : 'es';
  };

  const bootstrapSessionFromToken = async () => {
    // Si venimos desde email con token, intercambiarlo por cookies de sesión
    const token = searchParams?.get('token');
    const email = searchParams?.get('email');

    // Si no hay token/email, solo verificar status normal
    if (!token || !email) {
      await checkOnboardingStatus();
      return;
    }

    setBootstrappingSession(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setError(data?.error || 'No se pudo validar el enlace de onboarding');
        return;
      }

      // Limpiar query params para evitar reintentos y dejar URL limpia
      const locale = getLocaleFromPath();
      router.replace(`/${locale}/onboarding`);
      // Luego revisar status ya autenticado
      await checkOnboardingStatus();
    } catch (e) {
      setError('Error validando el enlace de onboarding');
    } finally {
      setBootstrappingSession(false);
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const tenantResponse = await fetch('/api/tenant');
      const tenantData = await tenantResponse.json();
      if (tenantData.tenant) setTenant(tenantData.tenant);
      if (tenantData.tenant?.onboarding_status === 'completed') {
        router.push(`/${locale}/dashboard`);
        return;
      }
    } catch (error) {
      console.error('Error verificando estado del onboarding:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await fetch('/api/tenant/rooms', { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (data.success) {
        const list = data.rooms || [];
        setRooms(list);
        if (list.length === 0) {
          setFormData((prev) =>
            prev.propertyAdded ? { ...prev, propertyAdded: false } : prev
          );
        }
      } else {
        console.warn('[onboarding] /api/tenant/rooms:', data);
      }
    } catch (error) {
      console.error('Error cargando habitaciones:', error);
    }
  };

  const handleInputChange = (field: keyof OnboardingData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const advancePastPasswordStep = async () => {
    try {
      await fetch('/api/tenant/onboarding-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_status: 'in_progress' }),
      });
    } catch (error) {
      console.error('Error actualizando onboarding_status:', error);
    }
    setCurrentStep(2);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Cambiar contraseña
        if (!formData.passwordChanged) {
          setError(t('errors.mustChangePassword'));
          return false;
        }
        return true;
      case 2: // Datos empresa
        if (!formData.nombreEmpresa || !formData.nifEmpresa || !formData.direccionEmpresa ||
            !formData.codigoPostal || !formData.ciudad || !formData.provincia || 
            !formData.pais || !formData.telefono || !formData.email || !formData.fechaCreacion) {
          setError(t('errors.allFieldsRequired'));
          return false;
        }
        return true;
      case 3: // Plan y pago
        if (!formData.selectedPlanId) return true;
        if (formData.unitCount < 1 || formData.unitCount > 500) {
          setError('El número de unidades debe estar entre 1 y 500');
          return false;
        }
        if (formData.selectedPlanId === 'free' && formData.unitCount !== 1) {
          setError('El Plan Básico permite 1 unidad. Para más unidades, selecciona un plan de pago.');
          return false;
        }
        if (formData.selectedPlanId !== 'free' && !formData.checkoutCompleted) {
          setError('Completa el pago del plan seleccionado para continuar');
          return false;
        }
        return true;
      case 4: // MIR (opcional, puede saltarse)
        return true;
      case 5: // Crear unidades (obligatorio)
        if (!formData.propertyAdded) {
          setError('Crea tus unidades para continuar');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    setError('');
    
    if (!validateStep(currentStep)) {
      return;
    }

    // Guardar datos del paso actual antes de avanzar
    if (currentStep === 2) {
      await saveCompanyData();
    }

    if (currentStep < TOTAL_STEPS) {
      if (currentStep === 1) {
        await advancePastPasswordStep();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleContinueFromPasswordStep = async () => {
    if (loading || bootstrappingSession) return;
    setLoading(true);
    setError('');
    try {
      await handleNext();
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setError('');
    setLoading(true);

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError(t('errors.allFieldsRequiredShort'));
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError(t('errors.passwordsDoNotMatch'));
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError(t('errors.passwordMinLength'));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || t('errors.changePasswordFailed'));
        setLoading(false);
        return;
      }

      setFormData(prev => ({ ...prev, passwordChanged: true }));
      setError('');
      await advancePastPasswordStep();
    } catch (error) {
      setError('Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const saveCompanyData = async () => {
    try {
      const response = await fetch('/api/empresa/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_empresa: formData.nombreEmpresa,
          nif: formData.nifEmpresa,
          direccion: formData.direccionEmpresa,
          codigo_postal: formData.codigoPostal,
          ciudad: formData.ciudad,
          provincia: formData.provincia,
          pais: formData.pais,
          telefono: formData.telefono,
          email: formData.email,
          web: formData.web,
          fecha_creacion: formData.fechaCreacion
        })
      });

      if (!response.ok) {
        console.error('Error guardando datos de empresa');
      }
    } catch (error) {
      console.error('Error guardando datos de empresa:', error);
    }
  };

  const generateDefaultUnits = (count: number, lodgingType: LodgingType) => {
    const base = lodgingType === 'apartamentos' ? 'Apartamento' : 'Habitación';
    return Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      name: `${base} ${i + 1}`,
    }));
  };

  const [unitNames, setUnitNames] = useState<Array<{ id: string; name: string }>>(() =>
    generateDefaultUnits(1, 'hostal')
  );

  useEffect(() => {
    // Mantener unitNames alineado con el número/tipo de unidades elegidas
    setUnitNames((prev) => {
      const next = generateDefaultUnits(formData.unitCount, formData.lodgingType);
      // Mantener nombres ya editados si coinciden ids
      const map = new Map(prev.map((u) => [u.id, u.name]));
      return next.map((u) => ({ ...u, name: map.get(u.id) ?? u.name }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.unitCount, formData.lodgingType]);

  const handleAddProperty = async () => {
    setError('');
    setLoading(true);

    // Si el usuario no tocó nombres, al menos habrá defaults
    const payloadRooms = (unitNames || []).map((u) => ({ id: u.id, name: u.name })).filter((u) => u.name.trim());
    if (payloadRooms.length === 0) {
      setError('Indica al menos una unidad');
      setLoading(false);
      return;
    }

    try {
      const roomsResponse = await fetch('/api/tenant/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rooms: payloadRooms,
          lodgingType: formData.lodgingType,
        })
      });

      const roomsData = await roomsResponse.json();

      if (!roomsResponse.ok || !roomsData.success) {
        setError(roomsData.error || t('errors.createPropertyFailed'));
        setLoading(false);
        return;
      }

      setFormData(prev => ({ ...prev, propertyAdded: true }));
      setError('');
      await loadRooms();
    } catch (error) {
      setError(t('errors.addPropertyFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!validateStep(5)) {
      return;
    }
    setLoading(true);

    try {
      // Guardar datos MIR si se proporcionaron (opcional)
      if (formData.usuarioMir && formData.contraseñaMir && formData.codigoArrendador && formData.codigoEstablecimiento) {
        await fetch('/api/ministerio/config-produccion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario: formData.usuarioMir,
            contraseña: formData.contraseñaMir,
            codigoArrendador: formData.codigoArrendador,
            codigoEstablecimiento: formData.codigoEstablecimiento,
            baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
            aplicacion: 'Delfin_Check_in',
            simulacion: false,
            activo: true
          })
        });
      }

      // Marcar onboarding como completado
      await fetch('/api/tenant/onboarding-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_status: 'completed' })
      });

      router.push(`/${locale}/dashboard`);
    } catch (error) {
      console.error('Error:', error);
      setError(t('errors.completeFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Paso 1: Cambiar contraseña
  const renderPasswordStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {t('step1.title')}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {t('step1.intro')}
        </p>

        {formData.passwordChanged && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-semibold">{t('step1.passwordChangedSuccess')}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step1.currentPassword')}
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={formData.passwordChanged || bootstrappingSession}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                disabled={formData.passwordChanged || bootstrappingSession}
              >
                  {showCurrentPassword ? t('common.hide') : t('common.show')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step1.newPassword')}
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={formData.passwordChanged || bootstrappingSession}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                disabled={formData.passwordChanged || bootstrappingSession}
              >
                  {showNewPassword ? t('common.hide') : t('common.show')}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('step1.minChars')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step1.confirmPassword')}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={formData.passwordChanged || bootstrappingSession}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                disabled={formData.passwordChanged || bootstrappingSession}
              >
                  {showConfirmPassword ? t('common.hide') : t('common.show')}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8 gap-3">
          {!formData.passwordChanged ? (
            <button
              type="button"
              onClick={handlePasswordChange}
              disabled={loading || bootstrappingSession}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? t('step1.changing') : t('step1.changePassword')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleContinueFromPasswordStep()}
              disabled={loading || bootstrappingSession}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? t('step1.changing') : t('step1.continueNext')}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Paso 2: Datos empresa
  const renderEmpresaStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {t('step2.title')}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {t('step2.intro')}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step2.companyName')}
            </label>
            <input
              type="text"
              value={formData.nombreEmpresa}
              onChange={(e) => handleInputChange('nombreEmpresa', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step2.nif')}
            </label>
            <input
              type="text"
              value={formData.nifEmpresa}
              onChange={(e) => handleInputChange('nifEmpresa', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step2.address')}
            </label>
            <input
              type="text"
              value={formData.direccionEmpresa}
              onChange={(e) => handleInputChange('direccionEmpresa', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step2.postalCode')}
            </label>
            <input
              type="text"
              value={formData.codigoPostal}
              onChange={(e) => handleInputChange('codigoPostal', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step2.city')}
            </label>
            <input
              type="text"
              value={formData.ciudad}
              onChange={(e) => handleInputChange('ciudad', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step2.province')}
            </label>
            <input
              type="text"
              value={formData.provincia}
              onChange={(e) => handleInputChange('provincia', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step2.country')}
            </label>
            <input
              type="text"
              value={formData.pais}
              onChange={(e) => handleInputChange('pais', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step2.companyCreationDate')}
            </label>
            <LocalizedDateInput
              value={formData.fechaCreacion}
              onChange={(e) => handleInputChange('fechaCreacion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step2.phone')}
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => handleInputChange('telefono', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step2.email')}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step2.website')}
            </label>
            <input
              type="url"
              value={formData.web}
              onChange={(e) => handleInputChange('web', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            {t('step2.previous')}
          </button>
          <button
            onClick={handleNext}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {t('step2.continue')}
          </button>
        </div>
      </div>
    </div>
  );

  // Paso 3: MIR (opcional)
  const renderMIRStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {t('step3.title')}
        </h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            {t('step3.importantTitle')}
          </h2>
          <p className="text-yellow-700 mb-3">
            {t('step3.importantText')}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            {t('step3.moduleTitle')}
          </h2>
          <p className="text-blue-700 mb-2">
            <strong>{t('step3.reminder')}</strong> {t('step3.reminderText')} <strong>{t('step3.reminderBold')}</strong> {t('step3.reminderLocation')}
          </p>
          <p className="text-blue-700">
            {t('step3.priceText')} <strong>{t('step3.priceBold')}</strong> {t('step3.priceSuffix')}
          </p>
          <ul className="list-disc list-inside text-blue-800 mt-2 space-y-1">
            <li>{t('step3.feature1')}</li>
            <li>{t('step3.feature2')}</li>
            <li>{t('step3.feature3')}</li>
            <li>{t('step3.feature4')}</li>
          </ul>
          <button
            type="button"
            onClick={() => {
              // Mantener al usuario dentro del onboarding: preseleccionar plan y llevar al pago.
              setFormData(prev => ({ ...prev, selectedPlanId: 'checkin' }));
              setCurrentStep(3);
              try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
            }}
            className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
          >
            {t('step3.activateModule')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step3.userMir')}
            </label>
            <input
              type="text"
              value={formData.usuarioMir}
              onChange={(e) => handleInputChange('usuarioMir', e.target.value)}
              placeholder={t('step3.userMirPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('step3.userMirHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step3.passwordMir')}
            </label>
            <input
              type="password"
              value={formData.contraseñaMir}
              onChange={(e) => handleInputChange('contraseñaMir', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step3.landlordCode')}
            </label>
            <input
              type="text"
              value={formData.codigoArrendador}
              onChange={(e) => handleInputChange('codigoArrendador', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('step3.establishmentCode')}
            </label>
            <input
              type="text"
              value={formData.codigoEstablecimiento}
              onChange={(e) => handleInputChange('codigoEstablecimiento', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            {t('step3.previous')}
          </button>
          <button
            onClick={handleNext}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {t('step3.continueOptional')}
          </button>
        </div>
      </div>
    </div>
  );

  // Paso 5: Crear unidades (obligatorio)
  const renderPropertyStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {t('step4.title')}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {t('step4.intro')}
        </p>

        {tenant?.email !== 'contacto@delfincheckin.com' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800">{t('step4.optionalForOtherTenants')}</p>
          </div>
        )}

        {formData.propertyAdded && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-semibold">{t('step4.propertyAddedSuccess')}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {rooms.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">{t('step4.existingProperties')}</h3>
            <ul className="list-disc list-inside text-blue-800">
              {rooms.map(room => (
                <li key={room.id}>{room.name}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Unidades a crear</p>
                <p className="text-xs text-gray-600">
                  {formData.unitCount} {formData.lodgingType === 'apartamentos' ? 'apartamentos' : 'habitaciones'}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {unitNames.map((u, idx) => (
                <div key={u.id}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {formData.lodgingType === 'apartamentos' ? 'Apartamento' : 'Habitación'} {idx + 1}
                  </label>
                  <input
                    type="text"
                    value={u.name}
                    onChange={(e) =>
                      setUnitNames((prev) =>
                        prev.map((x) => (x.id === u.id ? { ...x, name: e.target.value } : x))
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    disabled={formData.propertyAdded}
                  />
                </div>
              ))}
            </div>
          </div>

          {!formData.propertyAdded && (
            <button
              onClick={handleAddProperty}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? t('step4.adding') : `Crear ${formData.unitCount} unidades`}
            </button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <p className="text-blue-800 text-sm">{t('step4.cleaningHint')}</p>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            {t('step4.previous')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.propertyAdded}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? t('step4.completing') : t('step4.completeSetup')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-2xl">🐬</span>
              <h1 className="text-xl font-bold text-gray-900">{t('appName')}</h1>
            </div>
            <div className="text-sm text-gray-500">
              {t('stepOf', { currentStep, totalSteps: TOTAL_STEPS })}
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex space-x-2">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full ${
                    step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {currentStep === 1 && renderPasswordStep()}
      {currentStep === 2 && renderEmpresaStep()}
      {currentStep === 3 && renderPlanAndPaymentStep()}
      {currentStep === 4 && renderMIRStep()}
      {currentStep === 5 && renderPropertyStep()}
    </div>
  );

  async function loadPricing(next?: Partial<Pick<OnboardingData, 'selectedPlanId' | 'billingInterval' | 'unitCount'>>) {
    const planId = (next?.selectedPlanId ?? formData.selectedPlanId) as PlanId;
    const interval = (next?.billingInterval ?? formData.billingInterval) as BillingInterval;
    const unitCount = Number(next?.unitCount ?? formData.unitCount);
    if (!planId || planId === 'free') {
      setPricing(null);
      return;
    }
    setPricingLoading(true);
    try {
      const res = await fetch(`/api/plans/calculate-price?planId=${planId}&roomCount=${unitCount}&interval=${interval}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data?.success) setPricing(data.pricing);
    } finally {
      setPricingLoading(false);
    }
  }

  async function pollCheckoutCompletion(targetPlan: PlanId) {
    const start = Date.now();
    while (Date.now() - start < 25000) {
      try {
        const res = await fetch('/api/tenant', { credentials: 'include' });
        const data = await res.json();
        const planType = data?.tenant?.plan_type || 'free';
        const subStatus = data?.tenant?.subscription_status || '';
        if (planType === targetPlan && (subStatus === 'active' || subStatus === 'trialing' || subStatus === 'past_due')) {
          setFormData(prev => ({ ...prev, checkoutCompleted: true }));
          return;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  function renderPlanAndPaymentStep() {
    const locale = getLocaleFromPath();
    const checkoutFlag = searchParams?.get('checkout');

    const PLAN_CARDS: Array<{
      id: PlanId;
      name: string;
      desc: string;
      badge?: string;
      basePrice: number;
      color: string;
      featuresKeys: string[];
      defaultUnits: number;
    }> = [
      {
        id: 'free',
        name: tPlans('freePlanName'),
        desc: tPlans('freePlanDesc'),
        basePrice: 0,
        color: 'blue',
        featuresKeys: ['freeF0', 'freeF1', 'freeF2', 'freeF3', 'freeF4'],
        defaultUnits: 1,
      },
      {
        id: 'checkin',
        name: tPlans('checkinPlanName'),
        desc: tPlans('checkinPlanDesc'),
        badge: tPlans('mostPopular'),
        basePrice: 2,
        color: 'green',
        featuresKeys: ['checkinF0', 'checkinF1', 'checkinF2', 'checkinF3', 'checkinF4', 'checkinF5', 'checkinF6'],
        defaultUnits: 2,
      },
      {
        id: 'standard',
        name: tPlans('standardPlanName'),
        desc: tPlans('standardPlanDesc'),
        basePrice: 9.99,
        color: 'amber',
        featuresKeys: ['standardF0', 'standardF1', 'standardF2', 'standardF3', 'standardF4', 'standardF5'],
        defaultUnits: 4,
      },
      {
        id: 'pro',
        name: tPlans('proPlanName'),
        desc: tPlans('proPlanDesc'),
        basePrice: 29.99,
        color: 'purple',
        featuresKeys: ['proF0', 'proF1', 'proF2', 'proF3', 'proF4', 'proF5', 'proF6', 'proF7'],
        defaultUnits: 6,
      },
    ];

    const onPay = async () => {
      setError('');
      if (formData.selectedPlanId === 'free') {
        setFormData(prev => ({ ...prev, checkoutCompleted: true }));
        // En plan gratis no hay pago: continuar con el onboarding
        await handleNext();
        return;
      }
      if (formData.unitCount < 1 || formData.unitCount > 500) {
        setError('El número de unidades debe estar entre 1 y 500');
        return;
      }

      try {
        localStorage.setItem(
          'onboarding_plan_selection',
          JSON.stringify({
            selectedPlanId: formData.selectedPlanId,
            billingInterval: formData.billingInterval,
            unitCount: formData.unitCount,
          })
        );
      } catch {}

      setCreatingCheckout(true);
      try {
        const res = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            planId: formData.selectedPlanId,
            roomCount: formData.unitCount,
            interval: formData.billingInterval,
            locale,
            lodgingType: formData.lodgingType,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success || !data?.url) {
          setError(data?.error || 'No se pudo iniciar el pago');
          return;
        }
        window.location.href = data.url;
      } finally {
        setCreatingCheckout(false);
      }
    };

    const canFinish =
      formData.selectedPlanId === 'free'
        ? true
        : !!formData.checkoutCompleted;

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💳 Plan y pago</h1>
          <p className="text-gray-600 mb-6">Elige tu plan, unidades y si prefieres pago mensual o anual.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {PLAN_CARDS.map((p) => {
              const isSelected = formData.selectedPlanId === p.id;
              const isPaid = p.id !== 'free';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setError('');
                    setFormData((prev) => ({
                      ...prev,
                      selectedPlanId: p.id,
                      unitCount: p.id === 'free' ? 1 : Math.max(prev.unitCount || 1, p.defaultUnits),
                      checkoutCompleted: p.id === 'free' ? true : false,
                    }));
                    loadPricing({ selectedPlanId: p.id });
                  }}
                  className={`text-left border rounded-xl p-4 transition-all ${
                    isSelected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
                        {p.badge && (
                          <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{p.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-extrabold text-gray-900">
                        {p.basePrice === 0 ? tPlans('free') : `${p.basePrice}€`}
                      </div>
                      <div className="text-xs text-gray-500">{p.basePrice === 0 ? tPlans('freePlan') : tPlans('perMonth')}</div>
                      {isPaid && <div className="text-[11px] text-gray-500 mt-1">+ IVA</div>}
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-gray-700">
                    {p.featuresKeys.slice(0, 5).map((k) => (
                      <li key={k} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span>{tPlans(k)}</span>
                      </li>
                    ))}
                    {p.featuresKeys.length > 5 && (
                      <li className="text-xs text-gray-500">+ {p.featuresKeys.length - 5} más</li>
                    )}
                  </ul>
                </button>
              );
            })}
          </div>

          {checkoutFlag === 'cancel' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800">Pago cancelado. Puedes intentarlo de nuevo cuando quieras.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
              <select
                value={formData.selectedPlanId}
                onChange={(e) => {
                  const v = e.target.value as PlanId;
                  setFormData(prev => ({
                    ...prev,
                    selectedPlanId: v,
                    checkoutCompleted: v === 'free' ? true : false,
                    unitCount: v === 'free' ? 1 : prev.unitCount,
                  }));
                  loadPricing({ selectedPlanId: v });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="free">Básico (Gratis)</option>
                <option value="checkin">Check-in</option>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={formData.lodgingType}
                onChange={(e) => {
                  const v = e.target.value as LodgingType;
                  setFormData(prev => ({ ...prev, lodgingType: v }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hostal">Hostal (habitaciones)</option>
                <option value="apartamentos">Apartamentos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Facturación</label>
              <select
                value={formData.billingInterval}
                onChange={(e) => {
                  const v = e.target.value as BillingInterval;
                  setFormData(prev => ({ ...prev, billingInterval: v, checkoutCompleted: false }));
                  loadPricing({ billingInterval: v });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="month">Mensual</option>
                <option value="year">Anual (2 meses gratis)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidades ({formData.lodgingType === 'apartamentos' ? 'apartamentos' : 'habitaciones'})
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={formData.unitCount}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(500, parseInt(e.target.value || '1', 10)));
                  setFormData(prev => ({
                    ...prev,
                    unitCount: prev.selectedPlanId === 'free' ? 1 : n,
                    checkoutCompleted: prev.selectedPlanId === 'free' ? true : false,
                  }));
                  loadPricing({ unitCount: n });
                }}
                disabled={formData.selectedPlanId === 'free'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.selectedPlanId === 'free'
                  ? 'En Básico es 1 unidad.'
                  : ''}
              </p>
            </div>
          </div>

          <div className="mt-6">
            {pricingLoading && (
              <div className="text-sm text-gray-500">Calculando precio…</div>
            )}
            {formData.selectedPlanId !== 'free' && pricing && (
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal (sin IVA)</span>
                  <span>{Number(pricing.subtotal).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IVA ({pricing.vat?.vat_rate ?? pricing.vat?.vatRate ?? 21}%)</span>
                  <span>+{Number(pricing.vat?.vat_amount ?? pricing.vat?.vatAmount ?? 0).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>Total {formData.billingInterval === 'year' ? 'anual' : 'mensual'}</span>
                  <span className="text-blue-700">{Number(pricing.total).toFixed(2)}€</span>
                </div>
              </div>
            )}
            {formData.selectedPlanId === 'free' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-semibold">Plan Básico seleccionado (sin pago).</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-8">
            <button
              onClick={handlePrevious}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
            >
              Volver
            </button>

            <div className="flex flex-col sm:flex-row gap-3">
              {formData.selectedPlanId !== 'free' ? (
                formData.checkoutCompleted ? (
                  <button
                    type="button"
                    onClick={() => void handleNext()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    onClick={onPay}
                    disabled={creatingCheckout}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {creatingCheckout ? 'Iniciando pago…' : 'Pagar plan'}
                  </button>
                )
              ) : (
                <button
                  onClick={onPay}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Continuar
                </button>
              )}
            </div>
          </div>

          {formData.selectedPlanId !== 'free' && !formData.checkoutCompleted && (
            <p className="text-xs text-gray-500 mt-4">
              Si ya pagaste y aún no se refleja, espera unos segundos: el sistema confirma el pago vía webhook.
            </p>
          )}
        </div>
      </div>
    );
  }
}
