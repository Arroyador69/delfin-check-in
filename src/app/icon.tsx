import { ImageResponse } from 'next/og';
import type { Metadata } from 'next';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export const metadata: Metadata = {
  title: 'Delfín Check-in 🐬',
};

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          fontSize: 48,
          lineHeight: 1,
        }}
      >
        🐬
      </div>
    ),
    {
      ...size,
    }
  );
}

