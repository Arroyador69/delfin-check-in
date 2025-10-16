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

  // Función para guardar email de recuperación
  const handleSaveRecoveryEmail = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!accountData.recoveryEmail.trim()) {
        setMessage({ type: 'error', text: 'Por favor, introduce un email de recuperación' });
        return;
      }

      // Llamar a la API para actualizar el email de recuperación
      const response = await fetch('/api/auth/update-recovery-email', {
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
        setMessage({ type: 'error', text: data.message || 'Error al actualizar el email de recuperación' });
        return;
      }

      // Guardar también en localStorage como fallback
      localStorage.setItem('recovery_email', accountData.recoveryEmail.trim());
      
      setMessage({ type: 'success', text: 'Email de recuperación actualizado exitosamente' });

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el email de recuperación' });
    } finally {
      setLoading(false);
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
              Este email se usará para enviarte códigos de recuperación cuando olvides tu contraseña
            </p>
          </div>
          <button
            onClick={handleSaveRecoveryEmail}
            disabled={loading || !accountData.recoveryEmail.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : 'Guardar Email de Recuperación'}
          </button>
        </div>
      </div>


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
