'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Copy, Share2, TrendingUp, Users, CheckCircle, XCircle, Gift, Calendar } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';

interface ReferralStats {
  totalReferrals: number;
  registeredCount: number;
  activeCheckinCount: number;
  activeProCount: number;
  cancelledCount: number;
  paidReferralsCount: number;
  referralCode: string;
  checkinCredits: number;
  proCredits: number;
}

interface ReferralItem {
  id: string;
  referredName: string;
  referredEmail: string;
  status: string;
  planType: string;
  registeredAt: string;
  firstPaidAt?: string;
  lastPaidAt?: string;
}

interface RewardItem {
  id: string;
  rewardType: string;
  reason: string;
  monthsGranted: number;
  status: string;
  grantedAt: string;
  appliedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export default function ReferralsPage() {
  const { tenant } = useTenant();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchReferrals();
    fetchRewards();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/referrals/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrals = async () => {
    try {
      const res = await fetch('/api/referrals/list');
      const data = await res.json();
      if (data.success) {
        setReferrals(data.data);
      }
    } catch (error) {
      console.error('Error obteniendo referidos:', error);
    }
  };

  const fetchRewards = async () => {
    try {
      const res = await fetch('/api/referrals/rewards');
      const data = await res.json();
      if (data.success) {
        setRewards(data.data);
      }
    } catch (error) {
      console.error('Error obteniendo recompensas:', error);
    }
  };

  const copyReferralLink = () => {
    if (!stats?.referralCode) return;
    
    const link = `https://delfincheckin.com/?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = async () => {
    if (!stats?.referralCode) return;
    
    const link = `https://delfincheckin.com/?ref=${stats.referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Únete a Delfín Check-in',
          text: 'Únete a Delfín Check-in usando mi enlace de referido',
          url: link,
        });
      } catch (error) {
        // Usuario canceló el compartir
      }
    } else {
      copyReferralLink();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">Registrado</span>;
      case 'active_checkin':
        return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">Activo Check-in</span>;
      case 'active_pro':
        return <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">Activo Pro</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">Cancelado</span>;
      case 'past_due':
        return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">Pago Fallido</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getPlanBadge = (planType: string) => {
    switch (planType) {
      case 'free':
        return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">Free</span>;
      case 'checkin':
        return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">Check-in</span>;
      case 'pro':
        return <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">Pro</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">{planType}</span>;
    }
  };

  const getMotivationalMessage = () => {
    if (!stats) return null;

    const registered = stats.registeredCount;
    const activeCheckin = stats.activeCheckinCount;
    const activePro = stats.activeProCount;

    if (registered < 5) {
      return `Te faltan ${5 - registered} referidos para conseguir 1 mes gratis de Plan Check-in`;
    }

    if (activeCheckin < 3) {
      return `Te faltan ${3 - activeCheckin} referidos activos en Check-in para conseguir 1 mes gratis de Plan Pro`;
    }

    if (activePro < 5) {
      return `Te faltan ${5 - activePro} referidos activos en Pro para conseguir 2 meses gratis de Plan Pro`;
    }

    return '¡Excelente trabajo! Sigue compartiendo tu enlace para conseguir más recompensas.';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-32 bg-gray-200 rounded mb-6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error cargando estadísticas de referidos</p>
          </div>
        </div>
      </div>
    );
  }

  const referralLink = `https://delfincheckin.com/?ref=${stats.referralCode}`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <UserPlus className="w-8 h-8 mr-3 text-blue-600" />
            Referidos
          </h1>
          <p className="text-gray-600 mt-2">Trae nuevos propietarios y consigue meses gratis</p>
        </div>

        {/* Enlace de Referido */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Share2 className="w-5 h-5 mr-2 text-blue-600" />
            Tu Enlace de Referido
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-sm break-all">
              {referralLink}
            </div>
            <button
              onClick={copyReferralLink}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={shareReferralLink}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Compartir
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Referidos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalReferrals}</p>
              </div>
              <Users className="w-12 h-12 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activos Check-in</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeCheckinCount}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activos Pro</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeProCount}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Créditos Acumulados */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-6 mb-6 border border-blue-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-purple-600" />
            Créditos Acumulados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Plan Check-in</p>
              <p className="text-2xl font-bold text-blue-600">{stats.checkinCredits} mes{stats.checkinCredits !== 1 ? 'es' : ''} gratis</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Plan Pro</p>
              <p className="text-2xl font-bold text-purple-600">{stats.proCredits} mes{stats.proCredits !== 1 ? 'es' : ''} gratis</p>
            </div>
          </div>
        </div>

        {/* Mensaje Motivador */}
        {getMotivationalMessage() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">{getMotivationalMessage()}</p>
          </div>
        )}

        {/* Historial de Recompensas */}
        {rewards.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Gift className="w-5 h-5 mr-2 text-purple-600" />
              Historial de Recompensas
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Recompensa</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Razón</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Meses</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward) => (
                    <tr key={reward.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">
                          {reward.rewardType === 'checkin_month' ? '1 mes Check-in' :
                           reward.rewardType === 'pro_month' ? '1 mes Pro' :
                           '2 meses Pro'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{reward.reason}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{reward.monthsGranted} mes{reward.monthsGranted !== 1 ? 'es' : ''}</td>
                      <td className="py-3 px-4">
                        {reward.status === 'applied' ? (
                          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">Aplicado</span>
                        ) : reward.status === 'revoked' ? (
                          <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">Revocado</span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">Pendiente</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(reward.grantedAt).toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lista de Referidos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-gray-700" />
            Mis Referidos
          </h2>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No tienes referidos todavía</p>
              <p className="text-sm mt-2">Comparte tu enlace para empezar a conseguir recompensas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nombre</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Registrado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Primer Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr key={referral.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{referral.referredName || 'Sin nombre'}</p>
                          <p className="text-sm text-gray-500">{referral.referredEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getPlanBadge(referral.planType)}</td>
                      <td className="py-3 px-4">{getStatusBadge(referral.status)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(referral.registeredAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {referral.firstPaidAt ? new Date(referral.firstPaidAt).toLocaleDateString('es-ES') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
