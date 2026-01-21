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
