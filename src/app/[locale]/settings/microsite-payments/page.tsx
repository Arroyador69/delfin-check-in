'use client';

import { useState, useEffect } from 'react';
import { Wallet, Plus, CheckCircle, XCircle, Download, CreditCard, Calendar, AlertCircle } from 'lucide-react';

interface BankAccount {
  id: number;
  iban: string;
  bank_name: string;
  account_holder_name: string;
  is_verified: boolean;
  verification_status: string;
  is_default: boolean;
  created_at: string;
}

interface Payment {
  reservation_code: string;
  check_in_date: string;
  check_out_date: string;
  property_owner_amount: number;
  delfin_commission_amount: number;
  stripe_fee_amount: number;
  total_amount: number;
  status: string;
  transfer_id?: string;
  processed_at?: string;
}

export default function MicrositePaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showAddBank, setShowAddBank] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newAccount, setNewAccount] = useState({
    iban: '',
    bank_name: '',
    account_holder_name: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar cuentas bancarias y pagos en paralelo
      const [accountsRes, paymentsRes] = await Promise.all([
        fetch('/api/tenant/bank-accounts'),
        fetch('/api/admin/payouts/history')
      ]);

      const accountsData = await accountsRes.json();
      const paymentsData = await paymentsRes.json();

      if (accountsData.success) {
        setBankAccounts(accountsData.bank_accounts || []);
      }

      if (paymentsData.success) {
        setPayments(paymentsData.payments || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setMessage({ type: 'error', text: 'Error cargando datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/tenant/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount)
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Cuenta bancaria añadida correctamente. Stripe verificará la cuenta en breve.' });
        setShowAddBank(false);
        setNewAccount({ iban: '', bank_name: '', account_holder_name: '' });
        loadData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error añadiendo cuenta bancaria' });
      }
    } catch (error) {
      console.error('Error añadiendo cuenta:', error);
      setMessage({ type: 'error', text: 'Error añadiendo cuenta bancaria' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBankAccount = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cuenta bancaria?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tenant/bank-accounts?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Cuenta bancaria eliminada correctamente' });
        loadData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error eliminando cuenta' });
      }
    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      setMessage({ type: 'error', text: 'Error eliminando cuenta bancaria' });
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await fetch('/api/admin/payouts/download-report');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pagos_microsite_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setMessage({ type: 'error', text: 'Error generando reporte' });
      }
    } catch (error) {
      console.error('Error descargando reporte:', error);
      setMessage({ type: 'error', text: 'Error descargando reporte' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Wallet className="w-6 h-6 mr-2 text-blue-600" />
            Pagos Microsite
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona tu cuenta bancaria para recibir pagos automáticos
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Cuentas Bancarias */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Cuentas Bancarias</h3>
          <button
            onClick={() => setShowAddBank(!showAddBank)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Añadir cuenta
          </button>
        </div>

        {/* Formulario para añadir cuenta */}
        {showAddBank && (
          <form onSubmit={handleAddBankAccount} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN *
                </label>
                <input
                  type="text"
                  required
                  value={newAccount.iban}
                  onChange={(e) => setNewAccount({ ...newAccount, iban: e.target.value.toUpperCase() })}
                  placeholder="ES91 2100 0418 4502 0005 1332"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del titular *
                </label>
                <input
                  type="text"
                  required
                  value={newAccount.account_holder_name}
                  onChange={(e) => setNewAccount({ ...newAccount, account_holder_name: e.target.value })}
                  placeholder="Juan Pérez García"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del banco
                </label>
                <input
                  type="text"
                  value={newAccount.bank_name}
                  onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                  placeholder="Banco Santander"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar cuenta'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddBank(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Lista de cuentas */}
        {bankAccounts.length > 0 ? (
          <div className="space-y-3">
            {bankAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">{account.account_holder_name}</p>
                      <p className="text-sm text-gray-600">IBAN: {account.iban}</p>
                      {account.bank_name && (
                        <p className="text-sm text-gray-600">{account.bank_name}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    {account.verification_status === 'verified' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verificada
                      </span>
                    ) : account.verification_status === 'pending' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Pendiente
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Fallida
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteBankAccount(account.id)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No hay cuentas bancarias registradas</p>
            <p className="text-sm">Añade una cuenta para recibir pagos automáticos</p>
          </div>
        )}
      </div>

      {/* Historial de Pagos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Historial de Pagos</h3>
          <button
            onClick={handleDownloadReport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar Reporte
          </button>
        </div>

        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código Reserva</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fechas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Reserva</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comisión Stripe</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comisión Delfin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago Recibido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {payment.reservation_code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{formatDate(payment.check_in_date)}</div>
                      <div className="text-xs text-gray-500">{formatDate(payment.check_out_date)}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {formatCurrency(payment.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600">
                      -{formatCurrency(payment.stripe_fee_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-orange-600">
                      -{formatCurrency(payment.delfin_commission_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 font-semibold">
                      +{formatCurrency(payment.property_owner_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.status === 'completed' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Pagado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Calendar className="w-3 h-3 mr-1" />
                          Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No hay pagos registrados aún</p>
          </div>
        )}

        {/* Resumen */}
        {payments.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Reservas</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(payments.reduce((sum, p) => sum + p.total_amount, 0))}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Comisiones Delfin</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(payments.reduce((sum, p) => sum + p.delfin_commission_amount, 0))}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Recibido</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(payments.reduce((sum, p) => sum + p.property_owner_amount, 0))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Información importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Los pagos se procesan automáticamente el día del check-in de cada reserva</li>
              <li>La comisión de Stripe (1.65€) se deduce del total antes de aplicar tu 9%</li>
              <li>Las transferencias a cuentas bancarias europeas son gratuitas</li>
              <li>Puedes descargar un reporte completo para declaraciones fiscales</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

