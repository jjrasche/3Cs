/**
 * LLM-as-Judge Framework
 *
 * Provides rubric-based semantic evaluation of LLM outputs.
 * Inspired by OpenAI Evals and Anthropic Constitutional AI approaches.
 *
 * Philosophy:
 * - Use semantic understanding rather than keyword heuristics
 * - Define clear criteria for success/failure
 * - Allow LLM to explain its judgment
 * - Support multiple levels of evaluation (binary pass/fail, scoring, detailed feedback)
 */

import { LLMClient } from './llm-client';

// =============================================================================
// RUBRIC TYPES
// =============================================================================

/**
 * A rubric criterion defines what to evaluate and how.
 */
export interface RubricCriterion {
  /** Unique identifier for this criterion */
  id: string;

  /** What aspect are we evaluating? */
  aspect: string;

  /** Description of what "good" looks like */
  description: string;

  /** How critical is this criterion? */
  weight: 'required' | 'important' | 'nice-to-have';

  /** How to evaluate - binary pass/fail or scored */
  evaluationType: 'binary' | 'score';

  /** For scored criteria: min/max range */
  scoreRange?: { min: number; max: number };
}

/**
 * A rubric is a collection of criteria for evaluating a specific component.
 */
export interface Rubric {
  /** Unique identifier for this rubric */
  id: string;

  /** What component does this rubric evaluate? */
  componentName: string;

  /** Description of what this component should do */
  componentDescription: string;

  /** List of criteria to evaluate */
  criteria: RubricCriterion[];

  /** Instructions for the judge on how to apply this rubric */
  judgeInstructions?: string;
}

// =============================================================================
// EVALUATION TYPES
// =============================================================================

/**
 * Result of evaluating a single criterion.
 */
export interface CriterionEvaluation {
  criterionId: string;
  pass: boolean;
  score?: number;
  reasoning: string;
  evidence?: string; // Quote from output that supports judgment
}

/**
 * Result of evaluating against a rubric.
 */
export interface RubricEvaluation {
  rubricId: string;
  overallPass: boolean;
  criteriaResults: CriterionEvaluation[];
  summary: string;
  criticalFailures: string[]; // Which required criteria failed
}

// =============================================================================
// JUDGE CLIENT
// =============================================================================

export class LLMJudge {
  constructor(private llmClient: LLMClient) {}

  /**
   * Evaluate an LLM output against a rubric.
   *
   * @param rubric - The rubric to evaluate against
   * @param input - The input that was given to the component
   * @param output - The actual output from the component
   * @param expectedBehavior - Optional description of what should happen
   * @returns Evaluation results
   */
  async evaluate(
    rubric: Rubric,
    input: any,
    output: any,
    expectedBehavior?: string
  ): Promise<RubricEvaluation> {
    const systemPrompt = this.buildJudgeSystemPrompt(rubric);
    const userPrompt = this.buildJudgeUserPrompt(rubric, input, output, expectedBehavior);

    const response = await this.llmClient.call(systemPrompt, userPrompt, {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile', // Use more capable model for judging
      temperature: 0.3, // Lower temperature for more consistent evaluation
      jsonMode: true
    });

    const evaluation = JSON.parse(response.content);

    // Convert to our format
    const criteriaResults: CriterionEvaluation[] = evaluation.criteria.map((c: any) => ({
      criterionId: c.criterionId,
      pass: c.pass,
      score: c.score,
      reasoning: c.reasoning,
      evidence: c.evidence
    }));

    // Determine overall pass
    const requiredCriteria = rubric.criteria.filter(c => c.weight === 'required');
    const requiredResults = criteriaResults.filter(r =>
      requiredCriteria.some(c => c.id === r.criterionId)
    );
    const criticalFailures = requiredResults
      .filter(r => !r.pass)
      .map(r => rubric.criteria.find(c => c.id === r.criterionId)?.aspect || r.criterionId);

    const overallPass = criticalFailures.length === 0;

    return {
      rubricId: rubric.id,
      overallPass,
      criteriaResults,
      summary: evaluation.summary,
      criticalFailures
    };
  }

