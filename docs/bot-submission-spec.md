# Bot Submission Specification

**Version:** 1.0.0  
**Last Updated:** 2026-02-21  
**Status:** Draft

---

## Overview

This document defines the format, validation rules, and lifecycle for bot submissions in BotArena Retro.

---

## Submission Format

### File Structure

Bots are submitted as a single JavaScript/TypeScript file that exports a default function:

```typescript
export default async function botLogic(gameState: GameState): Promise<Move> {
  // Bot decision logic here
  return move;
}
```

### Size Limits

- **Max file size:** 50 KB (uncompressed)
- **Max bundle size:** 100 KB (after any transpilation/bundling)
- **Execution timeout:** 1000ms per move (configurable per protocol)

### Allowed APIs

Bots run in a sandboxed environment with access to:

- ✅ Standard JavaScript (ES2022)
- ✅ Math operations and pure functions
- ✅ Protocol-specific game state and utilities
- ❌ No network access (fetch, WebSocket, etc.)
- ❌ No DOM manipulation
- ❌ No timers (setTimeout, setInterval)
- ❌ No file system access
- ❌ No external imports (unless pre-approved protocol libraries)

### Protocol-Specific Types

Each protocol defines its own `GameState` and `Move` interfaces:

**Example: Chess Protocol**

```typescript
interface ChessGameState {
  board: string[][]; // 8x8 array, pieces as FEN notation
  turn: 'white' | 'black';
  castling: { whiteKing: boolean; whiteQueen: boolean; blackKing: boolean; blackQueen: boolean };
  enPassant: string | null; // e.g., "e3"
  halfmove: number;
  fullmove: number;
}

interface ChessMove {
  from: string; // e.g., "e2"
  to: string; // e.g., "e4"
  promotion?: 'q' | 'r' | 'b' | 'n';
}
```

---

## Validation Rules

### Pre-Submission Validation (Client-Side)

1. **Syntax Check:** Code must parse without errors
2. **Export Check:** Must export a default function
3. **Type Check:** Function signature must match protocol requirements
4. **Size Check:** Must be under file size limit

### Server-Side Validation

1. **Security Scan:** AST analysis to block dangerous patterns:
   - No `eval()` or `Function()` constructor
   - No attempts to access `globalThis`, `window`, `process`
   - No infinite loops (static analysis + timeout)
2. **Dry Run:** Execute bot against sample game states with timeout
3. **Rate Limiting:** Max 10 submissions per user per hour

### Runtime Validation (During Matches)

1. **Timeout Enforcement:** Kill bot execution after protocol-defined timeout
2. **Move Validation:** Verify returned move is legal per protocol rules
3. **Resource Limits:** Memory usage capped at 50 MB per bot instance

---

## Bot Lifecycle

### 1. Submission

- User uploads bot code via web interface
- Client performs pre-validation checks
- Code sent to server for full validation
- Bot stored in Firestore with metadata:
  ```json
  {
    "id": "bot_xyz123",
    "userId": "user_abc456",
    "name": "Aggressive Opener",
    "protocolId": "chess",
    "code": "<base64-encoded-source>",
    "createdAt": "2026-02-21T03:00:00Z",
    "status": "active",
    "stats": {
      "matches": 0,
      "wins": 0,
      "losses": 0,
      "draws": 0
    }
  }
  ```

### 2. Verification

- Server runs dry-run tests against protocol test suite
- Bot must complete at least 3 sample games without timeout/error
- Status updated to `verified` or `failed`

### 3. Match Execution

- Bot code loaded into isolated worker/VM
- For each turn:
  1. Game state serialized and passed to bot
  2. Bot executes with timeout
  3. Move returned and validated
  4. Game state updated
- If bot times out or returns invalid move → automatic forfeit

### 4. Updates

- Users can submit new versions of their bot
- Previous versions archived with version number
- Stats reset on major version changes (configurable)

---

## Error Handling

### Submission Errors

| Error Code | Message | Resolution |
|------------|---------|------------|
| `BOT_TOO_LARGE` | "Bot file exceeds 50 KB limit" | Reduce code size or optimize |
| `INVALID_SYNTAX` | "Code contains syntax errors" | Fix syntax and resubmit |
| `MISSING_EXPORT` | "No default export found" | Add `export default function` |
| `UNSAFE_CODE` | "Code contains blocked patterns (eval, fetch, etc.)" | Remove unsafe code |
| `TIMEOUT_TEST` | "Bot timed out during dry run" | Optimize decision logic |

### Runtime Errors

| Error | Behavior | User Feedback |
|-------|----------|---------------|
| Timeout | Forfeit current move, random legal move chosen | "Bot X timed out (1000ms)" |
| Invalid Move | Forfeit current move, random legal move chosen | "Bot X returned invalid move" |
| Crash/Exception | Forfeit match | "Bot X crashed: [error message]" |

---

## Future Enhancements

- **Version Control:** Git-like diff view for bot updates
- **Collaboration:** Shared bot editing with team members
- **Training Mode:** Sandbox environment with step-through debugging
- **Analytics:** Per-bot performance metrics and move heatmaps
- **Languages:** Support Python, Rust (via WASM), or other compiled-to-JS languages

---

## Open Questions

- [ ] Should we allow bot-to-bot communication in team protocols?
- [ ] Should we support user-uploaded dependencies (e.g., chess libraries)?
- [ ] How do we handle bots that intentionally slow down to grief opponents?
- [ ] Should we rate-limit bot executions per user to prevent abuse?

---

## References

- [Protocol Specification](./protocol-spec.md) _(to be created)_
- [Security & Sandboxing](./security.md) _(to be created)_
- [Match Runner Architecture](./match-runner.md) _(to be created)_
