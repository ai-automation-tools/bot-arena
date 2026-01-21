export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export interface StockfishAnalysis {
  bestMove: string;
  ponder?: string;
  evaluation?: number;
  depth?: number;
  nodes?: number;
  time?: number;
}

export interface StockfishConfig {
  skillLevel?: SkillLevel;
  depth?: number;
  moveTime?: number; // milliseconds
  threads?: number;
  hash?: number; // MB
}

const DEFAULT_CONFIG: StockfishConfig = {
  skillLevel: 10,
  depth: 15,
  moveTime: 1000,
  threads: 1,
  hash: 16,
};

export class StockfishService {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private config: StockfishConfig;
  private resolveMove: ((analysis: StockfishAnalysis) => void) | null = null;
  private currentAnalysis: Partial<StockfishAnalysis> = {};

  constructor(config: Partial<StockfishConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Create an inline worker that loads Stockfish from CDN
        const workerCode = `
          importScripts('https://unpkg.com/stockfish@16.0.0/src/stockfish-nnue-16.js');
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);

        this.worker = new Worker(workerUrl);

        this.worker.onmessage = (e: MessageEvent) => {
          this.handleMessage(e.data);
        };

        this.worker.onerror = (e) => {
          console.error('[STOCKFISH] Worker error:', e);
          URL.revokeObjectURL(workerUrl);
          resolve(false);
        };

        // Initialize UCI
        this.sendCommand('uci');

        // Wait for uciok
        const timeout = setTimeout(() => {
          if (!this.isReady) {
            console.warn('[STOCKFISH] Initialization timeout, using fallback');
            URL.revokeObjectURL(workerUrl);
            resolve(false);
          }
        }, 5000);

        const checkReady = setInterval(() => {
          if (this.isReady) {
            clearInterval(checkReady);
            clearTimeout(timeout);
            this.applyConfig();
            resolve(true);
          }
        }, 100);
      } catch (e) {
        console.error('[STOCKFISH] Failed to initialize:', e);
        resolve(false);
      }
    });
  }

  private handleMessage(message: string): void {
    // console.log('[STOCKFISH]', message);

    if (message === 'uciok') {
      this.isReady = true;
    }

    if (message.startsWith('bestmove')) {
      const parts = message.split(' ');
      this.currentAnalysis.bestMove = parts[1];
      if (parts[3]) {
        this.currentAnalysis.ponder = parts[3];
      }

      if (this.resolveMove && this.currentAnalysis.bestMove) {
        this.resolveMove(this.currentAnalysis as StockfishAnalysis);
        this.resolveMove = null;
        this.currentAnalysis = {};
      }
    }

    if (message.startsWith('info')) {
      const depthMatch = message.match(/depth (\d+)/);
      const nodesMatch = message.match(/nodes (\d+)/);
      const timeMatch = message.match(/time (\d+)/);
      const scoreMatch = message.match(/score cp (-?\d+)/);
      const mateMatch = message.match(/score mate (-?\d+)/);

      if (depthMatch) this.currentAnalysis.depth = parseInt(depthMatch[1]);
      if (nodesMatch) this.currentAnalysis.nodes = parseInt(nodesMatch[1]);
      if (timeMatch) this.currentAnalysis.time = parseInt(timeMatch[1]);
      if (scoreMatch) this.currentAnalysis.evaluation = parseInt(scoreMatch[1]) / 100;
      if (mateMatch) this.currentAnalysis.evaluation = parseInt(mateMatch[1]) > 0 ? 999 : -999;
    }
  }

  private sendCommand(command: string): void {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  private applyConfig(): void {
    this.sendCommand('isready');
    this.sendCommand(`setoption name Skill Level value ${this.config.skillLevel}`);
    this.sendCommand(`setoption name Threads value ${this.config.threads}`);
    this.sendCommand(`setoption name Hash value ${this.config.hash}`);
    this.sendCommand('ucinewgame');
  }

  setSkillLevel(level: SkillLevel): void {
    this.config.skillLevel = level;
    if (this.isReady) {
      this.sendCommand(`setoption name Skill Level value ${level}`);
    }
  }

  setDepth(depth: number): void {
    this.config.depth = depth;
  }

  setMoveTime(ms: number): void {
    this.config.moveTime = ms;
  }

  async getBestMove(fen: string): Promise<StockfishAnalysis | null> {
    if (!this.isReady || !this.worker) {
      console.warn('[STOCKFISH] Engine not ready');
      return null;
    }

    return new Promise((resolve) => {
      this.resolveMove = resolve;
      this.currentAnalysis = {};

      this.sendCommand(`position fen ${fen}`);

      if (this.config.moveTime) {
        this.sendCommand(`go movetime ${this.config.moveTime}`);
      } else {
        this.sendCommand(`go depth ${this.config.depth}`);
      }

      // Timeout fallback
      setTimeout(() => {
        if (this.resolveMove) {
          this.sendCommand('stop');
        }
      }, (this.config.moveTime || 5000) + 1000);
    });
  }

  async evaluatePosition(fen: string, depth: number = 15): Promise<number | null> {
    const analysis = await this.getBestMove(fen);
    return analysis?.evaluation ?? null;
  }

  stop(): void {
    this.sendCommand('stop');
  }

  destroy(): void {
    if (this.worker) {
      this.sendCommand('quit');
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }

  getIsReady(): boolean {
    return this.isReady;
  }
}

// Fallback random move generator when Stockfish is not available
export class FallbackAI {
  getBestMove(legalMoves: string[]): string | null {
    if (legalMoves.length === 0) return null;

    // Prioritize captures and checks (basic heuristic)
    const captures = legalMoves.filter(m => m.includes('x'));
    const checks = legalMoves.filter(m => m.includes('+'));

    if (checks.length > 0) {
      return checks[Math.floor(Math.random() * checks.length)];
    }
    if (captures.length > 0) {
      return captures[Math.floor(Math.random() * captures.length)];
    }

    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }
}

export default StockfishService;
