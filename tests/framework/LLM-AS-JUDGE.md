# LLM-as-Judge Testing Framework

## Philosophy

Traditional testing approaches for LLM outputs rely on brittle heuristics:
- **Keyword matching**: "Does the output contain 'vegan'?"
- **Exact string matching**: "Does it say exactly this?"
- **Regex patterns**: "Does it match this pattern?"

These approaches fail because:
1. **Natural language is flexible** - There are many valid ways to express the same concept
2. **Context matters** - A keyword appearing doesn't mean it's used correctly
3. **False positives/negatives** - Strict matching causes tests to fail on valid outputs or pass on invalid ones

## LLM-as-Judge Approach

Instead of keyword heuristics, we use a more capable LLM to semantically evaluate the output:

```
Component Under Test (8B model)
    ↓ produces output
    ↓
Judge Model (70B model) + Rubric
    ↓ evaluates
    ↓
Pass/Fail + Detailed Reasoning
```

### Key Benefits

1. **Semantic Understanding**: Judge understands meaning, not just keywords
2. **Flexible Validation**: Multiple valid outputs can pass the same rubric
3. **Clear Criteria**: Rubrics define what "good" looks like
4. **Explainable**: Judge provides reasoning for its decision
5. **Adaptable**: Easy to update rubrics without changing test code

## Rubric Structure

A rubric is a collection of criteria for evaluating a component:

```typescript
interface Rubric {
  id: string;                          // e.g., "contextualization-v1"
  componentName: string;               // e.g., "Contextualization"
  componentDescription: string;        // What does this component do?

  criteria: RubricCriterion[];         // List of evaluation criteria
  judgeInstructions?: string;          // How to apply this rubric
}
```

### Criterion Types

Each criterion defines one aspect to evaluate:

```typescript
interface RubricCriterion {
  id: string;                          // e.g., "confidence-appropriate"
  aspect: string;                      // What are we evaluating?
  description: string;                 // What does "good" look like?

  weight: 'required' | 'important' | 'nice-to-have';
  evaluationType: 'binary' | 'score';
  scoreRange?: { min: number; max: number };
}
```

**Weights**:
- `required`: Must pass for overall pass (critical criteria)
- `important`: Should pass but not critical
- `nice-to-have`: Informational only

**Evaluation Types**:
- `binary`: Simple pass/fail
- `score`: Rated on a scale (e.g., 1-5)

## Example: Contextualization Rubric

```typescript
{
  id: 'contextualization-v1',
  componentName: 'Contextualization',
  componentDescription: 'Personalizes a proposal for an individual participant',

  criteria: [
    {
      id: 'confidence-appropriate',
      aspect: 'Confidence Level',
      description: 'Confidence should be HIGH if all non-negotiables met, MEDIUM if preferences unmet, LOW if violations',
      weight: 'required',
      evaluationType: 'binary'
    },
    {
      id: 'highlights-relevant',
      aspect: 'Highlights Relevance',
      description: 'Highlights should mention aspects that satisfy THIS participant\'s constraints',
      weight: 'required',
      evaluationType: 'binary'
    },
    {
      id: 'personalization-quality',
      aspect: 'Personalization Quality',
      description: 'Should feel tailored to THIS specific person, not generic',
      weight: 'important',
      evaluationType: 'score',
      scoreRange: { min: 1, max: 5 }
    }
  ]
}
```

## Judge Output Format

The judge returns structured evaluation:

```typescript
interface RubricEvaluation {
  rubricId: string;
  overallPass: boolean;              // Did it pass all required criteria?

  criteriaResults: CriterionEvaluation[];
  summary: string;                   // Overall assessment in 1-2 sentences
  criticalFailures: string[];        // Which required criteria failed
}

interface CriterionEvaluation {
  criterionId: string;
  pass: boolean;
  score?: number;
  reasoning: string;                 // Why this judgment?
  evidence?: string;                 // Quote from output supporting judgment
}
```

## How to Use

### 1. Import the judge

```typescript
import { LLMJudge, RUBRICS } from '../framework/llm-judge';
```

### 2. Initialize judge with a more capable model

```typescript
const judgeClient = new LLMClient();
await judgeClient.initializeQuota('llama-3.3-70b-versatile');
const judge = new LLMJudge(judgeClient);
```

### 3. Evaluate output against rubric

