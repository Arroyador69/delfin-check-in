/**
 * Canales de reserva configurables por tenant (OTAs + reserva directa).
 * Duplicado de src/lib/booking-channels para la app Expo.
 */

export const BOOKING_CHANNELS_CORE = ['direct'] as const;

export const BOOKING_CHANNELS_OTA_PRESETS = [
  'airbnb',
  'booking',
  'vrbo',
  'expedia',
  'tripadvisor',
] as const;

export type BookingChannelsConfig = {
  presets: string[];
  custom: Array<{ id: string; label: string }>;
};

export function normalizeBookingChannels(raw: unknown): BookingChannelsConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  let presets = Array.isArray(o.presets)
    ? (o.presets as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    : [];
  presets = presets.map((id) => (id === 'checkin_form' ? 'direct' : id));
  presets = presets.filter((id) => id !== 'manual');
  for (const id of BOOKING_CHANNELS_CORE) {
    if (!presets.includes(id)) presets.push(id);
  }
  const custom = Array.isArray(o.custom)
    ? (o.custom as unknown[])
        .map((c) => {
          if (!c || typeof c !== 'object') return null;
          const row = c as Record<string, unknown>;
          const id = typeof row.id === 'string' ? row.id.trim() : '';
          const label = typeof row.label === 'string' ? row.label.trim() : '';
          if (!id || !label) return null;
          return { id, label };
        })
        .filter(Boolean) as Array<{ id: string; label: string }>
    : [];
  presets = [...new Set(presets)];
  return { presets, custom };
}

export function defaultBookingChannelsConfig(): BookingChannelsConfig {
  return normalizeBookingChannels({
    presets: [...BOOKING_CHANNELS_CORE, 'airbnb', 'booking'],
    custom: [],
  });
}

export function newCustomChannelId(): string {
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type ChannelOption = { value: string; label: string };

export function buildChannelSelectOptions(
  config: BookingChannelsConfig,
  labelForPreset: (id: string) => string
): ChannelOption[] {
  const seen = new Set<string>();
  const out: ChannelOption[] = [];
  const primary = [...BOOKING_CHANNELS_CORE, ...BOOKING_CHANNELS_OTA_PRESETS];
  for (const id of primary) {
    if (!config.presets.includes(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ value: id, label: labelForPreset(id) });
  }
  for (const id of config.presets) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ value: id, label: labelForPreset(id) });
  }
  for (const c of config.custom) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push({ value: c.id, label: c.label });
  }
  return out;
}

export function coalesceReservationFormChannel(raw: string | null | undefined): string {
  const v = String(raw || 'direct').trim().toLowerCase();
  if (v === 'manual' || v === 'checkin_form') return 'direct';
  return v || 'direct';
}
