import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#00e676',
          fontFamily: 'monospace',
          fontSize: '15px',
          fontWeight: 'bold',
          border: '2px solid #00e676',
          boxSizing: 'border-box',
          letterSpacing: '-1px',
        }}
      >
        BA
      </div>
    ),
    { ...size }
  );
}
