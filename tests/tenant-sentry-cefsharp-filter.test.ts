import { describe, expect, it } from 'vitest';
import {
  isCefSharpOutlookNoise,
  shouldDropSentryEvent,
} from '../src/lib/sentry-filter-next-navigation';

describe('CEFSharp / Outlook Safe Links noise', () => {
  const msg =
    'UnhandledRejection: Non-Error promise rejection captured with value: Object Not Found Matching Id:3, MethodName:update, ParamCount:4';

  it('detecta el signature clásico', () => {
    expect(isCefSharpOutlookNoise(msg)).toBe(true);
    expect(isCefSharpOutlookNoise(new Error(msg))).toBe(true);
  });

  it('shouldDropSentryEvent lo descarta', () => {
    expect(shouldDropSentryEvent(msg)).toBe(true);
    expect(
      shouldDropSentryEvent(undefined, {
        message: msg,
        culprit: '/:locale/onboarding',
      })
    ).toBe(true);
  });

  it('no descarta errores reales de onboarding', () => {
    expect(shouldDropSentryEvent(new Error('Error creando unidad'))).toBe(false);
  });
});
