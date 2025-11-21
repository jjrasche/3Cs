/**
 * Core data structures for the 3Cs model:
 *
 * Two core LLM operations:
 * 1. Extraction - Pull concerns/desires from participants
 * 2. Synthesis - Generate proposals from extracted data
 *
 * Data flow:
 * Conversation (ephemeral) → Extraction → Constraint (functional) → Collaboration
 */

// --- User Profile ---

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UserProfile {
  odId: string;
  learnedConstraints: string[];  // patterns from past collaborations
  // conversationHistory stored separately in conversations collection
}

// --- Constraints ---

export interface Constraint {
  text: string;              // functional wording
  anonymous: boolean;        // whether to show who
  participantId: string;     // for removal/edit, even if anonymous
  addedAt: Date;
}

// --- Legacy types (used in hypothesis tests) ---

export interface Concern {
  participant: string;     // who raised it
  text: string;            // what they actually said
  need: string;            // underlying need (extracted)
  intensity: 'low' | 'medium' | 'high';
}

export interface Desire {
  participant: string;
  text: string;            // what they actually said
  want: string;            // underlying want (extracted)
  intensity: 'low' | 'medium' | 'high';
}

// --- Collaboration State ---

export interface Collaboration {
  outcome: string;

  // Top-level common fields (synthesis fills these)
  when: string | null;
  where: string | null;

  // Participants
  creator: string;
  participants: string[];

  // Extraction accumulates these (legacy format for hypothesis tests)
  concerns: Concern[];
  desires: Desire[];

  // Confirmed constraints from participants
  constraints: Constraint[];
}

// --- Operation Inputs/Outputs ---

// Extraction: What we feed the LLM
export interface ExtractionInput {
  collaboration: Collaboration;
  participant: string;
  conversation: string;  // what the participant said
}

// Single extraction item
export interface Extraction {
  quote: string;           // exact text from user
  type: 'concern' | 'desire';
  summary: string;         // brief description
  underlying: string;      // deeper need/want
  intensity: number;       // 1-4 (4 = non-negotiable)
  digDeeper: string;       // question to ask next
}

// Extraction: What the LLM produces
export interface ExtractionOutput {
  extractions: Extraction[];
  newConstraints: string[];
  participant: string;
}

// Synthesis: What we feed the LLM
export interface SynthesisInput {
  collaboration: Collaboration;  // includes all extracted concerns/desires
  questionsToResolve: string[];  // what needs proposals (when, where, etc.)
}

// Synthesis: What the LLM produces
export interface SynthesisOutput {
  proposals: Proposal[];
  unresolvedTensions: Tension[];
}

export interface Proposal {
  question: string;              // what this answers
  proposal: string;              // the actual proposal
  rationale: string;             // how it addresses needs
  addressedConcerns: string[];   // which concerns this satisfies
  addressedDesires: string[];    // which desires this satisfies
}

export interface Tension {
  description: string;           // what's conflicting
  concernsInvolved: string[];    // which concerns conflict
  possibleResolutions: string[]; // options AI sees
}
