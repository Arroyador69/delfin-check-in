'use client';

import { useState, useEffect } from 'react';
import { User, Shield } from 'lucide-react';

export default function AccountPage() {
  const [loading, setLoading] = useState(false);
  
  // Estados para la gestión de cuenta
  const [accountData, setAccountData] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    recoveryEmail: ''
  });

  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Cargar datos de cuenta al montar el componente
  useEffect(() => {
    const loadAccountData = async () => {
      try {
        // Cargar datos del usuario autenticado desde la API
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setAccountData(prev => ({
            ...prev,
            username: userData.username || 'admin',
            recoveryEmail: userData.recoveryEmail || ''
          }));
        } else {
          // Fallback a localStorage si la API falla
          const savedUsername = localStorage.getItem('admin_username') || 'admin';
          const savedRecoveryEmail = localStorage.getItem('recovery_email') || '';
          
          setAccountData(prev => ({
            ...prev,
            username: savedUsername,
            recoveryEmail: savedRecoveryEmail
          }));
        }
      } catch (error) {
        console.error('Error cargando datos de cuenta:', error);
        // Fallback a localStorage
        const savedUsername = localStorage.getItem('admin_username') || 'admin';
        const savedRecoveryEmail = localStorage.getItem('recovery_email') || '';
        
        setAccountData(prev => ({
          ...prev,
          username: savedUsername,
          recoveryEmail: savedRecoveryEmail
        }));
      }
    };
    
    loadAccountData();
  }, []);

  // Función para cambiar contraseña
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Validaciones
      if (!accountData.currentPassword || !accountData.newPassword || !accountData.confirmPassword) {
        setMessage({ type: 'error', text: 'Todos los campos son obligatorios' });
        return;
      }

      if (accountData.newPassword !== accountData.confirmPassword) {
        setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
        return;
      }

      if (accountData.newPassword.length < 8) {
        setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres' });
        return;
      }

      // Llamar a la API para cambiar la contraseña
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: accountData.currentPassword,
          newPassword: accountData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.message || 'Error al cambiar la contraseña' });
        return;
      }

      // Mostrar mensaje de éxito
      setMessage({ 
        type: 'success', 
        text: 'Contraseña actualizada exitosamente en la base de datos' 
      });
      
      // Limpiar formulario
      setAccountData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cambiar la contraseña' });
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Función para cambiar nombre de usuario
  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!accountData.username.trim()) {
        setMessage({ type: 'error', text: 'El nombre de usuario no puede estar vacío' });
        return;
      }

      // Llamar a la API para cambiar el nombre de usuario
      const response = await fetch('/api/auth/change-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          newUsername: accountData.username.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.message || 'Error al cambiar el nombre de usuario' });
        return;
      }

      // Guardar también en localStorage como fallback
      localStorage.setItem('admin_username', accountData.username.trim());
      
      setMessage({ type: 'success', text: 'Nombre de usuario actualizado exitosamente en la base de datos' });

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el nombre de usuario' });
    } finally {
      setLoading(false);
    }
  };

  // Función para enviar código de recuperación
  const handleSendRecoveryCode = async () => {
    setRecoveryLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!accountData.recoveryEmail.trim()) {
        setMessage({ type: 'error', text: 'Por favor, introduce un email de recuperación' });
        return;
      }

      // Llamar a la API para enviar código de recuperación
      const response = await fetch('/api/auth/send-recovery-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          recoveryEmail: accountData.recoveryEmail.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.message || 'Error al enviar el código de recuperación' });
        return;
      }

      // Guardar email en localStorage como fallback
      localStorage.setItem('recovery_email', accountData.recoveryEmail.trim());
      
      // Mostrar mensaje de éxito
      let successMessage = `Código de recuperación enviado a ${accountData.recoveryEmail}`;
      
      // En desarrollo, mostrar el código (REMOVER EN PRODUCCIÓN)
      if (data.developmentCode) {
        successMessage += `. Código: ${data.developmentCode} (solo para desarrollo)`;
      }
      
      setMessage({ type: 'success', text: successMessage });
      setShowRecoveryForm(true);

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al enviar el código de recuperación' });
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Función para verificar código de recuperación
  const handleVerifyRecoveryCode = async () => {
    setRecoveryLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Llamar a la API para verificar código de recuperación
      const response = await fetch('/api/auth/send-recovery-code', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          recoveryCode: recoveryCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.message || 'Código de recuperación incorrecto' });
        return;
      }

      // Código correcto - permitir cambio de contraseña
      setMessage({ type: 'success', text: 'Código verificado correctamente. Puedes cambiar tu contraseña.' });
      setShowRecoveryForm(false);
      
      // Limpiar código del formulario
      setRecoveryCode('');

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al verificar el código' });
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Gestión de Cuenta</h3>
      
      {/* Mensaje de estado */}
      {message.text && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Cambio de nombre de usuario */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Cambiar Nombre de Usuario</h4>
        <form onSubmit={handleUsernameChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre de Usuario
            </label>
            <input
              type="text"
              value={accountData.username}
              onChange={(e) => setAccountData(prev => ({ ...prev, username: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : 'Actualizar Usuario'}
          </button>
        </form>
      </div>

      {/* Cambio de contraseña */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Cambiar Contraseña</h4>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contraseña Actual
            </label>
            <input
              type="password"
              value={accountData.currentPassword}
              onChange={(e) => setAccountData(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Contraseña actual"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nueva Contraseña
            </label>
            <input
              type="password"
              value={accountData.newPassword}
              onChange={(e) => setAccountData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={accountData.confirmPassword}
              onChange={(e) => setAccountData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirmar nueva contraseña"
              required
            />
          </div>
          <button
            type="submit"
            disabled={passwordChangeLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passwordChangeLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>

      {/* Email de recuperación */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Email de Recuperación</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email de Recuperación
            </label>
            <input
              type="email"
              value={accountData.recoveryEmail}
              onChange={(e) => setAccountData(prev => ({ ...prev, recoveryEmail: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="tu@email.com"
            />
            <p className="mt-1 text-sm text-gray-500">
              Usa este email para recuperar tu cuenta si olvidas la contraseña
            </p>
          </div>
          <button
            onClick={handleSendRecoveryCode}
            disabled={recoveryLoading || !accountData.recoveryEmail.trim()}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {recoveryLoading ? 'Enviando...' : 'Enviar Código de Recuperación'}
          </button>
        </div>
      </div>

      {/* Formulario de verificación de código */}
      {showRecoveryForm && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-yellow-800 mb-4">Verificar Código de Recuperación</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-yellow-700">
                Código de Verificación
              </label>
              <input
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                className="mt-1 block w-full border-yellow-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="123456"
                maxLength={6}
              />
              <p className="mt-1 text-sm text-yellow-600">
                Ingresa el código de 6 dígitos que se envió a tu email
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleVerifyRecoveryCode}
                disabled={recoveryLoading || recoveryCode.length !== 6}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {recoveryLoading ? 'Verificando...' : 'Verificar Código'}
              </button>
              <button
                onClick={() => setShowRecoveryForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Información de seguridad */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Información de Seguridad
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>• Las contraseñas se almacenan de forma segura</p>
              <p>• El email de recuperación te permitirá restablecer tu contraseña</p>
              <p>• Mantén tu información de contacto actualizada</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
