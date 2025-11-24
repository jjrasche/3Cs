/**
 * LLM Judge - Evaluates prompt outputs against rubrics
 *
 * Uses an LLM to score outputs on specific criteria
 */

import { LLMClient, LLMConfig } from './llm-client';
import {
  PromptType,
  JudgmentResult,
  CriterionResult,
  Rubric,
  RubricCriterion
} from '../types';

// =============================================================================
// RUBRICS FOR EACH PROMPT TYPE
// =============================================================================

const RUBRICS: Record<PromptType, Rubric> = {
  briefing: {
    promptType: 'briefing',
    criteria: [
      {
        name: 'Clarity',
        description: 'Is the briefing clear and easy to understand?',
        weight: 0.25,
        scoringGuide: '5: Crystal clear. 4: Very clear. 3: Understandable. 2: Some confusion. 1: Unclear.'
      },
      {
        name: 'Completeness',
        description: 'Does it cover what the collaboration is about, current state, and what to expect?',
        weight: 0.25,
        scoringGuide: '5: Covers all key info. 4: Covers most. 3: Adequate. 2: Missing context. 1: Missing critical info.'
      },
      {
        name: 'Personalization',
        description: 'Is it tailored to this specific person and their profile?',
        weight: 0.25,
        scoringGuide: '5: Highly personalized. 4: Well personalized. 3: Some personalization. 2: Generic. 1: Ignores profile.'
      },
      {
        name: 'Tone',
        description: 'Does it sound like a competent concierge - experienced, helpful, not robotic?',
        weight: 0.25,
        scoringGuide: '5: Natural, warm. 4: Friendly. 3: Acceptable. 2: Stiff. 1: Robotic.'
      }
    ]
  },

  extraction: {
    promptType: 'extraction',
    criteria: [
      {
        name: 'Tag Accuracy',
        description: 'Are the extracted tags accurate to what the user said? No over-interpretation?',
        weight: 0.3,
        scoringGuide: '5: Exactly captures input. 4: Very accurate. 3: Mostly accurate. 2: Some issues. 1: Invents or misses key points.'
      },
      {
        name: 'Priority Assignment',
        description: 'Are severity/intensity levels correctly assigned based on language cues?',
        weight: 0.2,
        scoringGuide: '5: Perfect match. 4: Very good. 3: Mostly correct. 2: Some wrong. 1: Priorities wrong.'
      },
      {
        name: 'Signal Appropriateness',
        description: 'Is the signal (complete/deepen/expand) appropriate for the conversation state?',
        weight: 0.2,
        scoringGuide: '5: Perfect signal. 4: Good choice. 3: Reasonable. 2: Suboptimal. 1: Wrong signal.'
      },
      {
        name: 'Response Quality',
        description: 'Is the AI message helpful - good follow-up question or appropriate closing?',
        weight: 0.2,
        scoringGuide: '5: Insightful. 4: Helpful. 3: Acceptable. 2: Weak. 1: Poor response.'
      },
      {
        name: 'Concern vs Desire Classification',
        description: 'Are items correctly classified as concerns (problems) vs desires (wants)?',
        weight: 0.1,
        scoringGuide: '5: All correct. 4: Nearly all. 3: Mostly correct. 2: Some errors. 1: Major errors.'
      }
    ]
  },

  synthesis: {
    promptType: 'synthesis',
    criteria: [
      {
        name: 'Constraint Satisfaction',
        description: 'Do proposals satisfy high-priority constraints from all participants?',
        weight: 0.3,
        scoringGuide: '5: All satisfied. 4: Most satisfied. 3: Key ones satisfied. 2: Some missed. 1: Ignores key constraints.'
      },
      {
        name: 'Creative Synthesis',
        description: 'Does it find solutions rather than just compromises? Third options?',
        weight: 0.2,
        scoringGuide: '5: Creative solutions. 4: Good synthesis. 3: Reasonable. 2: Just compromises. 1: Ignores conflicts.'
      },
      {
        name: 'Actionability',
        description: 'Are proposals specific and actionable, not vague?',
        weight: 0.2,
        scoringGuide: '5: Very specific. 4: Actionable. 3: Adequate. 2: Somewhat vague. 1: Too vague.'
      },
      {
        name: 'Tension Handling',
        description: 'Are conflicts identified and handled transparently?',
        weight: 0.15,
        scoringGuide: '5: Clear with options. 4: Well handled. 3: Acknowledged. 2: Poorly handled. 1: Ignored.'
      },
      {
        name: 'Consensus Through Obviousness',
        description: 'Would people respond "yeah, that works" without needing to debate?',
        weight: 0.15,
        scoringGuide: '5: Obviously good. 4: Would accept. 3: Acceptable. 2: Debatable. 1: Would disagree.'
      }
    ]
  },

  contextualization: {
    promptType: 'contextualization',
    criteria: [
      {
        name: 'Accuracy',
        description: 'Is the summary accurate about how the proposal affects this person?',
        weight: 0.35,
        scoringGuide: '5: Completely accurate. 4: Very accurate. 3: Mostly accurate. 2: Some issues. 1: Inaccurate.'
      },
      {
        name: 'Personalization',
        description: 'Does it reference their specific constraints and desires?',
        weight: 0.25,
        scoringGuide: '5: Highly personalized. 4: Well personalized. 3: Some references. 2: Generic. 1: No personalization.'
      },
      {
        name: 'Confidence Calibration',
        description: 'Is the confidence level appropriate given constraint satisfaction?',
        weight: 0.2,
        scoringGuide: '5: Perfect match. 4: Good calibration. 3: Reasonable. 2: Slightly off. 1: Misleading.'
      },
      {
        name: 'Highlights and Concerns',
        description: 'Are relevant highlights and concerns surfaced appropriately?',
        weight: 0.2,
        scoringGuide: '5: All surfaced. 4: Most surfaced. 3: Key ones. 2: Some missing. 1: Wrong focus.'
      }
    ]
  },

  questionIdentification: {
    promptType: 'questionIdentification',
    criteria: [
      {
        name: 'Question Coverage',
        description: 'Are all relevant decision questions identified (when, where, what, budget)?',
        weight: 0.25,
        scoringGuide: '5: All questions identified. 4: Most identified. 3: Key ones. 2: Missing important ones. 1: Major gaps.'
      },
      {
        name: 'Conflict Detection',
        description: 'Are conflicts correctly identified where positions are incompatible?',
        weight: 0.25,
        scoringGuide: '5: All conflicts found. 4: Most found. 3: Key conflicts. 2: Missed some. 1: Wrong conflict assessment.'
      },
      {
        name: 'Coupling Identification',
        description: 'Are coupled questions correctly identified (e.g., budget affects activity)?',
        weight: 0.2,
        scoringGuide: '5: All couplings found. 4: Most found. 3: Key ones. 2: Missed important ones. 1: No couplings identified.'
      },
      {
        name: 'Consensus Recognition',
        description: 'Are items with no conflict correctly identified as consensus?',
        weight: 0.15,
        scoringGuide: '5: All consensus found. 4: Most found. 3: Key ones. 2: Missed some. 1: Wrong about consensus.'
      },
      {
        name: 'Category Assignment',
        description: 'Are questions assigned to correct categories (when/where/what/budget)?',
        weight: 0.15,
        scoringGuide: '5: All correct. 4: Nearly all. 3: Mostly correct. 2: Some errors. 1: Major errors.'
      }
    ]
  }
};

