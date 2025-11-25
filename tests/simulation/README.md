# Multi-User LLM Simulation Framework

Validates collaboration mechanics at scale by simulating realistic participants with diverse constraints.

## Overview

This framework tests the full collaboration flow end-to-end:
1. **Extraction** - Each persona expresses concerns/desires through conversation
2. **Question Identification** - System structures the problem into decision categories
3. **Synthesis** - System proposes solutions addressing all constraints
4. **Contextualization** - Each persona receives personalized view of proposals
5. **Response** - Personas accept/object/opt-out based on their constraints
6. **Iteration** - If objections, re-extract and re-synthesize

## Why Simulation?

**Validates the concept before involving real users:**
- Tests whether synthesis actually produces consensus at scale
- Reveals emergent issues from complex constraint interactions
- Validates coupling detection and resolution
- Tests creative synthesis vs honest failure handling
- Faster iteration than real user testing

## Persona Library

### Dietary/Food Constraints
- **Sarah (Vegetarian)** - Vegetarian + transit-dependent + afternoon preference
- **Jordan (Allergy)** - Life-threatening nut allergy + loves music
- **Pat (Vegan)** - 100% vegan restaurants only (ethical, non-negotiable)
- **Chris (Carnivore)** - Must have substantial meat options (health diet)

### Budget Constraints
- **Mike (Budget-conscious)** - Prefers under $20-30, wants to contribute food
- **Sam (Tight Budget)** - Under $15 (student), casual atmosphere

### Time Constraints
- **Riley (Parent)** - Must be back by specific time for childcare
- **Morgan (Morning Call)** - Cannot leave before 10am due to work

### Physical Constraints
- **Casey (Mobility)** - Uses wheelchair, needs accessibility
- **Alex (Bad Knees)** - Avoid steep trails/stairs

### Preferences
- **Taylor (Foodie)** - High-quality food, willing to spend more
- **Jamie (Flexible)** - Easy-going, no strong preferences

## Scenarios

### Easy (Should Converge Quickly)
- **Potluck Easy** - Compatible constraints, weekend afternoon, accessible park
- **Weekend Hike Easy** - Gentle trails, good views, accessible

### Moderate (Some Conflicts)
- **Group Dinner Moderate** - Budget vs quality tension, should find middle ground
- **Beach Day** - Tight timing constraints (10am-4pm), nearby beach needed
- **Sushi Creative** - Wants sushi vs can't eat raw fish → creative solution

### Hard (Significant Conflicts)
- **Lawn Mower** - $400 budget vs quality self-propelled mower ($600+)
- **Restaurant Hard** - Foodie vs student budget + dietary constraints

### Impossible (Should Recognize Failure)
- **Vegan vs Carnivore** - 100% vegan restaurant vs must-have-steak → fundamentally incompatible

### Scale (Many Participants)
- **Large Potluck** - 10 people with mixed constraints

## Running Simulations

```bash
# Run all scenarios
npm run simulate

# Run specific scenario
npm run simulate:easy              # Easy potluck
npm run simulate:moderate          # Moderate dinner
npm run simulate:hard              # Hard restaurant
npm run simulate:impossible        # Impossible vegan/carnivore

# Or directly
ts-node tests/simulation/run-simulation.ts [scenario-id]
```

## What Success Looks Like

### Easy Scenarios
- ✅ Converges in 1 round
- ✅ 80%+ acceptance rate
- ✅ All non-negotiables satisfied
- ✅ Specific, actionable proposals

### Moderate Scenarios
- ✅ Converges in 1-2 rounds
- ✅ 70%+ acceptance rate
- ✅ Creative solutions to preference conflicts
- ✅ Couples budget/quality/timing appropriately

### Hard Scenarios
- ✅ Converges in 2-3 rounds OR correctly identifies tensions
- ✅ 60%+ acceptance rate
- ✅ Honest about tradeoffs
- ✅ Proposes resolutions (more participants, adjust expectations)

### Impossible Scenarios
- ✅ Does NOT converge (correctly recognizes impossibility)
- ✅ Surfaces alternative approaches (separate events, fork)
- ✅ Does NOT propose fake solutions

## Output

Results saved to `tests/output/simulation-results-[timestamp].json`:

```json
{
  "timestamp": "2025-11-24T...",
  "config": { ... },
  "summary": {
    "total": 9,
    "successful": 7,
    "converged": 7
  },
  "results": [
    {
      "scenario": { ... },
      "success": true,
      "convergence": {
        "converged": true,
        "rounds": 1,
        "finalStatus": "consensus"
      },
      "participation": {
        "acceptances": 4,
        "acceptancesWithReservations": 1,
        "objections": 0,
        "optOuts": 0,
        "acceptanceRate": 1.0
      },
      "history": {
        "rounds": [ ... ],
        "finalProposal": [ ... ]
      }
    }
  ]
}
```

## Architecture

```
tests/simulation/
├── types.ts                 # Type definitions
├── personas.ts              # Persona library
├── scenarios.ts             # Test scenarios
├── persona-player.ts        # LLM playing personas
├── runner.ts                # Full flow orchestration
├── run-simulation.ts        # Entry point
└── README.md               # This file
```

## Key Validation Questions

1. **Does Question Identification correctly identify couplings?**
   - Budget + activity should be coupled
   - Location + accessibility should be coupled

2. **Does Synthesis solve coupled questions together?**
   - Doesn't propose "$35 fine dining" separately
   - Considers all constraints simultaneously

3. **Does creative synthesis actually find third options?**
   - Sushi → sushi restaurant with cooked options
   - Not just averaging or splitting

4. **Does it recognize honest failure?**
   - Vegan-only vs steak → surfaces impossibility
   - Doesn't paper over conflicts with fake solutions

5. **Does it scale?**
   - 10, 20, 50 participants
   - Deduplication reduces 1000 constraints → 20-30 unique

## Next Steps After Simulation

1. **Fix any systematic failures** - If synthesis consistently fails patterns, update prompts
2. **Tune constraint satisfaction** - Ensure all non-negotiables are actually satisfied
3. **Improve creative synthesis** - If it's not finding third options, enhance prompt
4. **Scale testing** - Run with 20, 50, 100 participants
5. **Real user validation** - Once simulations pass, test with actual groups

## Configuration

Edit `tests/simulation/run-simulation.ts` to adjust:

```typescript
const DEFAULT_CONFIG: SimulationConfig = {
  maxRounds: 3,                        // Max synthesis iterations
  timeoutMs: 600000,                   // 10 minute timeout
  extractionModel: 'llama-3.3-70b',
  synthesisModel: 'llama-3.3-70b',
  personaModel: 'llama-3.3-70b',
  extractionMaxTurns: 5,               // Max conversation turns
  allowForking: false,
  verbose: true,
  saveConversations: true
};
```

## Interpreting Results

### Good Signs
- Easy scenarios converge in 1 round with 80%+ acceptance
- Moderate scenarios find creative solutions (not just compromises)
- Hard scenarios honestly surface tensions when needed
- Impossible scenarios correctly reject with alternatives

### Red Flags
- Easy scenarios don't converge
- Synthesis proposes solutions that violate non-negotiables
- Fake solutions to impossible conflicts
- Vague, non-actionable proposals
- Couplings not detected (budget/quality solved separately)

## Philosophy

This simulates the **hardest part** of collaboration: converging diverse, conflicting needs into consensus. If the system can synthesize solutions that satisfy simulated personas with known constraints, it has a strong foundation for real users.

The goal is **not** to simulate human behavior perfectly, but to validate that the coordination architecture (Question ID → Synthesis → Contextualization) can handle complex constraint patterns at scale.
