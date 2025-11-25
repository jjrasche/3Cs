/**
 * Simulation Runner: Orchestrates full collaboration flow
 *
 * Runs a complete collaboration from briefing through consensus:
 * 1. Brief each persona
 * 2. Extract concerns/desires from each persona
 * 3. Identify questions and couplings
 * 4. Synthesize proposals
 * 5. Contextualize for each persona
 * 6. Collect responses
 * 7. Iterate if objections
 */

import {
  SimulationScenario,
  SimulationState,
  SimulationResult,
  SimulationResultSerialized,
  SimulationConfig,
  PersonaState,
  SynthesisRound,
  SynthesisRoundSerialized,
  ParticipantResponse,
  PersonaTranscript,
  Persona,
  ConstraintAnalysisItem
} from './types';
import { PersonaPlayer, ResponseDecider } from './persona-player';
import { LLMClient } from '../framework/llm-client';
import { buildUserPrompt, PROMPTS } from '../prompts/index';
import {
  Collaboration,
  Constraint,
  Participant,
  BriefingInput,
  ExtractionInput,
  SynthesisInput,
  ContextualizationInput,
  QuestionIdentificationInput,
  ConversationTurn,
  Tag,
  Proposal
} from '../types';

/**
 * Safely convert a value to string, handling objects that LLM may return
 */
function safeString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value.text) return value.text;
    if (value.proposal) return value.proposal;
    if (value.description) return value.description;
    return JSON.stringify(value);
  }
  return String(value);
}

export class SimulationRunner {
  private llmClient: LLMClient;
  private personaPlayer: PersonaPlayer;
  private responseDecider: ResponseDecider;
  private config: SimulationConfig;

  constructor(llmClient: LLMClient, config: SimulationConfig) {
    this.llmClient = llmClient;
    this.personaPlayer = new PersonaPlayer(llmClient);
    this.responseDecider = new ResponseDecider(llmClient);
    this.config = config;
  }

  /**
   * Run a complete simulation scenario
   */
  async runSimulation(scenario: SimulationScenario): Promise<SimulationResultSerialized> {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`SIMULATION: ${scenario.name}`);
    console.log(`${'='.repeat(80)}\n`);

    // Initialize state
    const state = this.initializeState(scenario);

