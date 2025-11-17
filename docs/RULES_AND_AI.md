# Rules vs AI

**The Boundary Matrix: When to Use Deterministic Logic vs AI Judgment**

---

## The Fundamental Difference

### Rules = Deterministic Logic
- **When to use:** "If X, then Y" - no ambiguity
- **Speed:** Fast (< 1ms)
- **Behavior:** Predictable, always same result
- **Transparency:** User can understand exactly what happens
- **Example:** "If 5 signups → auto-schedule activity"

### AI = Contextual Judgment
- **When to use:** "Should I do X?" - requires evaluation
- **Speed:** Slow (1-5 seconds)
- **Behavior:** Probabilistic, context-dependent
- **Transparency:** System explains reasoning
- **Example:** "Is this consensus stalled?"

---

## The Boundary Matrix

| Scenario | Use Rule or AI? | Reasoning |
|----------|----------------|-----------|
| Activity has 5 signups → auto-schedule | **Rule** | Deterministic threshold, instant |
| Consensus has 1 of 5 votes, deadline in 2 days → remind | **AI Check-In** | Requires judgment: "Is this concerning?" |
| Budget exceeds $500 → block expenses | **Rule** | Hard constraint, no ambiguity |
| 10 days no activity → send check-in | **AI Check-In** | Context matters: dormant or slow-moving? |
| Participant joins → add to default activity | **Rule** | Always do this, no decision needed |
| Participant joins → suggest activities they'd like | **AI Task-Specific** | Requires understanding preferences |
| Date is in past → show warning | **Rule** | Simple validation, instant |
| Should we extend trip by a day? | **AI Task-Specific** | Complex decision, many factors |
| Consensus deadline passed → auto-resolve | **Rule** | Clear trigger (but AI determines winner) |
| Only 30% voted → what should I do? | **AI Check-In** | Depends on context, norms, importance |

**Rule Principle:** If expressible as `if (condition) then action` with zero ambiguity → use rule.

**AI Principle:** If requires evaluation, judgment, context understanding → use AI.

---

## Two AI Modes

### 1. User-Initiated (Task-Specific)

User asks AI for help with **specific task** within the collaboration:

**Examples:**
- "Can you help me figure out the best dates?"
- "What activities work for families with kids?"
- "How should I word this consensus question?"

**Context Provided:**
- Scoped to current task
- Relevant slice of collaboration
- User's role and permissions
- Recent changes to this area

**AI Responds With:**
- Focused answers
- Suggested actions
- Can execute with permission

**Characteristics:**
- Latency: Immediate (user waiting)
- Cost: Higher (real-time, full context)
- Quality: Best (Claude Sonnet or GPT-4)

---

### 2. Daily Check-In (Holistic Health)

System reviews **entire collaboration health** once per day:

**Questions AI Asks:**
- Are consensus points stalled?
- Are activities orphaned?
- Is collaboration stuck?
- Should I nudge anyone?

**Context Provided:**
- Summarized state (not full object)
- Key metrics (participation, activity, deadlines)
- Event history

**AI Responds With:**
```json
{
  "collaborationId": "collab_001",
  "healthStatus": "needs_attention",
  "issues": [
    {
      "type": "consensus_stalled",
      "severity": "medium",
      "suggestedAction": {
        "action": "sendMessage",
        "recipients": ["user2", "user3"],
        "message": "Reminder: Please vote on dates!"
      }
    }
  ]
}
```

**Characteristics:**
- Latency: Asynchronous (batch processed)
- Cost: Lower (batch, summary only)
- Quality: Good enough (Groq Llama 3.1 70B)

---

## Key Differences

| Aspect | Task-Specific | Holistic Check-In |
|--------|---------------|-------------------|
| **Trigger** | User question | Daily cron |
| **Context** | Focused slice | Full summary |
| **Goal** | Help complete action | Identify problems |
| **Frequency** | As needed | Once daily |
| **Model** | Better model (Claude) | Cheap model (Groq) |
| **User Visible** | Immediate chat response | Background notification |

---

## Rule Structure

### Rule Document Schema

```javascript
{
  id: "rule_001",
  enabled: true,
  createdBy: "user_jim",  // Creator's permissions at time of creation
  trigger: "onFieldChange:activities[*].signups",
  condition: "activities[*].signups.length >= activities[*].minParticipants",
  action: "updateField",
  params: {
    path: "activities[*].status",
    value: "scheduled"
  },
  description: "Auto-schedule when minimum signups met"
}
```

### Rule Constraints

**Max 10 rules per collaboration**
- Keeps complexity bounded
- Prevents rule conflicts
- Easy to understand system behavior

