# Testing Strategy

## Test Pyramid

We use a comprehensive testing strategy with three levels:

```
           Integration Tests (Full Simulations)
                     /\
                    /  \
                   /    \
                  /      \
                 /________\
          Isolated Component Tests
                 /\
                /  \
               /    \
              /      \
             /________\
        Prompt Engineering Tests
```

### Level 1: Prompt Engineering Tests (`tests/run.ts`)
Tests individual prompts with hand-crafted scenarios.
- **Purpose**: Validate prompt quality and LLM capabilities
- **Coverage**: Briefing, Extraction, Synthesis, Contextualization
- **Run**: `npm test` or `npm run test:extraction`

### Level 2: Isolated Component Tests
Tests individual system components with known inputs.
- **Purpose**: Validate component logic independent of other parts
- **Speed**: Fast - no multi-step dependencies
- **Debugability**: Easy to isolate failures
- **Run**: `npm run test:isolated`

#### Component Test Suites

**Synthesis** (`tests/synthesis/`)
- Tests: Proposal generation given constraints
- Validation: Keyword-based constraint coverage
- Test cases: 3 scenarios (potluck, hike, budget conflict)
- Run: `npm run test:iso:synthesis`

**Response Decision** (`tests/response-decision/`)
- Tests: Constraint validation and response type selection
- Validation: Correct accept/object/reservations decisions
- Test cases: 6 scenarios covering clear acceptance, violations, edge cases
- **CRITICAL**: This is the constraint validator - must be reliable
- Run: `npm run test:iso:response`

**Question Identification** (`tests/question-identification/`)
- Tests: Problem structuring from constraints
- Validation: Conflict detection, coupling identification
- Test cases: 4 scenarios (simple, conflict, coupling, complex)
- Run: `npm run test:iso:question-id`

**Contextualization** (`tests/contextualization/`)
- Tests: Proposal personalization for participants
- Validation: Confidence levels, highlight/concern accuracy
- Test cases: 4 scenarios (perfect match, violation, partial, personalization)
- Run: `npm run test:iso:context`

### Level 3: Integration Tests (`tests/simulation/`)
Full end-to-end simulations with LLM-as-user.
- **Purpose**: Validate complete system behavior
- **Coverage**: All components working together
- **Scenarios**: Easy, Moderate, Hard, Impossible
- **Run**: `npm run simulate` or `npm run simulate:easy`

## Test Coverage Matrix

| Component | Prompt Test | Isolated Test | Integration Test |
|-----------|-------------|---------------|------------------|
| Briefing | ✅ | ❌ | ✅ |
| Extraction | ✅ | ❌ | ✅ |
| Question ID | ❌ | ✅ | ✅ |
| Synthesis | ✅ | ✅ | ✅ |
| Contextualization | ✅ | ✅ | ✅ |
| Response Decision | ❌ | ✅ | ✅ |
| Persona Player | ❌ | ❌ | ✅ |

## LLM Call Logging

All tests automatically log LLM calls to `tests/output/llm-logs/`:
- Full input prompts (system + user)
- Raw responses + parsed JSON
- Model config, latency, token estimates
- Context (phase, scenario, persona, round)
- Error/retry tracking

Format: JSONL (one call per line) for easy analysis

## Running Tests

```bash
# All isolated component tests
npm run test:isolated

# Individual component tests
npm run test:iso:synthesis
npm run test:iso:response
npm run test:iso:question-id
npm run test:iso:context

# Full simulation tests
npm run simulate:easy
npm run simulate:moderate
npm run simulate:hard
npm run simulate:impossible

# All simulations
npm run simulate
```

## Test Development Guidelines

### When to Add Tests

1. **New Component**: Always add isolated tests
2. **Bug Fix**: Add test that reproduces the bug
3. **Edge Case**: Add test case to existing suite
4. **Prompt Change**: Update affected test expectations

### Test Case Design

**Good Test Case:**
- Clear, specific scenario
- Known expected output
- Tests ONE thing
- Fast to run

**Bad Test Case:**
- Vague scenario
- Fuzzy expectations
- Tests multiple things
- Slow or flaky

### Validation Strategies

**Modern Approach: LLM-as-Judge** (Recommended)
- Use semantic evaluation with rubrics (see `framework/LLM-AS-JUDGE.md`)
- Judge model evaluates component output against clear criteria
- Provides reasoning and evidence for pass/fail decisions
- More flexible than keyword heuristics
- Currently used by: Contextualization tests

**Legacy Approaches** (Being phased out)
1. **Exact Match**: Use for structured data (types, flags)
2. **Keyword Match**: Use for natural language (reasoning, summaries) - **BRITTLE, avoid**
3. **Regex Pattern**: Use for flexible text matching - **BRITTLE, avoid**
4. **Threshold**: Use for scores or probabilities

We are transitioning all tests to LLM-as-judge for better semantic evaluation.

## Debugging Test Failures

1. **Check LLM logs**: `tests/output/llm-logs/` - see actual prompts/responses
2. **Run isolated test**: Faster than full simulation
3. **Adjust expectations**: LLM output varies - may need looser validation
4. **Check model**: Different models may perform differently

## Known Issues

1. ~~**Regex Pattern Too Strict**: Response decision test expects specific keyword order~~ - **FIXED** by LLM-as-judge
2. **LLM Variability**: Some tests may be flaky due to model non-determinism
3. **Quota Limits**: Running all tests may hit rate limits on free tier
4. **Contextualization Confidence Calibration**: Component sometimes returns medium when should be high (2/4 test failures are legitimate component issues, not test issues)

## Future Work

- [x] **LLM-as-judge framework** - Replace keyword heuristics with semantic evaluation
- [ ] Migrate all tests to LLM-as-judge (Response Decision, Question ID, Synthesis)
- [ ] Rubric versioning system for tracking prompt/criteria changes
- [ ] Persona Player isolated tests
- [ ] Briefing isolated tests
- [ ] Extraction isolated tests
- [ ] Test coverage reporting
- [ ] Performance benchmarks
- [ ] A/B testing framework for prompts and rubrics
