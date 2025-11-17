# API Reference

**REST Endpoints and WebSocket Protocol**

---

## Core REST API

### Collaborations

**Get collaboration**
```http
GET /api/collaborations/:id
```

**Response:**
```json
{
  "id": "collab_001",
  "owner": "user_jim",
  "outcome": "Weekend camping trip",
  "participants": [...],
  "activities": [...],
  "consensus": {...},
  "_permissions": {...}
}
```

---

**Create collaboration**
```http
POST /api/collaborations
Content-Type: application/json

{
  "outcome": "Team retreat planning",
  "participants": ["user_alice", "user_bob"]
}
```

**Response:**
```json
{
  "id": "collab_002",
  "created": true
}
```

---

**Update collaboration**
```http
PUT /api/collaborations/:id
Content-Type: application/json

{
  "outcome": "Updated outcome"
}
```

---

**Delete collaboration**
```http
DELETE /api/collaborations/:id
```

---

**List user's collaborations**
```http
GET /api/collaborations?userId=:userId
```

**Response:**
```json
{
  "collaborations": [
    {
      "id": "collab_001",
      "outcome": "Weekend camping trip",
      "lastModified": "2025-11-17T10:00:00Z",
      "participantCount": 5
    }
  ]
}
```

---

### Actions

All actions go through a single endpoint:

```http
POST /api/collaborations/:id/actions/:actionName
Content-Type: application/json

{
  "params": {
    "path": "activities[0].status",
    "value": "scheduled"
  }
}
```

**Examples:**

**Update field:**
```http
POST /api/collaborations/collab_001/actions/updateField

{
  "params": {
    "path": "activities[0].status",
    "value": "scheduled"
  }
}
```

**Add activity:**
```http
POST /api/collaborations/collab_001/actions/addItem

{
  "params": {
    "path": "activities",
    "item": {
      "activityId": "act_002",
      "name": "Evening Campfire",
      "signups": []
    }
  }
}
```

**Vote:**
```http
POST /api/collaborations/collab_001/actions/vote

{
  "params": {
    "consensusPath": "consensus.dates",
    "option": "2025-06-14"
  }
}
```

---

### AI Chat

**User-initiated AI conversation:**
```http
POST /api/ai/chat
Content-Type: application/json

{
  "collaborationId": "collab_001",
  "message": "Help me pick dates for the trip",
  "context": {
    "currentView": "consensus.dates"
  }
}
```

**Response:**
```json
{
  "message": "Looking at the votes so far, June 14th has the most support (3 of 5 votes). The deadline is in 2 days. Should I remind the others to vote?",
  "suggestedActions": [
    {
      "action": "sendMessage",
      "recipients": ["user_bob", "user_carol"],
      "message": "Reminder: please vote on trip dates by Friday!"
    }
  ]
}
```

---

### Users

**Get user profile:**
```http
GET /api/users/:userId
```

**Update user profile:**
```http
PUT /api/users/:userId
Content-Type: application/json

{
  "name": "Jim Updated",
  "preferences": {
    "notifications": {
      "email": false
    }
  }
}
```

---

### Discussions

**Get discussions for collaboration:**
```http
GET /api/collaborations/:id/discussions
```

**Get specific discussion:**
```http
GET /api/discussions/:discussionId
```

**Add message to discussion:**
```http
POST /api/discussions/:discussionId/messages
Content-Type: application/json

{
  "message": "Should we start this earlier?",
  "userId": "user_jim"
}
```

---

### Audit Logs

**Get audit trail for collaboration:**
```http
GET /api/collaborations/:id/audit-logs?limit=100
```

**Response:**
```json
{
  "logs": [
    {
      "collaborationId": "collab_001",
      "action": "updateField",
      "actor": "user_jim",
      "path": "activities[0].status",
      "oldValue": "proposed",
      "newValue": "scheduled",
      "timestamp": "2025-11-17T10:00:00Z"
    }
  ]
}
```

