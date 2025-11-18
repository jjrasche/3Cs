# Data Model

**Collections, Schemas, Indexes, and Design Decisions**

---

## Collections Structure

The system uses **4 MongoDB collections**:

1. **`/collaborations/{collabId}`** - Core collaboration data
2. **`/users/{userId}`** - User profiles and preferences
3. **`/discussions/{discussionId}`** - Discussion threads
4. **`/audit_logs/{logId}`** - Action history

---

## Main Collection: Collaborations

### Document Structure

```javascript
{
  // Identity
  _id: ObjectId,
  id: "collab_001",  // Human-readable ID

  // Ownership
  owner: "user_jim",

  // Core data
  outcome: "Biannual camping trip with 20-30 people",

  // Participants (bounded by group size)
  participants: [
    {
      userId: "user_jim",
      role: "owner" | "collaborator" | "participant",
      joinedAt: "2025-11-17T10:00:00Z"
    }
  ],

  // Consensus points (bounded, critical to flow)
  consensus: {
    dates: {
      _type: "consensusPoint",
      question: "When should we go?",
      method: "vote" | "consensus" | "firstCome" | "aiFacilitated",
      status: "pending" | "resolved" | "blocked",
      options: [
        {
          value: "2025-06-14",
          votes: ["user_jim", "user_alice"],
          proposedBy: "user_jim"
        }
      ],
      deadline: "2025-05-15T23:59:59Z",
      result: null
    }
  },

  // Activities (user-defined structure)
  activities: [
    {
      activityId: "act_001",  // Stable ID for references
      name: "Morning Hike",
      time: "08:00",
      duration: {value: 3, unit: "hours"},
      minParticipants: 5,
      signups: ["user_jim", "user_alice"],
      status: "proposed" | "scheduled" | "confirmed" | "canceled",

      // Discussion reference
      discussionId: "disc_001"
    }
  ],

  // System fields
  _permissions: {
    owner: ["*"],
    collaborator: ["updateField", "vote", "addItem", ...],
    participant: ["vote", "addDiscussionMessage"],
    ai: {
      automatic: ["sendMessage", "log"],
      withApproval: ["updateField", "createConsensusPoint"]
    }
  },

  _rules: [
    {
      id: "rule_001",
      enabled: true,
      createdBy: "user_jim",
      trigger: "onFieldChange:activities[*].signups",
      condition: "activities[*].signups.length >= activities[*].minParticipants",
      action: "updateField",
      params: {
        path: "activities[*].status",
        value: "scheduled"
      }
    }
  ],

  _schema: {
    // Type hints for UI generation
    outcome: "text",
    participants: "users[]",
    "activities[*].time": "time",
    "activities[*].duration": "duration"
  },

  // Metadata
  createdAt: "2025-11-17T09:00:00Z",
  lastModified: "2025-11-17T10:30:00Z",
  version: 5
}
```

---

## Supporting Collections

### Users Collection

```javascript
// /users/{userId}
{
  _id: ObjectId,
  userId: "user_jim",
  email: "jim@example.com",
  name: "Jim",
  avatar: "https://...",
  preferences: {
    notifications: {
      email: true,
      push: false
    },
    timezone: "America/Chicago"
  },
  createdAt: "2025-01-15T08:00:00Z"
}
```

### Discussions Collection

```javascript
// /discussions/{discussionId}
{
  _id: ObjectId,
  discussionId: "disc_001",
  collaborationId: "collab_001",
  objectPath: "activities[0]",  // What it's attached to
  messages: [
    {
      userId: "user_jim",
      message: "Should we start earlier?",
      timestamp: "2025-11-17T10:00:00Z"
    },
    {
      userId: "ai",
      message: "Based on weather, 7am would avoid rain.",
      timestamp: "2025-11-17T10:05:00Z"
    }
  ],
  createdAt: "2025-11-17T09:00:00Z",
  lastActivity: "2025-11-17T10:05:00Z"
}
```

### Audit Logs Collection

