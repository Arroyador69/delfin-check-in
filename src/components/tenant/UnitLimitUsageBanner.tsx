'use client';

import Link from 'next/link';
import { useTenant } from '@/hooks/useTenant';

type Props = {
  /** Ruta de mejora de plan (con locale si aplica), ej. /es/upgrade-plan */
  upgradeHref?: string;
  className?: string;
};

/**
 * Uso de habitaciones según /api/tenant (limits.limit_message + resumen).
 */
export function UnitLimitUsageBanner({ upgradeHref = '/upgrade-plan', className = '' }: Props) {
  const { tenant, limits, loading } = useTenant();

  if (loading || !tenant || !limits) return null;

  const used = tenant.current_rooms ?? 0;
  const max = tenant.max_rooms;
  const unlimited = max === -1 || max === undefined;

  const summary = unlimited ? (
    <p className="text-sm text-slate-700">
      <span className="font-semibold">Unidades en uso:</span> {used}
      {tenant.plan_type === 'checkin' && (
        <span className="text-slate-600">
          {' '}
          · Plan Check-in: puedes añadir más unidades (facturación por propiedad según tu plan).
        </span>
      )}
    </p>
  ) : (
    <p className="text-sm text-slate-700">
      <span className="font-semibold">Habitaciones / unidades:</span> {used} de {max} según tu plan
      {limits.rooms_remaining >= 0 && (
        <span className="text-slate-600"> · Quedan {limits.rooms_remaining}</span>
      )}
    </p>
  );

  const msg = limits.limit_message;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {msg?.type === 'error' && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">
          <p className="text-sm font-medium">{msg.message}</p>
          <p className="mt-1 text-sm">{msg.suggestion}</p>
          <Link
            href={upgradeHref}
            className="mt-3 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Ver planes y ampliar límite
          </Link>
        </div>
      )}
      {msg?.type === 'warning' && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
          <p className="text-sm font-medium">{msg.message}</p>
          <p className="mt-1 text-sm">{msg.suggestion}</p>
          <Link
            href={upgradeHref}
            className="mt-2 inline-flex text-sm font-semibold text-amber-900 underline hover:no-underline"
          >
            Ver planes →
          </Link>
        </div>
      )}
      <div className={msg ? 'border-t border-slate-100 pt-3' : ''}>{summary}</div>
    </div>
  );
}
