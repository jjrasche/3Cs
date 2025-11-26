/**
 * LLM-as-User: Plays personas during extraction conversations
 *
 * Takes a persona definition and generates realistic responses
 * that match their personality, constraints, and communication style.
 */

import { Persona, PersonaPromptContext, PersonaUserResponse } from './types';
import { ConversationTurn } from '../types';
import { LLMClient, setLogContext } from '../framework/llm-client';

// =============================================================================
// PERSONA PLAYER PROMPT
// =============================================================================

// Persona player prompt with explicit constraint severity rules
const PERSONA_PLAYER_PROMPT = `You are roleplaying as a USER in a collaboration conversation.

CRITICAL RULES FOR CONSTRAINTS:
- flex:0 = NON-NEGOTIABLE. You MUST mention this constraint clearly and CANNOT accept if it's not addressed.
- flex:0.1-0.3 = STRONG PREFERENCE. Express clearly, only accept if addressed or offer compromise.
- flex:0.4-0.7 = PREFERENCE. Mention if relevant, flexible on solutions.
- flex:0.8+ = NICE TO HAVE. Mention only if it fits naturally.

Express constraints naturally based on personality. Signal done=true when your main points are covered.

Output JSON only: {"message":"your response","done":boolean,"reasoning":"internal notes"}`;

// =============================================================================
// PERSONA PLAYER
// =============================================================================

export class PersonaPlayer {
  private llmClient: LLMClient;

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
  }

  /**
   * Generate a response from a persona during extraction
   */
  async generateResponse(context: PersonaPromptContext): Promise<PersonaUserResponse> {
    const userPrompt = this.buildUserPrompt(context);

    // Set logging context
    setLogContext({
      phase: 'persona-response',
      personaId: context.persona.id
    });

    const response = await this.llmClient.call(
      PERSONA_PLAYER_PROMPT,
      userPrompt,
      {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',  // 8b for speed and lower token usage
        temperature: 0.7,
        jsonMode: true
      }
    );

    try {
      const parsed = JSON.parse(response.content);
      return {
        message: parsed.message,
        done: parsed.done || false,
        reasoning: parsed.reasoning
      };
    } catch (e) {
      console.error('Failed to parse persona response:', response.content);
      throw new Error('Persona player returned invalid JSON');
    }
  }

  /**
   * Build compact user prompt (optimized for 6000 TPM limit)
   */
  private buildUserPrompt(context: PersonaPromptContext): string {
    const { persona, collaboration, conversationHistory, currentAIMessage } = context;

    // Constraints with severity for clear constraint enforcement
    const constraints = persona.persistentConstraints
      .map(c => {
        const severity = c.severity || c.intensity || 'preference';
        return `${c.text} [flex:${c.flexibility}, ${severity}]`;
      })
      .join('; ');

    // Compact history (last 2 turns only to save tokens)
    const recentHistory = conversationHistory.slice(-4)
      .map(t => `${t.role === 'user' ? 'You' : 'AI'}: ${t.content}`)
      .join('\n');

    return `PERSONA: ${persona.name} | flex:${persona.personality.flexibility} | ${persona.communication.verbosity}
CONSTRAINTS: ${constraints}
TOPIC: ${collaboration.outcome}
${recentHistory ? `HISTORY:\n${recentHistory}\n` : ''}AI: "${currentAIMessage}"
Respond as ${persona.name}:`;
  }

  /**
   * Analyze conversation history to see what constraints have been mentioned
   */
  private analyzeMentionedConstraints(
    history: ConversationTurn[],
    persona: Persona
  ): string[] {
    const mentioned: string[] = [];

    // Simple keyword matching - could be improved with embeddings
    const userMessages = history
      .filter(turn => turn.role === 'user')
      .map(turn => turn.content.toLowerCase());

    for (const constraint of persona.persistentConstraints) {
      const keywords = this.extractKeywords(constraint.text);

      for (const message of userMessages) {
        if (keywords.some(kw => message.includes(kw.toLowerCase()))) {
          mentioned.push(constraint.text);
          break;
        }
      }
    }

    return mentioned;
  }

  /**
   * Extract keywords from constraint text for matching
   */
  private extractKeywords(text: string): string[] {
    // Remove common words and extract key terms
    const commonWords = ['the', 'a', 'an', 'or', 'and', 'for', 'with', 'required', 'must', 'need'];
    const words = text.toLowerCase().split(/\s+/);

    return words.filter(word => !commonWords.includes(word) && word.length > 3);
  }
}

