/**
 * Core types for 3Cs prompt testing framework
 */

// =============================================================================
// EXTRACTION OBJECT - Output of extraction prompt
// =============================================================================

export type ExtractionSignal = 'complete' | 'deepen' | 'expand';

export type ConcernSeverity = 'non-negotiable' | 'strong-preference' | 'preference' | 'nice-to-have';
export type DesireIntensity = 'must-have' | 'would-love' | 'would-like' | 'nice-to-have';

export interface Tag {
  text: string;                          // functional wording
  type: 'concern' | 'desire';
  severity?: ConcernSeverity;            // for concerns
  intensity?: DesireIntensity;           // for desires
  quote?: string;                        // what user actually said
  underlying?: string;                   // deeper need/want
}

export interface ExtractionObject {
  tags: Tag[];
  message: string;                       // AI's response to user
  signal: ExtractionSignal;              // complete, dig, or explore
}

// =============================================================================
// COLLABORATION CONTEXT
// =============================================================================

export interface Participant {
  id: string;
  name: string;
  extraction?: ExtractionObject;         // their extraction results
}

export interface Collaboration {
  id: string;
  outcome: string;                       // what we're trying to do
  creator: string;
  participants: Participant[];
  constraints: Constraint[];             // confirmed constraints
  when?: string;
  where?: string;
}

export interface Constraint {
  text: string;
  anonymous: boolean;
  participantId: string;
}

export interface UserProfile {
  id: string;
  name: string;
  learnedConstraints: string[];          // from past collaborations
}

// =============================================================================
// PROMPT INPUTS/OUTPUTS
// =============================================================================

// Prompt 1: Briefing
export interface BriefingInput {
  collaboration: Collaboration;
  participant: UserProfile;
}

export interface BriefingOutput {
  message: string;                       // personalized briefing
}

// Prompt 2: Extraction
export interface ExtractionInput {
  collaboration: Collaboration;
  participant: Participant;
  conversationHistory: ConversationTurn[];
  userMessage: string;
}

export type ExtractionOutput = ExtractionObject;

// Prompt 3: Synthesis
export interface SynthesisInput {
  collaboration: Collaboration;          // includes all participants' extractions
}

export interface Proposal {
  question: string;                      // what this resolves
  proposal: string;                      // the actual proposal
  rationale: string;                     // how it addresses needs
  addressedConcerns: string[];
  addressedDesires: string[];
}

export interface Tension {
  description: string;
  constraintsInvolved: string[];
  possibleResolutions: string[];
}

export interface SynthesisOutput {
  proposals: Proposal[];
  tensions: Tension[];
}

// Prompt 4: Contextualization
export interface ContextualizationInput {
  proposal: Proposal;
  participant: Participant;              // includes their extraction
}

export interface ContextualizationOutput {
  summary: string;                       // personalized summary
  confidence: 'high' | 'medium' | 'low'; // how well it fits their constraints
  highlights: string[];                  // what they might like
  concerns: string[];                    // what might not work
}

// =============================================================================
// CONVERSATION
// =============================================================================

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

// =============================================================================
// UNIVERSAL DECISION CATEGORIES
// =============================================================================

export type DecisionCategory = 'when' | 'where' | 'what' | 'budget' | 'who' | 'how';

export interface Position {
  view: string;                            // the position (e.g., "Saturday morning")
  weight: number;                          // how many people hold this
  participantIds: string[];                // who holds this position
  severity?: ConcernSeverity;              // highest severity if it's a concern
  intensity?: DesireIntensity;             // highest intensity if it's a desire
}

export interface DecisionQuestion {
  category: DecisionCategory;
  question: string;                        // e.g., "When should we meet?"
  hasConflict: boolean;
  positions?: Position[];                  // only if hasConflict
  consensus?: string;                      // only if !hasConflict
  weight?: number;                         // total weight behind consensus
}

export interface Coupling {
  categories: DecisionCategory[];          // which categories are coupled
  nature: string;                          // how they're coupled
}

// =============================================================================
// QUESTION IDENTIFICATION (New Prompt Type)
// =============================================================================

export interface QuestionIdentificationInput {
  collaboration: Collaboration;            // includes all participants' extractions
}

export interface QuestionIdentificationOutput {
  questions: DecisionQuestion[];           // what needs to be decided
  couplings: Coupling[];                   // how questions interact
  consensusItems: string[];                // constraints with no conflict (just accommodate)
}

// =============================================================================
// CONSOLIDATED CONSTRAINT (for deduplication)
// =============================================================================

export interface ConsolidatedConstraint {
  id: string;
  canonicalText: string;
  category: DecisionCategory;
  type: 'concern' | 'desire';
  severity?: ConcernSeverity;
  intensity?: DesireIntensity;
  weight: number;
  participantIds: string[];
  variants: string[];                      // original wordings
}

// =============================================================================
// TEST FRAMEWORK TYPES
// =============================================================================

export type PromptType = 'briefing' | 'extraction' | 'synthesis' | 'contextualization' | 'questionIdentification';

export interface TestScenario<TInput, TOutput> {
  id: string;
  name: string;
  description: string;
  promptType: PromptType;
  input: TInput;
  expectedBehavior: string[];            // what we expect the output to do
  edgeCaseType?: 'happy-path' | 'edge-case';
}

export interface TestResult<TOutput> {
  scenarioId: string;
  model: string;
  output: TOutput | null;
  rawResponse: string;
  parseSuccess: boolean;
  judgment: JudgmentResult;
  timestamp: Date;
  latencyMs: number;
}

export interface JudgmentResult {
  pass: boolean;
  score: number;                         // 0-100
  criteria: CriterionResult[];
  summary: string;
}

export interface CriterionResult {
  name: string;
  pass: boolean;
  score: number;                         // 0-100
  explanation: string;
}

// =============================================================================
// RUBRIC TYPES
// =============================================================================

export interface Rubric {
  promptType: PromptType;
  criteria: RubricCriterion[];
}

export interface RubricCriterion {
  name: string;
  description: string;
  weight: number;                        // 0-1, all weights should sum to 1
  scoringGuide: string;                  // how to score 0-100
}
