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
    confirmPassword: ''
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
            username: userData.username || 'admin'
          }));
        } else {
          // Fallback a localStorage si la API falla
          const savedUsername = localStorage.getItem('admin_username') || 'admin';
          
          setAccountData(prev => ({
            ...prev,
            username: savedUsername
          }));
        }
      } catch (error) {
        console.error('Error cargando datos de cuenta:', error);
        // Fallback a localStorage
        const savedUsername = localStorage.getItem('admin_username') || 'admin';
        
        setAccountData(prev => ({
          ...prev,
          username: savedUsername
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
            <User className="mr-3 h-8 w-8 text-blue-600" />
            Gestión de Cuenta
          </h3>
        </div>
        
        {/* Mensaje de estado */}
        {message.text && (
          <div className={`p-4 rounded-xl shadow-lg transition-all duration-300 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Cambio de nombre de usuario */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <User className="mr-3 h-6 w-6 text-blue-600" />
            Cambiar Nombre de Usuario
          </h4>
          <form onSubmit={handleUsernameChange} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Nombre de Usuario
              </label>
              <input
                type="text"
                value={accountData.username}
                onChange={(e) => setAccountData(prev => ({ ...prev, username: e.target.value }))}
                className="mt-1 block w-full border-2 border-gray-200 rounded-xl p-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder="admin"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              {loading ? '⏳ Guardando...' : '💾 Actualizar Usuario'}
            </button>
          </form>
        </div>

        {/* Cambio de contraseña */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Shield className="mr-3 h-6 w-6 text-blue-600" />
            Cambiar Contraseña
          </h4>
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Contraseña Actual
              </label>
              <input
                type="password"
                value={accountData.currentPassword}
                onChange={(e) => setAccountData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="mt-1 block w-full border-2 border-gray-200 rounded-xl p-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder="Contraseña actual"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={accountData.newPassword}
                onChange={(e) => setAccountData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="mt-1 block w-full border-2 border-gray-200 rounded-xl p-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                value={accountData.confirmPassword}
                onChange={(e) => setAccountData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="mt-1 block w-full border-2 border-gray-200 rounded-xl p-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder="Confirmar nueva contraseña"
                required
              />
            </div>
            <button
              type="submit"
              disabled={passwordChangeLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              {passwordChangeLoading ? '⏳ Cambiando...' : '🔐 Cambiar Contraseña'}
            </button>
          </form>
        </div>



        {/* Información de seguridad */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-lg transition-all duration-500 hover:shadow-xl hover:scale-[1.02]">
          <div className="flex">
            <div className="flex-shrink-0">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                🔒 Información de Seguridad
              </h3>
              <div className="text-sm text-blue-700 space-y-2">
                <p className="flex items-center">
                  <span className="mr-2">✅</span> Las contraseñas se almacenan de forma segura
                </p>
                <p className="flex items-center">
                  <span className="mr-2">✅</span> El email de recuperación te permitirá restablecer tu contraseña
                </p>
                <p className="flex items-center">
                  <span className="mr-2">✅</span> Mantén tu información de contacto actualizada
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