    try {
      // Phase 1: Briefing (optional - could skip for now)
      if (this.config.verbose) {
        console.log('\n--- PHASE 1: Briefing ---\n');
      }
      // Skipping briefing for now - personas know context

      // Phase 2: Extraction
      if (this.config.verbose) {
        console.log('\n--- PHASE 2: Extraction ---\n');
      }
      const extractionStart = Date.now();
      await this.runExtractionPhase(state);
      const extractionMs = Date.now() - extractionStart;

      // Phase 3: Question Identification + Synthesis Loop
      let round = 0;
      let converged = false;

      while (round < this.config.maxRounds && !converged) {
        round++;

        if (this.config.verbose) {
          console.log(`\n--- ROUND ${round}: Question ID + Synthesis ---\n`);
        }
        const synthesisStart = Date.now();

        // Question Identification
        const questionId = await this.runQuestionIdentification(state);

        // Synthesis
        const synthesis = await this.runSynthesis(state);
        const synthesisMs = Date.now() - synthesisStart;

        // Phase 4: Contextualization
        if (this.config.verbose) {
          console.log(`\n--- ROUND ${round}: Contextualization ---\n`);
        }
        const contextualizationStart = Date.now();
        await this.runContextualization(state, synthesis.proposals);
        const contextualizationMs = Date.now() - contextualizationStart;

        // Phase 5: Collect Responses
        if (this.config.verbose) {
          console.log(`\n--- ROUND ${round}: Responses ---\n`);
        }
        const responses = await this.collectResponses(state);

        // Record round
        state.synthesisHistory.push({
          roundNumber: round,
          questionIdentification: questionId,
          synthesis,
          responses,
          outcome: this.determineRoundOutcome(responses)
        });

        // Check convergence
        converged = this.checkConvergence(responses);

        if (converged) {
          state.status = 'converged';
        } else if (round >= this.config.maxRounds) {
          state.status = 'diverged';
        }
      }

      // Generate result
      const totalMs = Date.now() - startTime;
      return this.generateResult(scenario, state, {
        totalMs,
        extractionMs,
        synthesisMs: 0, // TODO: sum all synthesis rounds
        contextualizationMs: 0 // TODO: sum all contextualization rounds
      });

    } catch (error) {
      console.error('Simulation failed:', error);
      throw error;
    }
  }

  /**
   * Initialize simulation state
   */
  private initializeState(scenario: SimulationScenario): SimulationState {
    // Seed non-negotiable constraints from personas into collaboration
    // This ensures critical constraints are available to synthesis even if
    // extraction doesn't fully capture them from conversation
    const seededConstraints = this.seedNonNegotiableConstraints(scenario.personas);

    // Create collaboration
    const collaboration: Collaboration = {
      id: scenario.id,
      outcome: scenario.collaboration.outcome,
      creator: scenario.collaboration.creator,
      participants: scenario.personas.map(persona => ({
        id: persona.id,
        name: persona.name
      })),
      constraints: seededConstraints,
      when: undefined,
      where: undefined
    };

    // Create persona states
    const personaStates = new Map<string, PersonaState>();
    for (const persona of scenario.personas) {
      const participant = collaboration.participants.find(p => p.id === persona.id)!;
      personaStates.set(persona.id, {
        persona,
        participant,
        conversationHistory: [],
        extractionComplete: false
      });
    }

    return {
      scenario,
      collaboration,
      round: 0,
      personaStates,
      synthesisHistory: [],
      status: 'extracting'
    };
  }

  /**
   * Extract non-negotiable constraints from personas and convert to Collaboration constraints.
   * This ensures critical constraints are visible to synthesis even if extraction misses them.
   */
  private seedNonNegotiableConstraints(personas: Persona[]): Constraint[] {
    const constraints: Constraint[] = [];

    for (const persona of personas) {
      for (const c of persona.persistentConstraints) {
        // Only seed non-negotiables and strong preferences
        if (c.severity === 'non-negotiable' || c.severity === 'strong-preference') {
          constraints.push({
            text: `[${c.severity}] ${c.text}`,
            anonymous: false,
            participantId: persona.id
          });
        }
      }
    }

    if (this.config.verbose && constraints.length > 0) {
      console.log(`\n📋 Seeded ${constraints.length} critical constraints into collaboration`);
      for (const c of constraints) {
        console.log(`   - ${c.text}`);
      }
    }

    return constraints;
  }

  /**
   * Run extraction phase for all personas
   */
  private async runExtractionPhase(state: SimulationState): Promise<void> {
    // Extract from each persona SEQUENTIALLY to respect rate limits
    // (They don't see each other's conversations, but parallel execution
    //  causes quota contention with free-tier API limits)
    for (const personaState of Array.from(state.personaStates.values())) {
      await this.extractFromPersona(state, personaState);
    }

    if (this.config.verbose) {
      console.log(`\n✓ Extraction complete for ${state.personaStates.size} personas\n`);
    }
  }

  /**
   * Extract concerns/desires from a single persona
   */
  private async extractFromPersona(
    state: SimulationState,
    personaState: PersonaState
  ): Promise<void> {
    let turns = 0;

    while (turns < this.config.extractionMaxTurns && !personaState.extractionComplete) {
      turns++;

      // Get AI's extraction message
      const extractionInput: ExtractionInput = {
        collaboration: state.collaboration,
        participant: personaState.participant,
        conversationHistory: personaState.conversationHistory,
        userMessage: turns === 1
          ? `Hi! I'm ${personaState.persona.name}, I'd love to join.`
          : personaState.conversationHistory[personaState.conversationHistory.length - 1].content
      };

      const extractionPrompt = buildUserPrompt('extraction', extractionInput);
      const extractionResponse = await this.llmClient.call(
        PROMPTS.extraction,
        extractionPrompt,
        {
          provider: 'groq',
          model: this.config.extractionModel,
          temperature: 0.7,
          jsonMode: true
        }
      );

      const extraction = JSON.parse(extractionResponse.content);

      // Add AI message to history
      personaState.conversationHistory.push({
        role: 'assistant',
        content: extraction.message
      });

      // Update participant extraction
      personaState.participant.extraction = extraction;

      if (extraction.signal === 'complete') {
        personaState.extractionComplete = true;
        break;
      }

      // Generate persona response
      const personaResponse = await this.personaPlayer.generateResponse({
        persona: personaState.persona,
        collaboration: state.collaboration,
        conversationHistory: personaState.conversationHistory,
        currentAIMessage: extraction.message
      });

      // Add user message to history
      personaState.conversationHistory.push({
        role: 'user',
        content: personaResponse.message
      });

      if (personaResponse.done) {
        personaState.extractionComplete = true;
        break;
      }
    }

    if (this.config.verbose) {
      console.log(`✓ ${personaState.persona.name}: ${personaState.participant.extraction?.tags.length || 0} tags extracted in ${turns} turns`);
    }
  }

  /**
   * Run question identification
   */
  private async runQuestionIdentification(state: SimulationState): Promise<any> {
    const input: QuestionIdentificationInput = {
      collaboration: state.collaboration
    };

    const prompt = buildUserPrompt('questionIdentification', input);
    const response = await this.llmClient.call(
      PROMPTS.questionIdentification,
      prompt,
      {
        provider: 'groq',
        model: this.config.synthesisModel,
        temperature: 0.7,
        jsonMode: true
      }
    );

    const questionId = JSON.parse(response.content);

    if (this.config.verbose) {
      console.log(`✓ Identified ${questionId.questions.length} questions, ${questionId.couplings.length} couplings`);
    }

    return questionId;
  }

  /**
   * Run synthesis
   */
  private async runSynthesis(state: SimulationState): Promise<any> {
    const input: SynthesisInput = {
      collaboration: state.collaboration
    };

    const prompt = buildUserPrompt('synthesis', input);
    const response = await this.llmClient.call(
      PROMPTS.synthesis,
      prompt,
      {
        provider: 'groq',
        model: this.config.synthesisModel,
        temperature: 0.7,
        jsonMode: true
      }
    );

    const synthesis = JSON.parse(response.content);

    if (this.config.verbose) {
      console.log(`✓ Generated ${synthesis.proposals.length} proposals, ${synthesis.tensions.length} tensions`);
      for (const proposal of synthesis.proposals) {
        console.log(`  - ${safeString(proposal.question)}: ${safeString(proposal.proposal)}`);
      }
    }

    return synthesis;
  }

  /**
   * Run contextualization for each persona
   */
  private async runContextualization(
    state: SimulationState,
    proposals: any[]
  ): Promise<void> {
    // For simplicity, just use the first proposal
    // TODO: handle multiple proposals
    if (proposals.length === 0) {
      return;
    }

    const proposal = proposals[0];

    // Run sequentially to respect rate limits
    for (const personaState of Array.from(state.personaStates.values())) {
      const input: ContextualizationInput = {
        proposal,
        participant: personaState.participant
      };

      const prompt = buildUserPrompt('contextualization', input);
      const response = await this.llmClient.call(
        PROMPTS.contextualization,
        prompt,
        {
          provider: 'groq',
          model: this.config.synthesisModel,
          temperature: 0.7,
          jsonMode: true
        }
      );

      const contextualization = JSON.parse(response.content);
      personaState.contextualization = contextualization;
      personaState.currentProposal = proposal;

      if (this.config.verbose) {
        console.log(`✓ ${personaState.persona.name}: ${contextualization.confidence} confidence`);
      }
    }
  }

  /**
   * Collect responses from all personas
   */
  private async collectResponses(
    state: SimulationState
  ): Promise<Map<string, ParticipantResponse>> {
    const responses = new Map<string, ParticipantResponse>();

    // Run sequentially to respect rate limits
    for (const [id, personaState] of Array.from(state.personaStates.entries())) {
      if (!personaState.currentProposal || !personaState.contextualization) {
        continue;
      }

      const decision = await this.responseDecider.decideResponse(
        personaState.persona,
        personaState.contextualization,
        personaState.currentProposal
      );

      const response: ParticipantResponse = {
        personaId: id,
        type: decision.type,
        reasoning: decision.reasoning,
        nonNegotiablesSatisfied: decision.nonNegotiablesSatisfied,
        constraintAnalysis: decision.constraintAnalysis,
        concerns: decision.concerns,
        suggestions: decision.suggestions
      };

      responses.set(id, response);
      personaState.response = response;

      if (this.config.verbose) {
        console.log(`✓ ${personaState.persona.name}: ${decision.type}`);
      }
    }

    return responses;
  }

  /**
   * Determine outcome of a synthesis round
   */
  private determineRoundOutcome(responses: Map<string, ParticipantResponse>): 'accepted' | 'objections' | 'opt-outs' {
    let objections = 0;
    let optOuts = 0;

    for (const response of Array.from(responses.values())) {
      if (response.type === 'object') objections++;
      if (response.type === 'opt-out') optOuts++;
    }

    if (optOuts > 0) return 'opt-outs';
    if (objections > 0) return 'objections';
    return 'accepted';
  }

  /**
   * Check if simulation has converged
   */
  private checkConvergence(responses: Map<string, ParticipantResponse>): boolean {
    // Converged if no objections
    for (const response of Array.from(responses.values())) {
      if (response.type === 'object') {
        return false;
      }
    }
    return true;
  }

  /**
   * Generate final simulation result (serializable version)
   */
  private generateResult(
    scenario: SimulationScenario,
    state: SimulationState,
    timing: any
  ): SimulationResultSerialized {
    // Count responses
    const lastRound = state.synthesisHistory[state.synthesisHistory.length - 1];
    let acceptances = 0;
    let reservations = 0;
    let objections = 0;
    let optOuts = 0;

    if (lastRound) {
      for (const response of Array.from(lastRound.responses.values())) {
        if (response.type === 'accept') acceptances++;
        if (response.type === 'accept-with-reservations') reservations++;
        if (response.type === 'object') objections++;
        if (response.type === 'opt-out') optOuts++;
      }
    }

    const total = acceptances + reservations + objections + optOuts;
    const acceptanceRate = total > 0 ? (acceptances + reservations) / total : 0;

    // Validate constraint satisfaction
    const constraintValidation = this.validateConstraints(scenario, state, lastRound);

    // Build conversation transcripts
    const conversationTranscripts = this.buildTranscripts(state);

    // Serialize synthesis rounds (convert Maps to objects)
    const serializedRounds = this.serializeRounds(state.synthesisHistory);

    // Build persona feedback map as object
    const personaFeedback: Record<string, string> = {};
    if (lastRound) {
      for (const [id, response] of Array.from(lastRound.responses.entries())) {
        personaFeedback[id] = response.reasoning;
      }
    }

    // Determine success - must satisfy ALL criteria:
    // 1. Converged (no objections blocking progress)
    // 2. Acceptance rate meets threshold
    // 3. Opt-outs within limit
    // 4. No violated constraints (response-informed validation is authoritative)
    //
    // Note: We removed the nonNegotiableReservations check because:
    // - If constraintValidation shows all non-negotiables satisfied, that's authoritative
    // - Reservations may be about OTHER issues, not non-negotiables
    // - The constraint analysis already checks each non-negotiable explicitly
    const success = state.status === 'converged' &&
      acceptanceRate >= scenario.success.minAcceptanceRate &&
      optOuts <= scenario.success.maxOptOuts &&
      constraintValidation.violatedConstraints.length === 0;

    return {
      scenario,
      success,
      convergence: {
        converged: state.status === 'converged',
        rounds: state.synthesisHistory.length,
        finalStatus: state.status === 'converged' ? 'consensus' : 'diverged'
      },
      participation: {
        acceptances,
        acceptancesWithReservations: reservations,
        objections,
        optOuts,
        acceptanceRate
      },
      constraints: constraintValidation,
      quality: {
        proposalSpecificity: 0, // TODO
        creativeSynthesis: false, // TODO
        honestFailure: false // TODO
      },
      history: {
        rounds: serializedRounds,
        finalProposal: lastRound?.synthesis.proposals,
        personaFeedback,
        conversationTranscripts
      },
      timing
    };
  }

  /**
   * Validate that non-negotiable constraints are satisfied using response-informed approach.
   * Uses the persona's own response as the source of truth rather than keyword matching.
   */
  private validateConstraints(
    scenario: SimulationScenario,
    state: SimulationState,
    lastRound?: SynthesisRound
  ): { totalNonNegotiable: number; satisfiedNonNegotiable: number; violatedConstraints: string[]; satisfiedConstraints: string[] } {
    const violatedConstraints: string[] = [];
    const satisfiedConstraints: string[] = [];

    // Collect all non-negotiable constraints from personas
    const nonNegotiables: { personaId: string; personaName: string; text: string }[] = [];
    for (const persona of scenario.personas) {
      for (const constraint of persona.persistentConstraints) {
        if (constraint.type === 'concern' && constraint.severity === 'non-negotiable') {
          nonNegotiables.push({
            personaId: persona.id,
            personaName: persona.name,
            text: constraint.text
          });
        }
      }
    }

    const totalNonNegotiable = nonNegotiables.length;

    if (!lastRound) {
      // No round = all violated
      for (const c of nonNegotiables) {
        violatedConstraints.push(`${c.personaName}: ${c.text}`);
      }
      return { totalNonNegotiable, satisfiedNonNegotiable: 0, violatedConstraints, satisfiedConstraints };
    }

    // Check each non-negotiable against the persona's own response
    for (const constraint of nonNegotiables) {
      const response = lastRound.responses.get(constraint.personaId);
      const personaState = state.personaStates.get(constraint.personaId);

      const isSatisfied = this.isConstraintSatisfiedByResponse(
        constraint.text,
        response,
        personaState
      );

      if (isSatisfied) {
        satisfiedConstraints.push(`${constraint.personaName}: ${constraint.text}`);
      } else {
        violatedConstraints.push(`${constraint.personaName}: ${constraint.text}`);
      }
    }

    return {
      totalNonNegotiable,
      satisfiedNonNegotiable: satisfiedConstraints.length,
      violatedConstraints,
      satisfiedConstraints
    };
  }

  /**
   * Determine if a constraint is satisfied based on the persona's response.
   * Uses the response's constraint analysis if available, otherwise infers from response type.
   */
  private isConstraintSatisfiedByResponse(
    constraintText: string,
    response?: ParticipantResponse,
    personaState?: PersonaState
  ): boolean {
    if (!response) return false;

    // If response has explicit nonNegotiablesSatisfied flag, use it
    if (typeof response.nonNegotiablesSatisfied === 'boolean') {
      return response.nonNegotiablesSatisfied;
    }

    // If response has constraint analysis, check it
    if (response.constraintAnalysis && response.constraintAnalysis.length > 0) {
      // Find the analysis for this specific constraint
      const constraintLower = constraintText.toLowerCase();
      const analysis = response.constraintAnalysis.find(
        (a: ConstraintAnalysisItem) => {
          // Check if constraint texts overlap significantly
          const analysisLower = a.constraint.toLowerCase();
          return constraintLower.includes(analysisLower.slice(0, 15)) ||
                 analysisLower.includes(constraintLower.slice(0, 15));
        }
      );
      if (analysis) {
        return analysis.satisfied;
      }
    }

    // Fallback: infer from response type
    // If persona objected, their non-negotiables are definitely not satisfied
    if (response.type === 'object') {
      return false;
    }

    // If accept with reservations and concerns/reasoning mention this constraint, not satisfied
    if (response.type === 'accept-with-reservations') {
      const constraintKeywords = constraintText.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4);
      const concernsText = (response.concerns || []).join(' ').toLowerCase();
      const reasoningText = (response.reasoning || '').toLowerCase();

      // If concerns or reasoning mention this constraint topic, likely not fully satisfied
      const mentionsConstraint = constraintKeywords.some(kw =>
        concernsText.includes(kw) || reasoningText.includes(kw)
      );

      if (mentionsConstraint) {
        return false;
      }
    }

    // If clean accept, assume satisfied
    return response.type === 'accept';
  }

  /**
   * Count how many personas with non-negotiable constraints have reservations.
   * If a persona with flex:0 constraints responds with "accept-with-reservations",
   * this indicates their non-negotiable wasn't fully satisfied.
   */
  private countNonNegotiableReservations(
    scenario: SimulationScenario,
    lastRound?: SynthesisRound
  ): number {
    if (!lastRound) return 0;

    let count = 0;

    // Find personas who have non-negotiable constraints
    const personasWithNonNegotiables = new Set<string>();
    for (const persona of scenario.personas) {
      const hasNonNegotiable = persona.persistentConstraints.some(
        c => c.type === 'concern' && c.severity === 'non-negotiable'
      );
      if (hasNonNegotiable) {
        personasWithNonNegotiables.add(persona.id);
      }
    }

    // Check their responses
    for (const [personaId, response] of Array.from(lastRound.responses.entries())) {
      if (personasWithNonNegotiables.has(personaId)) {
        if (response.type === 'accept-with-reservations') {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Build conversation transcripts for each persona
   */
  private buildTranscripts(state: SimulationState): PersonaTranscript[] {
    const transcripts: PersonaTranscript[] = [];

    for (const [id, personaState] of Array.from(state.personaStates.entries())) {
      transcripts.push({
        personaId: id,
        personaName: personaState.persona.name,
        turns: personaState.conversationHistory,
        extractedTags: personaState.participant.extraction?.tags || [],
        extractionComplete: personaState.extractionComplete
      });
    }

    return transcripts;
  }

  /**
   * Serialize synthesis rounds (convert Maps to objects)
   */
  private serializeRounds(rounds: SynthesisRound[]): SynthesisRoundSerialized[] {
    return rounds.map(round => ({
      roundNumber: round.roundNumber,
      questionIdentification: round.questionIdentification,
      synthesis: round.synthesis,
      responses: Object.fromEntries(round.responses),
      outcome: round.outcome
    }));
  }
}