**AI-created only**
- Users can disable, not write
- Prevents code injection
- AI validates against creator's permissions

**Simple conditions**
- No complex logic (no nested AND/OR)
- Threshold comparisons only
- No function calls

**Sandboxed evaluation**
- Runs in isolated context
- No access to system functions
- Can't execute arbitrary code

---

## Rule Evaluation Flow

```javascript
// When action is executed
async function executeAction(actionName, params) {
  // ... perform action ...

  // Emit event
  eventBus.emit('actionExecuted', {
    action: actionName,
    path: params.path,
    collaborationId: params.collaborationId
  });
}

// Event triggers rule evaluation
eventBus.on('actionExecuted', (event) => {
  // Find matching rules
  const matchingRules = collaboration._rules.filter(rule =>
    rule.enabled &&
    rule.trigger === `on${event.action}` ||
    rule.trigger === `onFieldChange:${event.path}`
  );

  // Evaluate each rule
  matchingRules.forEach(rule => evaluateRule(rule));
});

// Evaluate rule condition
function evaluateRule(rule) {
  try {
    // Sandboxed evaluation
    const result = vm.runInNewContext(rule.condition, {
      collaboration: collaboration,
      Math: Math,
      Date: Date
    });

    if (result) {
      // Execute rule action
      executeAction(rule.action, rule.params, rule.createdBy);
    }
  } catch (error) {
    logger.error(`Rule ${rule.id} evaluation failed`, error);
    if (rule.failureCount > 3) {
      rule.enabled = false;
    }
  }
}
```

---

## AI Implementation Details

### Daily Check-In Implementation

```javascript
// Worker cron job (runs at 2am daily)
async function dailyAICheckIn() {
  // 1. Find active collaborations
  const active = await db.collection('collaborations')
    .find({ lastModified: { $gte: thirtyDaysAgo() } })
    .toArray();

  // 2. Process in batches of 20
  for (const batch of chunks(active, 20)) {
    await processBatch(batch);
  }
}

async function processBatch(collaborations) {
  // 3. Summarize for AI
  const summaries = collaborations.map(summarizeForAI);

  // 4. Single LLM call
  const analysis = await groq.chat({
    model: "llama-3.1-70b-versatile",
    system: `You are checking in on active collaborations. Identify:
    - Stalled consensus points (low participation, deadline approaching)
    - Orphaned activities (no signups)
    - Overdue items
    - Stuck collaborations (no activity in 7+ days)

    Respond with JSON array of actionable items.`,
    messages: [{ role: "user", content: JSON.stringify(summaries) }]
  });

  // 5. Execute suggested actions
  for (const item of analysis) {
    if (isAutomaticAction(item.suggestedAction)) {
      await executeAction(item.suggestedAction);
    } else {
      await requestOwnerApproval(item);
    }
  }
}

function summarizeForAI(collaboration) {
  return {
    id: collaboration.id,
    outcome: collaboration.outcome,
    participantCount: collaboration.participants.length,
    consensus: Object.entries(collaboration.consensus || {}).map(([key, c]) => ({
      key: key,
      question: c.question,
      status: c.status,
      voteCount: c.options?.reduce((sum, opt) => sum + opt.votes.length, 0),
      deadline: c.deadline
    })),
    activities: collaboration.activities?.map(a => ({
      name: a.name,
      signupCount: a.signups?.length,
      status: a.status
    })),
    daysInactive: daysSince(collaboration.lastModified)
  };
}
```

### Cost Estimate

**For 1000 active collaborations:**
- 50 batches × 20 collaborations
- ~2000 tokens per batch (summaries)
- ~500 tokens response per batch
- Total: ~125K tokens/day
- Cost: $0.125/day = ~$3.75/month (at $0.10/M tokens)

---

## When NOT to Use Rules or AI

### Just Use Regular Code When:

1. **Core business logic** - Don't make essential features depend on rules
2. **User-facing features** - Make actions explicit, not hidden in rules
3. **Complex orchestration** - Multi-step workflows better as explicit code
4. **Real-time validation** - Input validation should be immediate, not rule-based

**Example - BAD (using rule):**
```javascript
// Don't use a rule for core feature
{
  trigger: "onFieldChange:participants",
  condition: "participants.length > 0",
  action: "sendWelcomeEmail"
}
```

**Example - GOOD (explicit code):**
```javascript
// Explicit action when adding participant
async function addParticipant(userId) {
  await executeAction('addParticipant', { userId });
  await sendWelcomeEmail(userId);  // Part of the action itself
}
```

---

**Next:** [Testing Strategy](TESTING.md) - E2E-first TDD workflow
