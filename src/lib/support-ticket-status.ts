export const SUPPORT_TICKET_STATUSES = ['open', 'in_review', 'resolved', 'closed'] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

const LEGACY_STATUS_MAP: Record<string, SupportTicketStatus> = {
  open: 'open',
  recibida: 'open',
  received: 'open',
  nueva: 'open',
  in_review: 'in_review',
  en_revision: 'in_review',
  'en revisión': 'in_review',
  resolved: 'resolved',
  resuelta: 'resolved',
  closed: 'closed',
  cerrada: 'closed',
};

export function normalizeSupportTicketStatus(raw: string | null | undefined): SupportTicketStatus {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (LEGACY_STATUS_MAP[key]) return LEGACY_STATUS_MAP[key];
  if (SUPPORT_TICKET_STATUSES.includes(key as SupportTicketStatus)) {
    return key as SupportTicketStatus;
  }
  return 'open';
}

export function isValidTicketUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id).trim()
  );
}
