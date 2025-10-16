'use client';

import { useState } from 'react';
import { ArrowLeft, Mail, Key, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'code' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Función para enviar código de recuperación
  const handleSendRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!email.trim()) {
        setMessage({ type: 'error', text: 'Por favor, introduce tu email' });
        return;
      }

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.message || 'Error al enviar el código de recuperación' });
        return;
      }

      setMessage({ type: 'success', text: `Código de recuperación enviado a ${email}` });
      setStep('code');

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al enviar el código de recuperación' });
    } finally {
      setLoading(false);
    }
  };

  // Función para verificar código de recuperación
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (recoveryCode.length !== 6) {
        setMessage({ type: 'error', text: 'El código debe tener 6 dígitos' });
        return;
      }

      const response = await fetch('/api/auth/verify-recovery-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          recoveryCode: recoveryCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.message || 'Código de recuperación incorrecto' });
        return;
      }

      setMessage({ type: 'success', text: 'Código verificado correctamente' });
      setStep('reset');

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al verificar el código' });
    } finally {
      setLoading(false);
    }
  };

  // Función para restablecer contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!newPassword || !confirmPassword) {
        setMessage({ type: 'error', text: 'Todos los campos son obligatorios' });
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
        return;
      }

      if (newPassword.length < 8) {
        setMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres' });
        return;
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          recoveryCode: recoveryCode,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.message || 'Error al restablecer la contraseña' });
        return;
      }

      setMessage({ type: 'success', text: 'Contraseña restablecida exitosamente. Redirigiendo al login...' });
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 2000);

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al restablecer la contraseña' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Key className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {step === 'email' && '¿Olvidaste tu contraseña?'}
          {step === 'code' && 'Verificar código'}
          {step === 'reset' && 'Nueva contraseña'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 'email' && 'Introduce tu email para recibir un código de recuperación'}
          {step === 'code' && 'Introduce el código de 6 dígitos enviado a tu email'}
          {step === 'reset' && 'Crea una nueva contraseña para tu cuenta'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* Botón de volver */}
          <div className="mb-6">
            <Link 
              href="/admin/login" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver al login
            </Link>
          </div>

          {/* Mensaje de estado */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-md flex items-center ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              {message.text}
            </div>
          )}

          {/* Paso 1: Solicitar email */}
          {step === 'email' && (
            <form onSubmit={handleSendRecoveryCode} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando...' : 'Enviar código de recuperación'}
                </button>
              </div>
            </form>
          )}

          {/* Paso 2: Verificar código */}
          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label htmlFor="recoveryCode" className="block text-sm font-medium text-gray-700">
                  Código de recuperación
                </label>
                <div className="mt-1">
                  <input
                    id="recoveryCode"
                    name="recoveryCode"
                    type="text"
                    required
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest"
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Código enviado a: <strong>{email}</strong>
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || recoveryCode.length !== 6}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verificando...' : 'Verificar código'}
                </button>
              </div>
            </form>
          )}

          {/* Paso 3: Nueva contraseña */}
          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  Nueva contraseña
                </label>
                <div className="mt-1">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar nueva contraseña
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
                </button>
              </div>
            </form>
          )}

          {/* Información adicional */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">¿Recordaste tu contraseña?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/admin/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Volver al login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
