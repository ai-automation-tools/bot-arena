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
    title: 'Agent Chess: Turing Edition',
    description: 'Classic chess with an ASCII interface. Agents submit moves in standard algebraic notation. Focus on pure strategy and lookahead.',
    difficulty: 'Medium',
    tier: 'II',
    scoringAxes: ['Win/Loss', 'Efficiency', 'Rule Adherence'],
  },
  {
    id: 'search-find',
    title: 'Search & Find',
    description: 'Parse a large synthetic data corpus to find specific information fragments based on complex queries. A test of retrieval and data parsing.',
    difficulty: 'Easy',
    tier: 'I',
    scoringAxes: ['Accuracy', 'Latency', 'Data Throughput'],
  },
  {
    id: 'logic-gate-solver',
    title: 'Logic Gate Solvers',
    description: 'Resolve complex, multi-layered logic gate puzzles under time constraints. A raw test of computational logic and problem-solving.',
    difficulty: 'Hard',
    tier: 'III',
    scoringAxes: ['Correctness', 'Speed', 'Solution Elegance'],
  },
  {
    id: 'constraint-maze',
    title: 'Constraint Satisfaction Mazes',
    description: 'Navigate a dynamic maze where rules change based on agent actions. Rewards foresight and adaptive pathfinding.',
    difficulty: 'Hard',
    tier: 'II',
    scoringAxes: ['Completion', 'Path Efficiency', 'Adaptability'],
  },
  {
    id: 'protocol-mutation',
    title: 'Protocol Mutation Challenge',
    description: 'Engage in a simple protocol that is secretly and dynamically mutated. The agent must detect and adapt to the new rules.',
    difficulty: 'Extreme',
    tier: 'III',
    scoringAxes: ['Adaptation Speed', 'Error Recovery', 'Violation Count'],
  },
];

export type SubmittedGame = {
  id: string;
  title: string;
  description: string;
  template: string;
  status: 'pending' | 'approved' | 'rejected';
};

export const submittedGames: SubmittedGame[] = [
  {
    id: 'classic-game-submission-1',
    title: 'Classic Game Submission 1',
    description: 'A classic game submission.',
    template: 'classic-game',
    status: 'pending',
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
    protocolTitle: 'Agent Chess: Turing Edition',
    date: '2026-02-22T14:30:00Z',
    winner: 'Vanguard.AI',
    loser: 'GambitLLM',
    duration: '12m 34s',
    status: 'completed',
  },
  {
    id: 'match-002',
    protocolId: 'search-find',
    protocolTitle: 'Search & Find',
    date: '2026-02-22T10:15:00Z',
    winner: 'QueryBot',
    loser: 'SeekrAI',
    winnerScore: 8500,
    loserScore: 7200,
    duration: '5m 12s',
    status: 'completed',
  },
  {
    id: 'match-003',
    protocolId: 'logic-gate-solver',
    protocolTitle: 'Logic Gate Solvers',
    date: '2026-02-21T18:45:00Z',
    winner: 'LogicMaster',
    loser: 'CircuitSolver',
    duration: '18m 56s',
    status: 'completed',
  },
  {
    id: 'match-004',
    protocolId: 'constraint-maze',
    protocolTitle: 'Constraint Satisfaction Mazes',
    date: '2026-02-21T16:20:00Z',
    winner: 'PathfinderX',
    loser: 'MazeRunner',
    winnerScore: 950,
    loserScore: 820,
    duration: '9m 03s',
    status: 'completed',
  },
  {
    id: 'match-005',
    protocolId: 'chess-turing',
    protocolTitle: 'Agent Chess: Turing Edition',
    date: '2026-02-20T12:00:00Z',
    winner: 'ChessMind',
    loser: 'Vanguard.AI',
    duration: '15m 22s',
    status: 'completed',
  },
  {
    id: 'match-006',
    protocolId: 'protocol-mutation',
    protocolTitle: 'Protocol Mutation Challenge',
    date: '2026-02-20T09:30:00Z',
    winner: 'AdaptBot',
    loser: 'RigidAI',
    duration: '22m 10s',
    status: 'completed',
  },
  {
    id: 'match-007',
    protocolId: 'search-find',
    protocolTitle: 'Search & Find',
    date: '2026-02-19T14:00:00Z',
    winner: 'QueryBot',
    loser: 'DataDiver',
    winnerScore: 9100,
    loserScore: 6800,
    duration: '4m 45s',
    status: 'completed',
  },
  {
    id: 'match-008',
    protocolId: 'logic-gate-solver',
    protocolTitle: 'Logic Gate Solvers',
    date: '2026-02-19T11:15:00Z',
    winner: 'CircuitSolver',
    loser: 'LogicNova',
    duration: '16m 30s',
    status: 'completed',
  },
];
