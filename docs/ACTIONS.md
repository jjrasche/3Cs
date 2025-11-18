# Actions System

**How Changes Happen in the Collaboration System**

---

## Core Principle

**Users and AI call identical actions.** No special backdoor for AI.

Every action:
1. Validates permissions
2. Modifies collaboration document
3. Emits event
4. Triggers rules/AI (if applicable)

---

## Action Categories

### Data Operations

**`updateField(path, value)`**

Updates any field in the collaboration object.

```javascript
await executeAction('updateField', {
  collaborationId: 'collab_001',
  path: 'activities[0].status',
  value: 'scheduled'
});
```

**`addItem(path, item)`**

Adds an item to an array.

```javascript
await executeAction('addItem', {
  collaborationId: 'collab_001',
  path: 'activities',
  item: {
    activityId: 'act_002',
    name: 'Evening Campfire',
    signups: []
  }
});
```

**`removeItem(path, index)`**

Removes an item from an array.

**`createObject(path, data)`**

Creates a nested object at the specified path.

---

### Consensus Operations

**`createConsensusPoint(path, question, options, method)`**

Starts a new consensus process (vote, discussion, etc.).

```javascript
await executeAction('createConsensusPoint', {
  collaborationId: 'collab_001',
  path: 'consensus.dates',
  question: 'When should we go?',
  options: ['2025-06-14', '2025-06-21'],
  method: 'vote',
  deadline: '2025-05-15T23:59:59Z'
});
```

**`vote(consensusPath, option)`**

Casts a vote on a consensus point.

```javascript
await executeAction('vote', {
  collaborationId: 'collab_001',
  consensusPath: 'consensus.dates',
  option: '2025-06-14'
});
```

**`resolveConsensus(consensusPath, result)`**

Closes a consensus point and applies the result.

---

### Participant Operations

**`addParticipant(userId, role)`**

Adds a new participant to the collaboration.

```javascript
await executeAction('addParticipant', {
  collaborationId: 'collab_001',
  userId: 'user_alice',
  role: 'collaborator'
});
```

**`removeParticipant(userId)`**

Removes a participant from the collaboration.

**`updateParticipantRole(userId, role)`**

Changes a participant's role (owner, collaborator, participant).

---

### Communication

**`sendMessage(recipientIds, message)`**

Sends a message/notification to specific users.

```javascript
await executeAction('sendMessage', {
  collaborationId: 'collab_001',
  recipientIds: ['user_alice', 'user_bob'],
  message: 'Reminder: Please vote on trip dates!'
});
```

**`addDiscussionMessage(objectPath, message)`**

Adds a message to a discussion thread attached to any object.

```javascript
await executeAction('addDiscussionMessage', {
  collaborationId: 'collab_001',
  objectPath: 'activities[0]',
  message: 'Should we start this earlier?'
});
```

**`createDiscussionThread(objectPath, topic)`**

Starts a new discussion thread.

---

### AI-Specific Actions

**`requestApproval(proposedAction, rationale)`**

AI requests permission to perform an action.

```javascript
await executeAction('requestApproval', {
  collaborationId: 'collab_001',
  proposedAction: {
    action: 'updateField',
    params: { path: 'activities[0].status', value: 'scheduled' }
  },
  rationale: 'Minimum signups reached (5 of 5 required)'
});
```

**`suggestChange(path, value, reasoning)`**

AI suggests a modification without executing it.

**`log(context, reasoning)`**

Records AI's thought process for debugging.

---

### Rule Operations

**`createRule(trigger, condition, action, params)`**

Creates a new declarative rule (AI-generated).

```javascript
await executeAction('createRule', {
  collaborationId: 'collab_001',
  trigger: 'onFieldChange:activities[*].signups',
  condition: 'activities[*].signups.length >= 5',
  action: 'updateField',
  params: {
    path: 'activities[*].status',
    value: 'scheduled'
  }
});
```

**`toggleRule(ruleId, enabled)`**

Enables or disables a rule.

---

## Action Execution Flow

```javascript
async function executeAction(actionName, params, actor) {
  // 1. Load collaboration
  const collab = await db.findOne({id: params.collaborationId});

  // 2. Validate permissions
  if (!hasPermission(actor, collab._permissions, actionName)) {
    throw new PermissionError();
  }

  // 3. Execute action
  const result = await actions[actionName](collab, params);

  // 4. Save to database
  await db.updateOne({id: params.collaborationId}, result.updates);

  // 5. Emit event
  eventBus.emit('actionExecuted', {
    action: actionName,
    collaborationId: params.collaborationId,
    actor: actor,
    changes: result.updates
  });

  // 6. Log to audit trail
  await db.collection('audit_logs').insertOne({
    collaborationId: params.collaborationId,
    action: actionName,
    actor: actor,
    timestamp: new Date(),
    changes: result.updates
  });

  return result;
}
```

---

## Permission Model

### Permission Levels

**Owner:**
- Can perform all actions (`*`)
- Can delete collaboration
- Can modify permissions
- Can remove participants

**Collaborator:**
- Can update fields
- Can add/remove items
- Can create consensus points
- Can vote
- Can send messages
- Can add discussion messages

**Participant:**
- Can vote
- Can add discussion messages
- Can view collaboration

**AI (Automatic):**
- Can send messages
- Can log reasoning
- Can suggest changes

**AI (With Approval):**
- Can update fields (after approval)
- Can create consensus points (after approval)
- Can resolve consensus (after approval)

### Permission Structure in Document

```javascript
{
  _permissions: {
    owner: ["*"],
    collaborator: [
      "updateField",
      "addItem",
      "removeItem",
      "createObject",
      "createConsensusPoint",
      "vote",
      "sendMessage",
      "addDiscussionMessage"
    ],
    participant: [
      "vote",
      "addDiscussionMessage"
    ],
    ai: {
      automatic: [
        "sendMessage",
        "addDiscussionMessage",
        "log",
        "suggestChange"
      ],
      withApproval: [
        "updateField",
        "createConsensusPoint",
        "resolveConsensus",
        "addParticipant"
      ]
    }
  }
}
```

---

## Event System

### Events Emitted

All actions emit events that can trigger:
- **Rules** - Automatic conditional logic
- **AI Prompts** - Background AI check-ins
- **WebSocket Broadcasts** - Real-time UI updates

**Event Types:**
- `actionExecuted` - Any action completed
- `fieldUpdated` - Specific field changed
- `itemAdded` - Item added to array
- `participantJoined` - New participant added
- `consensusResolved` - Vote/consensus closed

---

## Error Handling

### Action Execution Errors

```javascript
async function executeAction(actionName, params, actor) {
  try {
    // Execute action
  } catch (error) {
    // Log for debugging
    await db.collection('error_logs').insertOne({
      action: actionName,
      params: params,
      actor: actor,
      error: error.message,
      timestamp: new Date()
    });

    // Return user-friendly error
    throw new ActionError(`Failed to ${actionName}: ${error.userMessage}`);
  }
}
```

### Common Errors

- `PermissionError` - User lacks permission for action
- `ValidationError` - Invalid parameters
- `NotFoundError` - Collaboration/object not found
- `ConflictError` - Concurrent modification (version mismatch)

---

**Next:** [Rules & AI](RULES_AND_AI.md) - When to use rules vs AI
