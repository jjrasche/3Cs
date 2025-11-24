# Coordination Architecture

How AI facilitates consensus through structured problem analysis.

---

## Key Architectural Decisions

### 1. Universal Decision Categories

Coordination problems decompose into 4-6 fundamental dimensions:
**when** | **where** | **what** | **budget** | **who** | **how**

**Why**: Arbitrary coordination becomes tractable when mapped to universal structure.

**See**: `tests/types.ts` - DecisionCategory type

---

### 2. Why We Abandoned Per-Spectrum Synthesis

**Initial approach**: Analyze each "spectrum" independently (budget spectrum, activity spectrum, timing spectrum), then synthesize solutions per-spectrum.

**Fatal flaw**: Questions are **coupled**. Solving "budget → $35" and "activity → fine dining" separately produces contradictory conclusions ($35 can't buy fine dining).

**Solution**: Question Identification structures ALL questions first, identifies couplings, then synthesis solves coupled questions together.

**Key principle**: Structure first, solve second. Never solve coupled questions in isolation.

---

## System Flow

```
Raw input (natural language)
    ↓
Extraction → concerns/desires with severity/intensity
    ↓
Semantic Deduplication → 1000 constraints → 20-30 unique (not yet implemented)
    ↓
Question Identification → structure into universal categories, find conflicts/couplings
    ↓
Synthesis → propose solutions respecting constraints and couplings
    ↓
Contextualization → explain how proposals address each participant's concerns
```

---

## Implementation

### Extraction
**What**: Natural language → structured constraints
**Key behavior**: Language calibration ("dealbreaker" → non-negotiable, "I can chip in" → nice-to-have)
**Prompt**: `tests/prompts/index.ts` - EXTRACTION_PROMPT
**Tests**: `tests/scenarios.ts` - EXTRACTION_SCENARIOS
**Rubric**: `tests/framework/judge.ts` - extraction rubric

### Question Identification
**What**: Structure problem into decision categories, identify conflicts and couplings
**Key concept**: Coupling = solving one question constrains another (activity choice affects budget)
**Prompt**: `tests/prompts/index.ts` - QUESTION_IDENTIFICATION_PROMPT
**Tests**: `tests/scenarios.ts` - QUESTION_IDENTIFICATION_SCENARIOS
**Types**: `tests/types.ts` - DecisionQuestion, Coupling

### Synthesis
**What**: Propose solutions satisfying constraints
**Critical requirement**: Feasibility check before proposing (do numbers add up? does this exist in real world?)
**Key principle**: Honest failure over fake solutions - surface tensions rather than pretend conflicts don't exist
**Prompt**: `tests/prompts/index.ts` - SYNTHESIS_PROMPT
**Tests**: `tests/scenarios.ts` - SYNTHESIS_SCENARIOS
**Example test**: synthesis-equipment-conflict (budget $400 + quality self-propelled mower = CONFLICT, should surface tension)

### Semantic Deduplication (Proposed)
**What**: Cluster similar constraints using embeddings
**Algorithm**: Cosine similarity → cluster → take highest severity, sum weights
**Expected reduction**: 1000 → 20-30 unique constraints
**Status**: Architecture designed, implementation pending
**Types**: `tests/types.ts` - ConsolidatedConstraint

---

## Constraint Satisfaction Problem (CSP) Framing

Coordination as optimization:
- **Variables**: Universal decision categories (when, where, what, budget)
- **Domains**: Possible values for each variable
- **Constraints**: Concerns (hard) and desires (soft) from participants
- **Coupling**: Variables linked by constraints ("budget >= cost(activity)")
- **Goal**: Satisfy all hard constraints, optimize soft constraints (weighted by severity/intensity)

Synthesis acts as CSP solver.

---

## Consensus Through Obviousness

Best coordination feels effortless because the solution is obvious once everyone's needs are visible.

**How**:
1. Extraction makes concerns/desires explicit
2. Question Identification reveals conflict vs accommodation
3. Items with consensus (no conflict) → just implement
4. Items with conflict → synthesis proposes solutions

**Example**: Alex (vegetarian, non-negotiable) + Jordan (flexible) + Sam (prefers healthy)
→ Question ID sees: no conflict, just accommodation
→ Synthesis: vegetarian menu (obvious, not imposed)

**Contrast with voting**: Voting finds what most people tolerate. This finds what actually addresses what people care about.

---

## Quota Management

**Problem**: Groq API rate limits (requests/min, tokens/min, tokens/day)

**Solution**: Track quota state from response headers, wait only when depleted

**Key mechanisms**:
- Proactive initialization (1 minimal API call to get quota state)
- Real-time tracking (update after every request)
- Exact wait calculation (parse reset time from headers)
- Error recovery (parse 429 errors, auto-retry)
- Zero unnecessary delays (no arbitrary "wait 2s", no progressive backoff)

**Implementation**: `tests/framework/llm-client.ts` - see code comments for details

**Wait logic**: Only waits when `remaining <= 0 AND resetAt > now`

---

## Scaling to 1000 Constraints

**Challenge**: Context window limits, attention degradation

**Solution**: Hierarchical processing
1. Semantic deduplication: 1000 → 20-30 unique constraints
2. Question identification: 20-30 → 4-6 decision questions
3. Synthesis: Small, tractable subsets

**Status**: Architecture designed, deduplication implementation pending

---

## Test Framework

Tests document expected behavior.

**Structure**:
- `tests/scenarios.ts` - test inputs with expected behaviors
- `tests/framework/judge.ts` - LLM-based evaluation with rubrics
- `tests/framework/runner.ts` - execution engine
- `tests/framework/llm-client.ts` - provider abstraction + quota management

**To understand a prompt**: Read its scenarios in `tests/scenarios.ts`, see what behaviors are expected.

**Current performance** (llama-3.1-8b-instant):
- Extraction: 4.6/5
- Synthesis: 3.9/5
- Question Identification: 4.9/5

---

## References

**Product framework**: `docs/concepts.md` - broader 3Cs concepts (Connection, Consensus, Coordination)
**Data models**: `docs/minimum-context-structure.md` - collaboration data structure for LLM
**Implementation**: `tests/` directory - prompts, types, scenarios, framework
