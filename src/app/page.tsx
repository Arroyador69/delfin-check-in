import Link from 'next/link';
import { CalendarDays, Users, Home, Settings, BarChart3, MessageSquare } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">🐬</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delfín Check-in</h1>
                <p className="text-sm text-gray-600">Gestión inteligente de habitaciones</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700">
                <Settings className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Habitaciones</p>
                <p className="text-2xl font-bold text-gray-900">6</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Huéspedes Hoy</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CalendarDays className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reservas Activas</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ocupación</p>
                <p className="text-2xl font-bold text-gray-900">85%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/rooms" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Gestionar Habitaciones
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Configura URLs de iCal y precios
                  </p>
                </div>
                <Home className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/reservations" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Ver Reservas
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Calendario y gestión de reservas
                  </p>
                </div>
                <CalendarDays className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/checkin" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Check-in Digital
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Formularios para huéspedes
                  </p>
                </div>
                <Users className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/guest-registration" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Registro Oficial España
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Cumplimiento Ley 4/2015
                  </p>
                </div>
                <div className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors">
                  🇪🇸
                </div>
              </div>
            </div>
          </Link>

          <Link href="/messages" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Mensajes Automáticos
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Plantillas y automatizaciones
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/cleaning" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Tareas de Limpieza
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Gestión de limpieza y mantenimiento
                  </p>
                </div>
                <div className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors">
                  🧹
                </div>
              </div>
            </div>
          </Link>

          <Link href="/pricing" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Precios Dinámicos
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Reglas y optimización de precios
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Nueva reserva confirmada - Habitación 3</p>
                  <p className="text-xs text-gray-500">Hace 5 minutos</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Check-in completado - María García</p>
                  <p className="text-xs text-gray-500">Hace 1 hora</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Limpieza pendiente - Habitación 1</p>
                  <p className="text-xs text-gray-500">Hace 2 horas</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Sincronización iCal completada</p>
                  <p className="text-xs text-gray-500">Hace 3 horas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
