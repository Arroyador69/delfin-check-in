'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Loader2, Search, Download } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

interface TenantFinancials {
  tenant_id: string;
  tenant_name: string;
  tenant_email: string;
  plan_type: string;
  total_revenue: number;
  total_costs: number;
  balance: number;
  subscription_revenue: number;
  commission_revenue: number;
  stripe_fee_costs: number;
  refund_costs: number;
  other_costs: number;
  is_profitable: boolean;
}

export default function TenantCostsPage() {
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState<TenantFinancials[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'balance' | 'revenue' | 'costs'>('balance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [error, setError] = useState('');

  useEffect(() => {
    loadFinancials();
  }, []);

  const loadFinancials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/superadmin/tenant-financials');
      const data = await response.json();

      if (data.success) {
        setFinancials(data.financials || []);
      } else {
        setError(data.error || 'Error cargando datos financieros');
      }
    } catch (err: any) {
      console.error('Error cargando datos financieros:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar
  const filteredFinancials = financials
    .filter(tenant => 
      tenant.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.tenant_email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      switch (sortBy) {
        case 'balance':
          aValue = a.balance;
          bValue = b.balance;
          break;
        case 'revenue':
          aValue = a.total_revenue;
          bValue = b.total_revenue;
          break;
        case 'costs':
          aValue = a.total_costs;
          bValue = b.total_costs;
          break;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  // Totales globales
  const totals = financials.reduce((acc, tenant) => ({
    revenue: acc.revenue + tenant.total_revenue,
    costs: acc.costs + tenant.total_costs,
    balance: acc.balance + tenant.balance,
  }), { revenue: 0, costs: 0, balance: 0 });

  // Tenants no rentables
  const unprofitableTenants = financials.filter(t => !t.is_profitable);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gastos vs Ingresos por Tenant
          </h1>
          <p className="text-gray-600">
            Análisis financiero detallado de cada tenant para control de rentabilidad
          </p>
        </div>

        {/* KPIs Globales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {totals.revenue.toFixed(2)}€
                </p>
              </div>
              <TrendingUp className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gastos Totales</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {totals.costs.toFixed(2)}€
                </p>
              </div>
              <TrendingDown className="text-red-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Balance Neto</p>
                <p className={`text-2xl font-bold mt-1 ${
                  totals.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {totals.balance.toFixed(2)}€
                </p>
              </div>
              <DollarSign className={totals.balance >= 0 ? 'text-green-600' : 'text-red-600'} size={32} />
            </div>
          </div>
        </div>

        {/* Alertas */}
        {unprofitableTenants.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-600" size={20} />
              <p className="text-yellow-800 font-semibold">
                {unprofitableTenants.length} tenant{unprofitableTenants.length > 1 ? 's' : ''} con gastos mayores que ingresos
              </p>
            </div>
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="balance">Ordenar por Balance</option>
                <option value="revenue">Ordenar por Ingresos</option>
                <option value="costs">Ordenar por Gastos</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de tenants */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gastos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFinancials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'No se encontraron tenants' : 'No hay datos financieros disponibles'}
                    </td>
                  </tr>
                ) : (
                  filteredFinancials.map((tenant) => (
                    <tr key={tenant.tenant_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.tenant_name || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {tenant.tenant_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          tenant.plan_type === 'pro' ? 'bg-purple-100 text-purple-800' :
                          tenant.plan_type === 'standard' ? 'bg-amber-100 text-amber-800' :
                          tenant.plan_type === 'checkin' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {tenant.plan_type === 'pro' ? 'Pro' :
                           tenant.plan_type === 'standard' ? 'Standard' :
                           tenant.plan_type === 'checkin' ? 'Check-in' :
                           'Gratis'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {tenant.total_revenue.toFixed(2)}€
                        </div>
                        <div className="text-xs text-gray-500">
                          Susc: {tenant.subscription_revenue.toFixed(2)}€ | 
                          Com: {tenant.commission_revenue.toFixed(2)}€
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-red-600">
                          {tenant.total_costs.toFixed(2)}€
                        </div>
                        <div className="text-xs text-gray-500">
                          Stripe: {tenant.stripe_fee_costs.toFixed(2)}€ | 
                          Reemb: {tenant.refund_costs.toFixed(2)}€
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-bold ${
                          tenant.balance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tenant.balance >= 0 ? '+' : ''}{tenant.balance.toFixed(2)}€
                        </div>
                        <div className="text-xs text-gray-500">
                          {tenant.balance >= 0 ? 'Rentable' : 'Pérdida'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {tenant.is_profitable ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Rentable
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ⚠ No rentable
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botón exportar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              // TODO: Implementar exportación a CSV
              alert('Exportación a CSV próximamente');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download size={18} />
            Exportar a CSV
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