---

## WebSocket Protocol

### Connection

**Client connects:**
```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  // Subscribe to collaboration updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    collaborationId: 'collab_001',
    userId: 'user_jim'
  }));
};
```

---

### Message Types

#### Server → Client

**Collaboration updated:**
```javascript
{
  type: 'collaboration_updated',
  collaborationId: 'collab_001',
  changes: {
    path: 'activities[0].status',
    oldValue: 'proposed',
    newValue: 'scheduled'
  },
  version: 6
}
```

**New message received:**
```javascript
{
  type: 'message_received',
  collaborationId: 'collab_001',
  message: {
    from: 'ai',
    text: 'Reminder: vote on dates',
    timestamp: '2025-11-17T10:00:00Z'
  }
}
```

**Participant joined:**
```javascript
{
  type: 'participant_joined',
  collaborationId: 'collab_001',
  participant: {
    userId: 'user_bob',
    role: 'collaborator'
  }
}
```

**Consensus resolved:**
```javascript
{
  type: 'consensus_resolved',
  collaborationId: 'collab_001',
  consensusPath: 'consensus.dates',
  result: '2025-06-14'
}
```

---

#### Client → Server

**Subscribe to collaboration:**
```javascript
{
  type: 'subscribe',
  collaborationId: 'collab_001',
  userId: 'user_jim'
}
```

**Unsubscribe:**
```javascript
{
  type: 'unsubscribe',
  collaborationId: 'collab_001'
}
```

**Heartbeat (keep-alive):**
```javascript
{
  type: 'ping'
}
```

Server responds:
```javascript
{
  type: 'pong'
}
```

---

## Real-Time Sync Implementation

### MongoDB Change Streams

```javascript
// Server-side: Watch for database changes
const changeStream = db.collection('collaborations').watch();

changeStream.on('change', (change) => {
  const collabId = change.documentKey._id;

  // Find all connected clients watching this collaboration
  connectedClients
    .filter(client => client.watching === collabId)
    .forEach(client => {
      client.send(JSON.stringify({
        type: 'collaboration_updated',
        collaborationId: collabId,
        changes: change.updateDescription,
        version: change.fullDocument.version
      }));
    });
});
```

### Client-Side Handling

```javascript
// React component
useEffect(() => {
  const ws = new WebSocket('ws://localhost:8080');

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'collaboration_updated':
        // Update local state with new data
        setCollaboration(prev => ({
          ...prev,
          ...message.changes
        }));
        break;

      case 'participant_joined':
        // Add new participant to UI
        addParticipant(message.participant);
        break;

      case 'message_received':
        // Show notification
        showNotification(message.message);
        break;
    }
  };

  // Subscribe to collaboration updates
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      collaborationId: collaborationId,
      userId: currentUser.id
    }));
  };

  // Cleanup
  return () => {
    ws.send(JSON.stringify({
      type: 'unsubscribe',
      collaborationId: collaborationId
    }));
    ws.close();
  };
}, [collaborationId]);
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You don't have permission to perform this action",
    "details": {
      "action": "updateField",
      "requiredRole": "collaborator",
      "userRole": "participant"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `PERMISSION_DENIED` | 403 | User lacks permission |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `CONFLICT` | 409 | Version mismatch (concurrent edit) |
| `UNAUTHORIZED` | 401 | Invalid/missing auth token |
| `RATE_LIMIT` | 429 | Too many requests |

---

## Rate Limiting

**Limits per user:**
- API requests: 100/minute
- WebSocket messages: 50/minute
- AI chat: 10/minute

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1637251200
```

---

## Pagination

**List endpoints support pagination:**
```http
GET /api/collaborations?userId=user_jim&limit=20&offset=0
```

**Response:**
```json
{
  "collaborations": [...],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

**Next:** [Authentication](AUTHENTICATION.md) - Supabase Auth integration
