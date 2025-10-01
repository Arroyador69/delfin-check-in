'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, User, Shield } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  
  // Estados para la gestión de cuenta
  const [accountData, setAccountData] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    recoveryEmail: ''
  });

  // Estados para identificación XML MIR
  const [mirData, setMirData] = useState({
    personalId: '',
    accommodationId: ''
  });

  // Estados para configuración de habitaciones/apartamentos
  const [roomsConfig, setRoomsConfig] = useState([
    { id: 1, name: 'Habitación 1' },
    { id: 2, name: 'Habitación 2' },
    { id: 3, name: 'Habitación 3' },
    { id: 4, name: 'Habitación 4' },
    { id: 5, name: 'Habitación 5' },
    { id: 6, name: 'Habitación 6' }
  ]);
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'account', name: 'Cuenta', icon: User },
  ];

  const handleSaveSettings = async () => {
    setLoading(true);
    // Aquí iría la lógica para guardar configuraciones
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  // Cargar datos de cuenta al montar el componente
  useEffect(() => {
    const loadAccountData = async () => {
      try {
        // Cargar datos desde localStorage o API
        const savedUsername = localStorage.getItem('admin_username') || 'admin';
        const savedRecoveryEmail = localStorage.getItem('recovery_email') || '';
        const savedPersonalId = localStorage.getItem('mir_personal_id') || '';
        const savedAccommodationId = localStorage.getItem('mir_accommodation_id') || '';
        const savedRoomsConfig = localStorage.getItem('rooms_config');
        
        setAccountData(prev => ({
          ...prev,
          username: savedUsername,
          recoveryEmail: savedRecoveryEmail
        }));

        setMirData(prev => ({
          ...prev,
          personalId: savedPersonalId,
          accommodationId: savedAccommodationId
        }));

        if (savedRoomsConfig) {
          setRoomsConfig(JSON.parse(savedRoomsConfig));
        }
      } catch (error) {
        console.error('Error cargando datos de cuenta:', error);
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

      if (accountData.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
        return;
      }

      // Verificar contraseña actual (simulado)
      const currentStoredPassword = localStorage.getItem('admin_password') || 'Cuaderno2314';
      if (accountData.currentPassword !== currentStoredPassword) {
        setMessage({ type: 'error', text: 'La contraseña actual es incorrecta' });
        return;
      }

      // Guardar nueva contraseña
      localStorage.setItem('admin_password', accountData.newPassword);
      
      setMessage({ type: 'success', text: 'Contraseña cambiada exitosamente' });
      
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

      // Guardar nuevo nombre de usuario
      localStorage.setItem('admin_username', accountData.username.trim());
      
      setMessage({ type: 'success', text: 'Nombre de usuario actualizado exitosamente' });

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

      // Simular envío de código (en producción sería una API real)
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem('recovery_code', code);
      localStorage.setItem('recovery_email', accountData.recoveryEmail);
      
      // Simular delay de envío
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMessage({ type: 'success', text: `Código de recuperación enviado a ${accountData.recoveryEmail}. Código: ${code} (solo para desarrollo)` });
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
      const storedCode = localStorage.getItem('recovery_code');
      
      if (!storedCode || recoveryCode !== storedCode) {
        setMessage({ type: 'error', text: 'Código de recuperación incorrecto' });
        return;
      }

      // Código correcto - permitir cambio de contraseña
      setMessage({ type: 'success', text: 'Código verificado. Puedes cambiar tu contraseña.' });
      setShowRecoveryForm(false);
      
      // Limpiar código usado
      localStorage.removeItem('recovery_code');

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al verificar el código' });
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Función para guardar datos MIR
  const handleMirDataChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!mirData.personalId.trim() || !mirData.accommodationId.trim()) {
        setMessage({ type: 'error', text: 'Ambos campos son obligatorios' });
        return;
      }

      // Guardar datos MIR en localStorage
      localStorage.setItem('mir_personal_id', mirData.personalId.trim());
      localStorage.setItem('mir_accommodation_id', mirData.accommodationId.trim());
      
      setMessage({ type: 'success', text: 'Datos de identificación MIR guardados exitosamente' });

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar los datos MIR' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header compacto */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración</h1>
              <p className="text-sm text-gray-600">Gestiona la configuración de tu aplicación</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className="bg-white rounded-lg shadow transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex justify-center space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Configuración General</h3>
                
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

                {/* Identificación XML MIR */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">🔐 Identificación para XML MIR</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Configura tu número único personal y el de tu alojamiento del sistema de hospedaje del Ministerio del Interior para la exportación XML MIR.
                  </p>
                  <form onSubmit={handleMirDataChange} className="space-y-4">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Número Único Personal
                        </label>
                        <input
                          type="text"
                          value={mirData.personalId}
                          onChange={(e) => setMirData(prev => ({ ...prev, personalId: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="123456789"
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Tu número único del sistema de hospedaje del Ministerio del Interior
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Número Único del Alojamiento
                        </label>
                        <input
                          type="text"
                          value={mirData.accommodationId}
                          onChange={(e) => setMirData(prev => ({ ...prev, accommodationId: e.target.value }))}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="987654321"
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Número único de tu casa, hotel o alojamiento en el sistema MIR
                        </p>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Guardando...' : 'Guardar Identificación MIR'}
                    </button>
                  </form>
                </div>

                {/* Configuración de Habitaciones/Apartamentos */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">🏨 Habitaciones/Apartamentos</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Configura los nombres de tus habitaciones o apartamentos. Estos nombres aparecerán en el dashboard y al crear nuevas reservas.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roomsConfig.map((room, index) => (
                      <div key={room.id} className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={room.name}
                            onChange={(e) => setRoomsConfig(prev => 
                              prev.map(r => r.id === room.id ? { ...r, name: e.target.value } : r)
                            )}
                            placeholder={`Habitación ${index + 1}`}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        {roomsConfig.length > 1 && (
                          <button
                            onClick={() => setRoomsConfig(prev => prev.filter(r => r.id !== room.id))}
                            className="flex-shrink-0 text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={() => {
                        const newId = Math.max(...roomsConfig.map(r => r.id), 0) + 1;
                        setRoomsConfig([...roomsConfig, { id: newId, name: `Habitación ${newId}` }]);
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Añadir Habitación</span>
                    </button>
                    <button
                      onClick={() => {
                        localStorage.setItem('rooms_config', JSON.stringify(roomsConfig));
                        setMessage({ type: 'success', text: 'Configuración de habitaciones guardada exitosamente' });
                        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Guardar Configuración</span>
                    </button>
                  </div>
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700">
                      💡 <strong>Nota:</strong> Los nombres que configures aquí aparecerán en todo el sistema: dashboard, creación de reservas, calendarios, etc.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nombre de la Propiedad
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Mi Casa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Zona Horaria
                    </label>
                    <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                      <option>Europe/Madrid</option>
                      <option>UTC</option>
                      <option>America/New_York</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Idioma
                    </label>
                    <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                      <option>Español</option>
                      <option>English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Moneda
                    </label>
                    <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                      <option>EUR (€)</option>
                      <option>USD ($)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
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
            )}

            {/* Save button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
