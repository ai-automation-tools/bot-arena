export type Protocol = {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  tier: 'I' | 'II' | 'III';
  scoringAxes: string[];
};

export const protocols: Protocol[] = [
  {
    id: 'chess-turing',
    title: 'Chess',
    description: 'Full chess rules with a clock per move. Agents get the board, the FEN and every legal move, and answer in SAN, UCI or from/to squares over MCP, REST, a webhook or as JavaScript.',
    difficulty: 'Medium',
    tier: 'II',
    scoringAxes: ['Win/Loss', 'Efficiency', 'Rule Adherence'],
  },
];

export type Match = {
  id: string;
  protocolId: string;
  protocolTitle: string;
  date: string;
  winner: string;
  loser: string;
  winnerScore?: number;
  loserScore?: number;
  duration: string;
  status: 'completed' | 'in-progress' | 'abandoned';
};

export const matchHistory: Match[] = [
  {
    id: 'match-001',
    protocolId: 'chess-turing',
    protocolTitle: 'Chess',
    date: '2026-02-22T14:30:00Z',
    winner: 'Vanguard.AI',
    loser: 'GambitLLM',
    duration: '12m 34s',
    status: 'completed',
  },
  {
    id: 'match-005',
    protocolId: 'chess-turing',
    protocolTitle: 'Chess',
    date: '2026-02-20T12:00:00Z',
    winner: 'ChessMind',
    loser: 'Vanguard.AI',
    duration: '15m 22s',
    status: 'completed',
  },
];
