// === Courtroom Simulation Types ===

export type CourtroomRole = 'user' | 'opposing-counsel' | 'judge' | 'jury';

export type SimulationPhase =
  | 'setup'
  | 'opening'
  | 'examination'
  | 'closing'
  | 'verdict'
  | 'ended';

export interface CourtroomMessage {
  id: string;
  role: CourtroomRole;
  content: string;
  phase: SimulationPhase;
  isObjection?: boolean;
  ruling?: 'sustained' | 'overruled';
  timestamp: number;
}

export interface JuryScore {
  userScore: number; // 0–100, starts at 50
  reasoning: string;
  history: { score: number; reason: string }[];
}

export interface SimulationConfig {
  caseName: string;
  caseDescription: string;
  userRole: 'plaintiff' | 'defense';
  assistantIds: string[];
  difficulty: 'standard' | 'aggressive';
}

export interface SimulationThreads {
  opposingCounsel: string | null;
  judge: string | null;
  jury: string | null;
}

export interface SimulationRequest {
  message: string;
  config: SimulationConfig;
  phase: SimulationPhase;
  threads: SimulationThreads;
  messageHistory: CourtroomMessage[];
  juryScore: JuryScore;
}

export interface SimulationResponse {
  messages: CourtroomMessage[];
  threads: SimulationThreads;
  phase: SimulationPhase;
  juryScore: JuryScore;
  phaseTransitionReason?: string;
}
