/**
 * Types for multi-user LLM simulation framework
 *
 * This validates the collaboration mechanics at scale by simulating
 * realistic participants with diverse constraints.
 */

import {
  Collaboration,
  Participant,
  Tag,
  Proposal,
  ContextualizationOutput,
  ConversationTurn,
  SynthesisOutput,
  QuestionIdentificationOutput
} from '../types';

// =============================================================================
// PERSONA DEFINITION
// =============================================================================

/**
 * A simulated participant with personality, constraints, and behaviors
 */
export interface Persona {
  id: string;
  name: string;

  // Demographics and context
  demographics: {
    ageRange: string;                      // "20s", "30s", "40s+"
    lifestage: string;                     // "student", "young professional", "parent", "retired"
    location: string;                      // "urban", "suburban", "rural"
  };

  // Persistent constraints (always apply)
  persistentConstraints: PersonaConstraint[];

  // Personality traits affecting behavior
  personality: {
    flexibility: number;                   // 0-1: how willing to compromise
    assertiveness: number;                 // 0-1: how strongly they express needs
    detailOrientation: number;             // 0-1: how specific they are
    socialStyle: string;                   // "direct", "diplomatic", "passive"
  };

  // Communication patterns
  communication: {
    verbosity: 'terse' | 'moderate' | 'verbose';
    emotionality: 'reserved' | 'moderate' | 'expressive';
    examplePhrases: string[];              // typical things they might say
  };
}

export interface PersonaConstraint {
  text: string;                            // the constraint/desire
  type: 'concern' | 'desire';
  severity?: 'non-negotiable' | 'strong-preference' | 'preference' | 'nice-to-have';
  intensity?: 'must-have' | 'would-love' | 'would-like' | 'nice-to-have';
  reason: string;                          // why they have this constraint
  flexibility: number;                     // 0-1: how negotiable this is
}

// =============================================================================
// SIMULATION SCENARIO
// =============================================================================

/**
 * A complete simulation scenario with personas and expected outcomes
 */
export interface SimulationScenario {
  id: string;
  name: string;
  description: string;

  // The collaboration being simulated
  collaboration: {
    outcome: string;                       // "Weekend camping trip"
    type: 'event' | 'project' | 'trip' | 'ongoing';
    creator: string;                       // persona id
  };

  // Who's participating
  personas: Persona[];

  // Expected difficulty
  difficulty: {
    level: 'easy' | 'moderate' | 'hard' | 'impossible';
    expectedRounds: number;                // how many synthesis iterations expected
    conflictTypes: ConflictType[];
  };

  // Success criteria
  success: {
    convergenceExpected: boolean;          // should this reach consensus?
    minAcceptanceRate: number;             // 0-1: minimum % who should accept
    maxOptOuts: number;                    // how many can opt out before failure
    constraintsSatisfied: string[];        // specific constraints that MUST be satisfied
  };
}

export type ConflictType =
  | 'no-conflict'           // easy accommodation
  | 'preference-conflict'   // competing desires, solvable
  | 'resource-conflict'     // limited resources (budget, time)
  | 'value-conflict'        // fundamentally incompatible needs
  | 'coupling-conflict';    // solving one makes another impossible

// =============================================================================
// SIMULATION STATE
// =============================================================================

/**
 * The state of a running simulation
 */
export interface SimulationState {
  scenario: SimulationScenario;
  collaboration: Collaboration;
  round: number;

  // Per-persona state
  personaStates: Map<string, PersonaState>;

  // History
  synthesisHistory: SynthesisRound[];

  // Current status
  status: 'extracting' | 'synthesizing' | 'responding' | 'converged' | 'diverged' | 'forked';
}

export interface PersonaState {
  persona: Persona;
  participant: Participant;
  conversationHistory: ConversationTurn[];
  extractionComplete: boolean;
  currentProposal?: Proposal;
  contextualization?: ContextualizationOutput;
  response?: ParticipantResponse;
}

export interface SynthesisRound {
  roundNumber: number;
  questionIdentification: QuestionIdentificationOutput;
  synthesis: SynthesisOutput;
  responses: Map<string, ParticipantResponse>;
  outcome: 'accepted' | 'objections' | 'opt-outs';
}

// Serializable version for JSON output
export interface SynthesisRoundSerialized {
  roundNumber: number;
  questionIdentification: QuestionIdentificationOutput;
  synthesis: SynthesisOutput;
  responses: Record<string, ParticipantResponse>;  // Object instead of Map
  outcome: 'accepted' | 'objections' | 'opt-outs';
}

// =============================================================================
// SERIALIZABLE RESULT (for JSON output)
// =============================================================================

