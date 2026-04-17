'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BOOKING_CHANNELS_OTA_PRESETS,
  BOOKING_CHANNELS_CORE,
  type BookingChannelsConfig,
  newCustomChannelId,
} from '@/lib/booking-channels';

type Props = {
  value: BookingChannelsConfig;
  onChange: (v: BookingChannelsConfig) => void;
  disabled?: boolean;
};

export default function BookingChannelsEditor({ value, onChange, disabled }: Props) {
  const t = useTranslations('settings.bookingChannels');
  const [otherName, setOtherName] = useState('');

  const toggleOta = (id: string) => {
    const has = value.presets.includes(id);
    let presets = [...value.presets];
    if (has) presets = presets.filter((x) => x !== id);
    else presets.push(id);
    for (const core of BOOKING_CHANNELS_CORE) {
      if (!presets.includes(core)) presets.push(core);
    }
    onChange({ ...value, presets: [...new Set(presets)] });
  };

  const addCustom = () => {
    const trimmed = otherName.trim();
    if (!trimmed || disabled) return;
    const id = newCustomChannelId();
    onChange({ ...value, custom: [...value.custom, { id, label: trimmed }] });
    setOtherName('');
  };

  const removeCustom = (id: string) => {
    if (disabled) return;
    onChange({ ...value, custom: value.custom.filter((c) => c.id !== id) });
  };

  return (
    <div className="space-y-4 border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50/80">
      <div>
        <h3 className="font-semibold text-gray-900">{t('title')}</h3>
        <p className="text-sm text-gray-600 mt-1">{t('description')}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">{t('coreLabel')}</p>
        <div className="flex flex-wrap gap-2">
          {BOOKING_CHANNELS_CORE.map((id) => (
            <span
              key={id}
              className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-sm font-medium"
            >
              {t(`preset.${id}`)}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">{t('coreHint')}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">{t('otasLabel')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BOOKING_CHANNELS_OTA_PRESETS.map((id) => (
            <label key={id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={value.presets.includes(id)}
                onChange={() => toggleOta(id)}
                disabled={disabled}
              />
              <span>{t(`preset.${id}`)}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">{t('customLabel')}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
            placeholder={t('customPlaceholder')}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={disabled || !otherName.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300"
          >
            {t('customAdd')}
          </button>
        </div>
        {value.custom.length > 0 && (
          <ul className="mt-3 space-y-2">
            {value.custom.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2"
              >
                <span className="text-gray-800">{c.label}</span>
                <button
                  type="button"
                  onClick={() => removeCustom(c.id)}
                  disabled={disabled}
                  className="text-red-600 hover:underline text-xs font-medium disabled:opacity-50"
                >
                  {t('customRemove')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