// =============================================================================
// RESPONSE DECISION PLAYER
// =============================================================================

// Response decision prompt with explicit constraint enforcement
const RESPONSE_DECISION_PROMPT = `Decide how this person would respond to the proposal.

CRITICAL CONSTRAINT SATISFACTION RULES:
- A constraint is ONLY satisfied if the proposal EXPLICITLY addresses it with specific details
- "Not explicitly addressed" = NOT SATISFIED (satisfied: false)
- "Implied" or "assumed" = NOT SATISFIED (satisfied: false)
- If evidence says "not addressed", "implied", "inferred", or similar = satisfied MUST be false
- For non-negotiable (flex:0) constraints: If NOT explicitly satisfied → MUST use "object"
- For strong preferences (flex:0.1-0.3): If not satisfied → use "accept-with-reservations"
- Only use "accept" if ALL non-negotiables are explicitly addressed in the proposal

DECISION RULES:
- If ANY flex:0 constraint has satisfied=false → type MUST be "object"
- If all flex:0 satisfied but flex:0.1-0.3 not satisfied → type is "accept-with-reservations"
- If all important constraints explicitly satisfied → type is "accept"
- nonNegotiablesSatisfied = true ONLY if ALL flex:0 constraints have satisfied=true

Output JSON:
{
  "type": "accept|accept-with-reservations|object|opt-out",
  "reasoning": "why this decision",
  "nonNegotiablesSatisfied": true/false,
  "constraintAnalysis": [{"constraint": "text", "satisfied": true/false, "evidence": "EXACT quote from proposal, or 'NOT ADDRESSED' if not mentioned"}],
  "concerns": ["any remaining concerns"],
  "suggestions": ["improvements if objecting"]
}`;

export class ResponseDecider {
  private llmClient: LLMClient;

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
  }

  /**
   * Decide how a persona would respond to a proposal
   */
  async decideResponse(
    persona: Persona,
    contextualization: any,
    proposal: any
  ): Promise<any> {
    const userPrompt = this.buildResponsePrompt(persona, contextualization, proposal);

    // Set logging context
    setLogContext({
      phase: 'response-decision',
      personaId: persona.id
    });

    const response = await this.llmClient.call(
      RESPONSE_DECISION_PROMPT,
      userPrompt,
      {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',  // 8b for speed and lower token usage
        temperature: 0.7,
        jsonMode: true
      }
    );

    try {
      return JSON.parse(response.content);
    } catch (e) {
      console.error('Failed to parse response decision:', response.content);
      throw new Error('Response decider returned invalid JSON');
    }
  }

  /**
   * Build prompt for response decision with constraint severity
   */
  private buildResponsePrompt(
    persona: Persona,
    contextualization: any,
    proposal: any
  ): string {
    // Include severity so LLM knows which constraints are non-negotiable
    const constraints = persona.persistentConstraints
      .map(c => {
        const severity = c.severity || c.intensity || 'preference';
        return `${c.text} [flex:${c.flexibility}, ${severity}]`;
      })
      .join('; ');

    return `PERSON: ${persona.name} | personality flex:${persona.personality.flexibility}
CONSTRAINTS: ${constraints}
PROPOSAL: ${proposal.question} → ${proposal.proposal}
RATIONALE: ${proposal.rationale || 'none provided'}
ADDRESSED: ${(proposal.addressedConcerns || []).join(', ') || 'none listed'}
CONTEXT: ${contextualization.summary} (confidence: ${contextualization.confidence})
Decide:`;
  }
}