/**
 * Conversation transcript for a persona during extraction
 */
export interface PersonaTranscript {
  personaId: string;
  personaName: string;
  turns: ConversationTurn[];
  extractedTags: Tag[];
  extractionComplete: boolean;
}

/**
 * Serializable version of SimulationResult for JSON output
 * Maps are converted to Records/objects
 */
export interface SimulationResultSerialized {
  scenario: SimulationScenario;
  success: boolean;

  convergence: {
    converged: boolean;
    rounds: number;
    finalStatus: 'consensus' | 'majority-accepted' | 'diverged' | 'forked';
  };

  participation: {
    acceptances: number;
    acceptancesWithReservations: number;
    objections: number;
    optOuts: number;
    acceptanceRate: number;
  };

  constraints: {
    totalNonNegotiable: number;
    satisfiedNonNegotiable: number;
    violatedConstraints: string[];
    satisfiedConstraints: string[];
  };

  quality: {
    proposalSpecificity: number;
    creativeSynthesis: boolean;
    honestFailure: boolean;
  };

  history: {
    rounds: SynthesisRoundSerialized[];
    finalProposal?: Proposal[];
    personaFeedback: Record<string, string>;
    conversationTranscripts: PersonaTranscript[];
  };

  timing: {
    totalMs: number;
    extractionMs: number;
    synthesisMs: number;
    contextualizationMs: number;
  };
}

// =============================================================================
// PARTICIPANT RESPONSES
// =============================================================================

export type ResponseType = 'accept' | 'accept-with-reservations' | 'object' | 'opt-out';

export interface ConstraintAnalysisItem {
  constraint: string;
  satisfied: boolean;
  evidence?: string;
}

export interface ParticipantResponse {
  personaId: string;
  type: ResponseType;
  reasoning: string;                       // why they responded this way
  nonNegotiablesSatisfied?: boolean;       // did all flex:0 constraints get satisfied?
  constraintAnalysis?: ConstraintAnalysisItem[];  // per-constraint satisfaction analysis
  concerns?: string[];                     // for reservations/objections
  suggestions?: string[];                  // for objections
}

// =============================================================================
// SIMULATION RESULTS
// =============================================================================

/**
 * Results from running a simulation
 */
export interface SimulationResult {
  scenario: SimulationScenario;
  success: boolean;

  // Convergence metrics
  convergence: {
    converged: boolean;
    rounds: number;
    finalStatus: 'consensus' | 'majority-accepted' | 'diverged' | 'forked';
  };

  // Participation metrics
  participation: {
    acceptances: number;
    acceptancesWithReservations: number;
    objections: number;
    optOuts: number;
    acceptanceRate: number;                // 0-1
  };

  // Constraint satisfaction
  constraints: {
    totalNonNegotiable: number;
    satisfiedNonNegotiable: number;
    violatedConstraints: string[];
  };

  // Quality metrics
  quality: {
    proposalSpecificity: number;           // 0-1: how specific vs vague
    creativeSynthesis: boolean;            // did it find third options?
    honestFailure: boolean;                // did it correctly identify impossibilities?
  };

  // Full history
  history: {
    rounds: SynthesisRound[];
    finalProposal?: Proposal[];
    personaFeedback: Map<string, string>;
  };

  // Timing
  timing: {
    totalMs: number;
    extractionMs: number;
    synthesisMs: number;
    contextualizationMs: number;
  };
}

// =============================================================================
// SIMULATION CONFIGURATION
// =============================================================================

export interface SimulationConfig {
  // Execution settings
  maxRounds: number;                       // max synthesis iterations before failure
  timeoutMs: number;                       // max time for entire simulation

  // LLM settings
  extractionModel: string;                 // model for extraction conversations
  synthesisModel: string;                  // model for synthesis
  personaModel: string;                    // model playing personas

  // Behavior settings
  extractionMaxTurns: number;              // max conversation turns per persona
  allowForking: boolean;                   // can collaborations fork?

  // Logging
  verbose: boolean;
  saveConversations: boolean;
}

// =============================================================================
// LLM-AS-USER TYPES
// =============================================================================

/**
 * Instructions for LLM playing a persona during extraction
 */
export interface PersonaPromptContext {
  persona: Persona;
  collaboration: Collaboration;
  conversationHistory: ConversationTurn[];
  currentAIMessage: string;                // what the extraction AI just said
}

export interface PersonaUserResponse {
  message: string;                         // what the persona says
  done: boolean;                           // is this persona done with extraction?
  reasoning?: string;                      // internal reasoning (not shown to system)
}