```typescript
const evaluation = await judge.evaluate(
  RUBRICS.contextualization,
  { participant, proposal },    // Input that was given
  output,                        // Actual output from component
  expectedBehavior               // Optional description of what should happen
);
```

### 4. Check results

```typescript
if (evaluation.overallPass) {
  console.log('✅ PASS');
} else {
  console.log('❌ FAIL');
  console.log('Critical failures:', evaluation.criticalFailures);
}

// Show detailed reasoning
for (const criterion of evaluation.criteriaResults) {
  console.log(`${criterion.pass ? '✅' : '❌'} ${criterion.criterionId}`);
  console.log(`   ${criterion.reasoning}`);
  console.log(`   Evidence: "${criterion.evidence}"`);
}
```

## Comparison: Before & After

### Before (Keyword Heuristics)

```typescript
// Validate confidence level
if (output.confidence !== testCase.expected.confidence) {
  failures.push(`Expected confidence "${testCase.expected.confidence}"`);
}

// Validate highlights contain keywords
const highlightsText = (output.highlights || []).join(' ').toLowerCase();
for (const keyword of testCase.expected.highlightsKeywords) {
  if (!highlightsText.includes(keyword.toLowerCase())) {
    failures.push(`Expected highlights to include "${keyword}"`);
  }
}
```

**Problems**:
- Brittle - fails if keyword phrasing changes
- False negatives - valid outputs fail due to wording differences
- No semantic understanding

### After (LLM-as-Judge)

```typescript
const evaluation = await judge.evaluate(
  RUBRICS.contextualization,
  input,
  output,
  expectedBehavior
);

if (!evaluation.overallPass) {
  failures.push(...evaluation.criticalFailures);
}
```

**Benefits**:
- Flexible - multiple valid phrasings pass
- Semantic - understands meaning, not just keywords
- Explainable - provides reasoning for judgment

## Test Case Design with LLM-as-Judge

Instead of listing expected keywords, describe expected behavior:

```typescript
{
  id: 'high-perfect-match',
  name: 'High Confidence - Perfect Match',

  // Input
  participant: { /* ... */ },
  proposal: { /* ... */ },

  // Expected behavior (human-readable description)
  expectedBehavior: `
    Since the proposal is a fully vegetarian restaurant within the budget,
    confidence should be HIGH.
    Highlights should mention vegetarian menu and affordable pricing.
    Concerns should be empty or minimal since all constraints are satisfied.
  `
}
```

The judge uses this context when evaluating against the rubric.

## Best Practices

### 1. Define Clear Criteria

**Good criterion**:
```typescript
{
  id: 'addresses-non-negotiables',
  aspect: 'Non-Negotiable Constraints',
  description: 'The proposal must explicitly address ALL non-negotiable constraints from all participants',
  weight: 'required'
}
```

**Bad criterion**:
```typescript
{
  id: 'is-good',
  aspect: 'Quality',
  description: 'The output should be good',
  weight: 'required'
}
```

### 2. Use Appropriate Weights

- **required**: Core functionality that must work
- **important**: Quality attributes that should work
- **nice-to-have**: Bonus features or polish

### 3. Provide Judge Instructions

Help the judge understand context:

```typescript
judgeInstructions: `
Key things to check:
- Does the contextualization focus on what THIS participant cares about?
- Is the confidence level appropriate (high = all non-negotiables met)?
- Do highlights capture the good aspects for this person?
- Do concerns capture the problematic aspects for this person?
`
```

### 4. Version Your Rubrics

Include version in rubric ID:

```typescript
{
  id: 'contextualization-v1',  // v1, v2, etc.
  // ...
}
```

This enables:
- Tracking rubric changes over time
- Comparing different rubric versions
- A/B testing evaluation criteria

## Limitations

1. **Cost**: Judge calls cost tokens (but 70B is efficient on Groq)
2. **Latency**: Adds ~1-2s per test case
3. **Non-determinism**: LLM judge may vary slightly between runs
4. **Judge Quality**: Judge needs to be more capable than component under test

## Future Enhancements

- [ ] **Rubric versioning system**: Track rubric changes like code
- [ ] **Multi-judge consensus**: Use 3 judges, take majority vote
- [ ] **Confidence scores**: Judge expresses certainty in its judgment
- [ ] **Automated rubric tuning**: Learn from human feedback
- [ ] **Rubric coverage metrics**: How well do rubrics cover edge cases?