// =============================================================================
// JUDGE CLASS
// =============================================================================

export class Judge {
  private llmClient: LLMClient;

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
  }

  async evaluate<TInput, TOutput>(
    promptType: PromptType,
    input: TInput,
    output: TOutput,
    expectedBehavior: string[],
    modelConfig: LLMConfig
  ): Promise<JudgmentResult> {
    const rubric = RUBRICS[promptType];
    const criteriaResults: CriterionResult[] = [];

    // Evaluate each criterion
    for (const criterion of rubric.criteria) {
      const result = await this.evaluateCriterion(
        criterion,
        input,
        output,
        expectedBehavior,
        modelConfig
      );
      criteriaResults.push(result);
    }

    // Calculate weighted score (1-5 scale)
    let totalScore = 0;
    for (let i = 0; i < criteriaResults.length; i++) {
      totalScore += criteriaResults[i].score * rubric.criteria[i].weight;
    }

    // Determine pass/fail (threshold: 3 out of 5, no criterion below 2)
    const pass = totalScore >= 3 && criteriaResults.every(c => c.score >= 2);

    // Generate summary
    const summary = this.generateSummary(criteriaResults, totalScore);

    return {
      pass,
      score: Math.round(totalScore * 10) / 10, // One decimal place
      criteria: criteriaResults,
      summary
    };
  }

  private async evaluateCriterion<TInput, TOutput>(
    criterion: RubricCriterion,
    input: TInput,
    output: TOutput,
    expectedBehavior: string[],
    modelConfig: LLMConfig
  ): Promise<CriterionResult> {
    const systemPrompt = `You are an expert evaluator for AI-generated content. Your job is to score outputs against specific criteria.

Be rigorous but fair. Provide a score from 1-5 and a brief explanation.

Respond in JSON format:
{
  "score": <1-5>,
  "explanation": "<brief explanation of score>"
}`;

    const userPrompt = `## Criterion
Name: ${criterion.name}
Description: ${criterion.description}
Scoring Guide: ${criterion.scoringGuide}

## Expected Behavior
${expectedBehavior.map(b => `- ${b}`).join('\n')}

## Input
${JSON.stringify(input, null, 2)}

## Output to Evaluate
${JSON.stringify(output, null, 2)}

Score this output on the criterion "${criterion.name}".`;

    try {
      const response = await this.llmClient.call(systemPrompt, userPrompt, modelConfig);

      // Parse the judge's response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          name: criterion.name,
          pass: parsed.score >= 3,
          score: parsed.score,
          explanation: parsed.explanation
        };
      }
    } catch (e) {
      // Fall through to default
    }

    // Default if parsing fails
    return {
      name: criterion.name,
      pass: false,
      score: 0,
      explanation: 'Failed to evaluate criterion'
    };
  }

  private generateSummary(criteria: CriterionResult[], totalScore: number): string {
    const strengths = criteria.filter(c => c.score >= 4).map(c => c.name);
    const weaknesses = criteria.filter(c => c.score < 3).map(c => c.name);

    let summary = `Overall score: ${(Math.round(totalScore * 10) / 10)}/5. `;

    if (strengths.length > 0) {
      summary += `Strengths: ${strengths.join(', ')}. `;
    }

    if (weaknesses.length > 0) {
      summary += `Needs improvement: ${weaknesses.join(', ')}.`;
    } else if (strengths.length === criteria.length) {
      summary += 'Excellent across all criteria.';
    }

    return summary;
  }
}

export { RUBRICS };
