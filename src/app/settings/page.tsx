'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Database, Bot, Bell, Shield, Globe } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'database', name: 'Base de Datos', icon: Database },
    { id: 'telegram', name: 'Telegram Bot', icon: Bot },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
    { id: 'security', name: 'Seguridad', icon: Shield },
    { id: 'integrations', name: 'Integraciones', icon: Globe },
  ];

  const handleSaveSettings = async () => {
    setLoading(true);
    // Aquí iría la lógica para guardar configuraciones
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600 mt-2">Gestiona la configuración de tu aplicación</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
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

            {activeTab === 'database' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Configuración de Base de Datos</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Database className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Base de Datos PostgreSQL
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>Estado: <span className="font-medium text-green-600">Conectado</span></p>
                        <p>Proveedor: Supabase</p>
                        <p>Región: Europa Occidental</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      URL de Supabase
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://your-project.supabase.co"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Clave Anónima
                    </label>
                    <input
                      type="password"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="tu-clave-anonima"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'telegram' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Configuración de Telegram Bot</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Bot className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Bot de Telegram
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Estado: <span className="font-medium text-red-600">No configurado</span></p>
                        <p>Configura tu bot para recibir notificaciones automáticas</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Token del Bot
                    </label>
                    <input
                      type="password"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Chat ID
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123456789"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Configuración de Notificaciones</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Nuevas reservas</h4>
                      <p className="text-sm text-gray-500">Recibe notificaciones cuando se confirme una nueva reserva</p>
                    </div>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm">
                      Activado
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Check-ins pendientes</h4>
                      <p className="text-sm text-gray-500">Notificaciones 24h antes del check-in</p>
                    </div>
                    <button className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm">
                      Desactivado
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Limpieza</h4>
                      <p className="text-sm text-gray-500">Notificaciones sobre tareas de limpieza</p>
                    </div>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm">
                      Activado
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Configuración de Seguridad</h3>
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Shield className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Seguridad
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Estado: <span className="font-medium text-green-600">Seguro</span></p>
                        <p>Todas las conexiones están cifradas con SSL/TLS</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Autenticación de dos factores</h4>
                      <p className="text-sm text-gray-500">Añade una capa extra de seguridad</p>
                    </div>
                    <button className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm">
                      Configurar
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Sesiones activas</h4>
                      <p className="text-sm text-gray-500">Gestiona las sesiones abiertas</p>
                    </div>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm">
                      Ver sesiones
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Integraciones</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                          <span className="text-pink-600 font-bold">A</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">Airbnb</h4>
                        <p className="text-sm text-gray-500">Sincronización de calendarios</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button className="bg-green-600 text-white px-3 py-1 rounded-md text-sm">
                        Conectado
                      </button>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold">B</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">Booking.com</h4>
                        <p className="text-sm text-gray-500">Sincronización de calendarios</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm">
                        Conectar
                      </button>
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