  private buildJudgeSystemPrompt(rubric: Rubric): string {
    return `You are an expert evaluator judging the quality of an LLM component's output.

# Component Being Evaluated
**Name**: ${rubric.componentName}
**Purpose**: ${rubric.componentDescription}

# Your Task
Evaluate the component's output against the criteria in the rubric below.
For each criterion, determine if it passes and provide clear reasoning with evidence from the output.

${rubric.judgeInstructions || ''}

# Evaluation Principles
1. **Be objective**: Base judgments on observable evidence in the output
2. **Be specific**: Quote relevant parts of the output as evidence
3. **Be fair**: Consider the component's purpose and constraints
4. **Be clear**: Explain your reasoning so humans can understand your judgment

# Output Format
Return a JSON object with this structure:
{
  "criteria": [
    {
      "criterionId": "string",
      "pass": boolean,
      "score": number (if applicable),
      "reasoning": "string - explain your judgment",
      "evidence": "string - quote from output that supports your judgment"
    }
  ],
  "summary": "string - overall assessment in 1-2 sentences"
}`;
  }

  private buildJudgeUserPrompt(
    rubric: Rubric,
    input: any,
    output: any,
    expectedBehavior?: string
  ): string {
    let prompt = `# Input Given to Component
${JSON.stringify(input, null, 2)}

# Actual Output from Component
${JSON.stringify(output, null, 2)}

${expectedBehavior ? `# Expected Behavior\n${expectedBehavior}\n\n` : ''}# Rubric Criteria

`;

    for (const criterion of rubric.criteria) {
      prompt += `## ${criterion.id}
**Aspect**: ${criterion.aspect}
**Description**: ${criterion.description}
**Weight**: ${criterion.weight}
**Evaluation Type**: ${criterion.evaluationType}
${criterion.scoreRange ? `**Score Range**: ${criterion.scoreRange.min}-${criterion.scoreRange.max}` : ''}

`;
    }

    prompt += `\nNow evaluate the output against each criterion and return your judgment as JSON.`;

    return prompt;
  }
}

// =============================================================================
// RUBRIC LIBRARY
// =============================================================================

/**
 * Pre-defined rubrics for each component in the 3Cs system.
 */
export const RUBRICS: Record<string, Rubric> = {
  contextualization: {
    id: 'contextualization-v1',
    componentName: 'Contextualization',
    componentDescription:
      'Personalizes a proposal for an individual participant by analyzing how it relates to their specific constraints and desires',
    judgeInstructions: `Key things to check:
- Does the contextualization focus on what THIS participant cares about?
- Is the confidence level appropriate (high = all non-negotiables met, low = violations)?
- Do highlights capture the good aspects for this person?
- Do concerns capture the problematic aspects for this person?`,
    criteria: [
      {
        id: 'confidence-appropriate',
        aspect: 'Confidence Level',
        description:
          'Confidence should be HIGH if all non-negotiables are explicitly satisfied, MEDIUM if non-negotiables met but preferences unmet, LOW if any non-negotiable is violated or unclear',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'highlights-relevant',
        aspect: 'Highlights Relevance',
        description:
          'Highlights should mention aspects of the proposal that satisfy this participant\'s constraints or desires. Should be personalized to what THEY care about.',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'concerns-identified',
        aspect: 'Concerns Identification',
        description:
          'If the proposal violates or fails to address any of the participant\'s constraints, those should be clearly identified in concerns. Should not fabricate concerns where none exist.',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'summary-accurate',
        aspect: 'Summary Accuracy',
        description:
          'The summary should accurately capture the relationship between the proposal and this participant\'s needs in 1-2 sentences',
        weight: 'important',
        evaluationType: 'binary'
      },
      {
        id: 'personalization-quality',
        aspect: 'Personalization Quality',
        description:
          'The contextualization should feel tailored to THIS specific person, not generic. It should show understanding of their unique constraints and priorities.',
        weight: 'important',
        evaluationType: 'score',
        scoreRange: { min: 1, max: 5 }
      }
    ]
  },

  synthesis: {
    id: 'synthesis-v1',
    componentName: 'Synthesis',
    componentDescription:
      'Generates a concrete proposal that addresses participant constraints and desires',
    judgeInstructions: `Key things to check:
- Does the proposal explicitly address all non-negotiable constraints?
- Is the proposal concrete and actionable?
- Does the rationale explain how constraints are satisfied?
- Are the addressedConcerns and addressedDesires arrays accurate?`,
    criteria: [
      {
        id: 'addresses-non-negotiables',
        aspect: 'Non-Negotiable Constraints',
        description:
          'The proposal must explicitly address ALL non-negotiable constraints from all participants. Each non-negotiable should be clearly satisfied in the proposal text.',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'concrete-actionable',
        aspect: 'Concreteness',
        description:
          'The proposal should be specific and actionable, not vague. Should include concrete details (times, places, specifics) rather than generic suggestions.',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'rationale-explains-coverage',
        aspect: 'Rationale Quality',
        description:
          'The rationale should explain HOW the proposal addresses the constraints, not just restate the proposal.',
        weight: 'important',
        evaluationType: 'binary'
      },
      {
        id: 'addressed-arrays-accurate',
        aspect: 'Metadata Accuracy',
        description:
          'The addressedConcerns and addressedDesires arrays should accurately list which constraints/desires the proposal satisfies',
        weight: 'important',
        evaluationType: 'binary'
      }
    ]
  },

  responseDecision: {
    id: 'response-decision-v1',
    componentName: 'Response Decision',
    componentDescription:
      'Determines how a persona should respond to a proposal based on their constraints (accept, accept-with-reservations, object, opt-out)',
    judgeInstructions: `Key things to check:
- Is the response type appropriate for the constraint satisfaction?
- Is the nonNegotiablesSatisfied flag correct?
- Does the reasoning explain the decision clearly?
- Would a person with these constraints reasonably make this decision?

Response type guide:
- accept: All non-negotiables satisfied, happy with proposal
- accept-with-reservations: Non-negotiables met but preferences/desires unmet
- object: Non-negotiables violated or unclear
- opt-out: Uninterested in participating`,
    criteria: [
      {
        id: 'response-type-appropriate',
        aspect: 'Response Type',
        description:
          'The response type (accept/accept-with-reservations/object/opt-out) should match the constraint satisfaction. Object if any non-negotiable is violated.',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'non-negotiables-flag-correct',
        aspect: 'Non-Negotiables Flag',
        description:
          'The nonNegotiablesSatisfied boolean should be true ONLY if ALL non-negotiable constraints are explicitly satisfied in the proposal',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'reasoning-clear',
        aspect: 'Reasoning Quality',
        description:
          'The reasoning should clearly explain WHY this response type was chosen, referencing specific constraints and how they were/were not addressed',
        weight: 'important',
        evaluationType: 'binary'
      },
      {
        id: 'constraint-analysis-accurate',
        aspect: 'Constraint Analysis',
        description:
          'If provided, the constraintAnalysis array should accurately assess each constraint as satisfied or not, with evidence from the proposal',
        weight: 'important',
        evaluationType: 'binary'
      }
    ]
  },

  questionIdentification: {
    id: 'question-identification-v1',
    componentName: 'Question Identification',
    componentDescription:
      'Structures the problem by identifying decision categories, detecting conflicts, and finding constraint couplings',
    judgeInstructions: `Key things to check:
- Are the identified questions/categories appropriate for the constraints?
- Are conflicts correctly detected (including temporal/logical conflicts)?
- Are couplings (dependencies between categories) identified?
- Is the problem structure clear and actionable?`,
    criteria: [
      {
        id: 'categories-comprehensive',
        aspect: 'Category Coverage',
        description:
          'The identified questions/categories should cover all major aspects implied by the participant constraints. Should not miss obvious decision categories.',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'conflicts-detected',
        aspect: 'Conflict Detection',
        description:
          'Should correctly identify when constraints conflict (including temporal conflicts like "ends by 3pm" + "6 hour activity starting at 10am"). Should not falsely claim conflicts where none exist.',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'couplings-identified',
        aspect: 'Coupling Identification',
        description:
          'Should identify when one category constrains another (e.g., budget limits quality, location affects timing)',
        weight: 'important',
        evaluationType: 'binary'
      },
      {
        id: 'structure-actionable',
        aspect: 'Structure Actionability',
        description:
          'The resulting structure should be clear and actionable for synthesis - categories should be well-defined and conflicts/couplings should guide proposal generation',
        weight: 'important',
        evaluationType: 'binary'
      }
    ]
  },

  extraction: {
    id: 'extraction-v1',
    componentName: 'Extraction',
    componentDescription:
      'Extracts constraints (concerns) and desires from participant messages, calibrating severity/intensity based on their language',
    judgeInstructions: `Key things to check:
- Are concerns and desires correctly categorized?
- Is severity/intensity calibrated appropriately to the language used?
- Are the extracted tags capturing the essence of what the person said?
- Is the signal (complete/needs-more-info/opt-out) appropriate?`,
    criteria: [
      {
        id: 'tags-accurate',
        aspect: 'Tag Extraction Accuracy',
        description:
          'Tags should accurately capture the concerns and desires expressed in the participant\'s message. Should not add things they didn\'t say or miss important constraints.',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'severity-calibration',
        aspect: 'Severity/Intensity Calibration',
        description:
          'Concern severity and desire intensity should match the language used. "Must have" → non-negotiable, "would like" → preference, "if possible" → nice-to-have. Should not over-inflate or under-calibrate.',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'signal-appropriate',
        aspect: 'Signal Appropriateness',
        description:
          'The signal should be "complete" if participant provided meaningful input, "needs-more-info" if they were vague/non-committal, "opt-out" if they declined. Should match their engagement level.',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'underlying-reasoning',
        aspect: 'Underlying Reasoning Quality',
        description:
          'For important constraints, the underlying reason should capture WHY this matters to them (from their message or reasonable inference)',
        weight: 'important',
        evaluationType: 'binary'
      }
    ]
  },

  briefing: {
    id: 'briefing-v1',
    componentName: 'Briefing',
    componentDescription:
      'Orients a participant to a collaboration by explaining what it\'s about, who\'s involved, current state, and what\'s expected of them',
    judgeInstructions: `Key things to check:
- Does the briefing clearly explain what the collaboration is about?
- Is the tone warm but efficient (not stiff/corporate)?
- Does it give them enough context to participate meaningfully?
- If they have known constraints, does it acknowledge them?`,
    criteria: [
      {
        id: 'context-complete',
        aspect: 'Context Completeness',
        description:
          'The briefing should cover: (1) what the collaboration is about, (2) who\'s involved, (3) current state, (4) what\'s expected of them next. Should not leave them confused.',
        weight: 'required',
        evaluationType: 'binary'
      },
      {
        id: 'tone-appropriate',
        aspect: 'Tone Quality',
        description:
          'Should sound warm but efficient, like helping a friend understand a situation. Avoid stiff corporate phrases like "looking forward to hearing your thoughts" or "your input will be valuable".',
        weight: 'important',
        evaluationType: 'binary'
      },
      {
        id: 'personalization-present',
        aspect: 'Personalization',
        description:
          'If the participant has known constraints or profile info, the briefing should acknowledge relevant ones (e.g., "I see you\'re vegetarian - we\'ll factor that in")',
        weight: 'important',
        evaluationType: 'binary'
      },
      {
        id: 'clarity-conciseness',
        aspect: 'Clarity and Conciseness',
        description:
          'The briefing should be clear and concise - get them oriented without being chatty or overwhelming with details',
        weight: 'important',
        evaluationType: 'score',
        scoreRange: { min: 1, max: 5 }
      }
    ]
  }
};
