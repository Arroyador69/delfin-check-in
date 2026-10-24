'use client';

import { CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MirHumanStatus } from '@/lib/mir-human-status';

export type MirHumanStatusLabels = {
  ok: string;
  error: string;
  pendiente: string;
  actionRetryOrSupport: string;
  actionSendGuestForm: string;
  actionWaitConfirm: string;
  ctaSendGuestForm: string;
};

type Props = {
  status: MirHumanStatus;
  labels: MirHumanStatusLabels;
  formUrl?: string | null;
  onCopyFormUrl?: () => void;
  compact?: boolean;
  className?: string;
};

const BADGE_STYLES: Record<MirHumanStatus['kind'], string> = {
  ok: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  pendiente: 'bg-amber-100 text-amber-900 border-amber-200',
};

function StatusIcon({ kind }: { kind: MirHumanStatus['kind'] }) {
  if (kind === 'ok') return <CheckCircle className="h-3.5 w-3.5 shrink-0" />;
  if (kind === 'error') return <XCircle className="h-3.5 w-3.5 shrink-0" />;
  return <Clock className="h-3.5 w-3.5 shrink-0" />;
}

function actionText(status: MirHumanStatus, labels: MirHumanStatusLabels): string | null {
  if (status.actionKey === 'retryOrSupport') return labels.actionRetryOrSupport;
  if (status.actionKey === 'sendGuestForm') return labels.actionSendGuestForm;
  if (status.actionKey === 'waitConfirm') return labels.actionWaitConfirm;
  return null;
}

/** Badge MIR legible (OK | Error | Pendiente) + pista + CTA formulario. */
export function MirHumanStatusBadge({
  status,
  labels,
  formUrl,
  onCopyFormUrl,
  compact = false,
  className = '',
}: Props) {
  const label =
    status.labelKey === 'ok'
      ? labels.ok
      : status.labelKey === 'error'
        ? labels.error
        : labels.pendiente;
  const hint = actionText(status, labels);
  const showCta = Boolean(formUrl) && status.kind !== 'ok';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${BADGE_STYLES[status.kind]}`}
          title={status.detail || undefined}
        >
          <StatusIcon kind={status.kind} />
          {label}
        </span>
        {showCta && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-blue-200 bg-white text-blue-800 hover:bg-blue-50"
            onClick={() => {
              if (onCopyFormUrl) {
                onCopyFormUrl();
                return;
              }
              if (formUrl) {
                void navigator.clipboard?.writeText(formUrl);
                window.open(formUrl, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            <Send className="h-3.5 w-3.5" />
            {labels.ctaSendGuestForm}
          </Button>
        )}
      </div>
      {!compact && hint && (
        <p className="text-xs text-gray-600 leading-snug max-w-md">{hint}</p>
      )}
      {!compact && status.detail && status.kind === 'error' && (
        <p className="text-xs text-red-600 font-medium leading-snug max-w-lg break-words">
          {status.detail}
        </p>
      )}
    </div>
  );
}
