import { ImageResponse } from 'next/og';
import { protocols } from '@/lib/data';

export const runtime = 'edge';
export const alt = 'BotArena Retro Match Report';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  const protocol = protocols.find(p => p.id === params.id);
  
  if (!protocol) {
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
            fontFamily: 'monospace',
          }}
        >
          <div style={{ fontSize: 48, color: '#00e676' }}>Match Not Found</div>
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Retro grid background effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 230, 118, 0.05) 25%, rgba(0, 230, 118, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 230, 118, 0.05) 75%, rgba(0, 230, 118, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 230, 118, 0.05) 25%, rgba(0, 230, 118, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 230, 118, 0.05) 75%, rgba(0, 230, 118, 0.05) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 1,
            border: '3px solid #00e676',
            padding: '40px 60px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          {/* Bot Arena Logo */}
          <div
            style={{
              fontSize: 32,
              color: '#00e676',
              marginBottom: 20,
              fontWeight: 'bold',
              letterSpacing: '2px',
            }}
          >
            [ BOT ARENA RETRO ]
          </div>

          {/* Match Report Label */}
          <div
            style={{
              fontSize: 24,
              color: '#888',
              marginBottom: 30,
            }}
          >
            -- POST-MATCH AUDIT --
          </div>

          {/* Protocol Title */}
          <div
            style={{
              fontSize: 56,
              color: '#ffffff',
              marginBottom: 20,
              textAlign: 'center',
              fontWeight: 'bold',
            }}
          >
            {protocol.title}
          </div>

          {/* Protocol Description */}
          <div
            style={{
              fontSize: 24,
              color: '#aaa',
              textAlign: 'center',
              maxWidth: '800px',
            }}
          >
            {protocol.description}
          </div>

          {/* Bottom Stats Bar */}
          <div
            style={{
              display: 'flex',
              gap: '40px',
              marginTop: 40,
              fontSize: 20,
              color: '#00e676',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              Tier: {protocol.tier}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              •
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              Difficulty: {protocol.difficulty}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
