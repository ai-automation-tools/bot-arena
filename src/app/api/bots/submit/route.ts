import { NextRequest, NextResponse } from 'next/server';

// Bot submission request shape
interface BotSubmissionRequest {
  name: string;
  protocolId: string;
  code: string;
}

// Validation constants from bot-submission-spec.md
const MAX_CODE_SIZE = 100 * 1024; // 100KB
const FORBIDDEN_APIS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'require',
  'import(',
  'eval',
  'Function(',
];

/**
 * POST /api/bots/submit
 * Server-side bot submission endpoint with validation
 */
export async function POST(req: NextRequest) {
  try {
    const body: BotSubmissionRequest = await req.json();
    const { name, protocolId, code } = body;

    // Validation: required fields
    if (!name || !protocolId || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: name, protocolId, code' },
        { status: 400 }
      );
    }

    // Validation: name length
    if (name.length < 3 || name.length > 50) {
      return NextResponse.json(
        { error: 'Bot name must be between 3 and 50 characters' },
        { status: 400 }
      );
    }

    // Validation: code size
    const codeSize = new TextEncoder().encode(code).length;
    if (codeSize > MAX_CODE_SIZE) {
      return NextResponse.json(
        { error: `Code exceeds maximum size of ${MAX_CODE_SIZE} bytes` },
        { status: 400 }
      );
    }

    // Validation: code structure (must export default function)
    if (!code.includes('export default')) {
      return NextResponse.json(
        { error: 'Code must export a default function' },
        { status: 400 }
      );
    }

    // Validation: forbidden APIs
    for (const api of FORBIDDEN_APIS) {
      if (code.includes(api)) {
        return NextResponse.json(
          { error: `Forbidden API detected: ${api}` },
          { status: 400 }
        );
      }
    }

    // TODO: Store bot in database/storage
    // For now, return success with mock bot ID
    const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return NextResponse.json(
      {
        success: true,
        botId,
        message: 'Bot submitted successfully',
        bot: {
          id: botId,
          name,
          protocolId,
          codeSize,
          submittedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Bot submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