```javascript
// /audit_logs/{logId}
{
  _id: ObjectId,
  collaborationId: "collab_001",
  action: "updateField",
  actor: "user_jim",
  path: "activities[0].status",
  oldValue: "proposed",
  newValue: "scheduled",
  timestamp: "2025-11-17T10:00:00Z"
}
```

---

## Design Decisions

### Start with 4 Collections
- **Main collaboration data** in one place
- **Users separate** (referenced, not embedded)
- **Discussions separate** (grow unbounded)
- **Audit logs separate** (optional history)

Good for MVP (most collaborations < 1MB)

### What Stays in Main Document

**✅ Activities**
- Core to collaboration workflow
- Bounded by practical limits (< 100 activities typical)
- Easier to query/manipulate when embedded

**✅ Consensus Points**
- Critical to flow
- Limited number (< 20 typical)
- Need to be quickly accessible

**✅ Participants**
- Bounded by group size
- Need for permission checks
- Reference to users collection

**✅ Rules**
- Max 10 per collaboration
- Small data size
- Need to be evaluated together

### What Gets Separate Collection

**✅ Discussions**
- Grow unbounded (many messages)
- Can be lazy-loaded
- Not needed for every operation

**✅ Users**
- Shared across collaborations
- Standard user data
- Separate concerns

**✅ Audit Logs**
- Grow over time
- Used for debugging/history
- Not day-to-day operations

---

## MongoDB Indexes

### Required Indexes

```javascript
// Collaborations
db.collaborations.createIndex({ id: 1 }, { unique: true });
db.collaborations.createIndex({ "participants.userId": 1 });
db.collaborations.createIndex({ lastModified: -1 });
db.collaborations.createIndex({ owner: 1 });

// For queries
db.collaborations.createIndex({ "consensus.dates.status": 1 });
db.collaborations.createIndex({ "activities.status": 1 });

// Users
db.users.createIndex({ userId: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });

// Discussions
db.discussions.createIndex({ discussionId: 1 }, { unique: true });
db.discussions.createIndex({ collaborationId: 1 });
db.discussions.createIndex({ lastActivity: -1 });

// Audit Logs
db.audit_logs.createIndex({ collaborationId: 1, timestamp: -1 });
db.audit_logs.createIndex({ actor: 1, timestamp: -1 });
```

---

## Query Patterns

### Common Queries

**Get user's collaborations:**
```javascript
db.collaborations.find({
  "participants.userId": "user_jim"
}).sort({ lastModified: -1 });
```

**Get collaboration details:**
```javascript
db.collaborations.findOne({ id: "collab_001" });
```

**Get active consensus points:**
```javascript
db.collaborations.find({
  "consensus.*.status": "pending"
});
```

**Get discussions for collaboration:**
```javascript
db.discussions.find({
  collaborationId: "collab_001"
}).sort({ lastActivity: -1 });
```

**Get audit trail:**
```javascript
db.audit_logs.find({
  collaborationId: "collab_001"
}).sort({ timestamp: -1 }).limit(100);
```

---

## Size Considerations

### Typical Collaboration Size

**Small (5-10 people):** ~50KB
- 10 participants
- 5 activities
- 3 consensus points
- 10 rules

**Medium (20-50 people):** ~200KB
- 50 participants
- 20 activities
- 10 consensus points
- 10 rules

**Large (100+ people):** ~500KB
- 100 participants
- 50 activities
- 20 consensus points
- 10 rules

**Very Large (near limit):** ~1-2MB
- 200+ participants
- 100+ activities
- Many nested objects
- Approaching 16MB limit (would need to break out activities)

---

## Future Scaling Options

### If Document Size Becomes Issue

**Break out activities into subcollection:**
```javascript
// /collaborations/{collabId}/activities/{activityId}
{
  activityId: "act_001",
  collaborationId: "collab_001",
  name: "Morning Hike",
  // ... rest of activity data
}
```

**Benefits:**
- Each activity < 100KB
- Scales indefinitely
- Can lazy-load activities

**Tradeoffs:**
- More complex queries
- No atomic updates across activities
- Need to manage references

**When to do this:** When collaborations consistently exceed 10MB

---

**Next:** [Actions System](ACTIONS.md) - How changes happen in the system
