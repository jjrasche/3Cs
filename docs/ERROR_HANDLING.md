# Error Handling

**Failure Modes, Retry Strategies, and Resilience Patterns**

---

## Failure Modes

### MongoDB Connection Loss

**Symptom:** Database queries fail, actions can't be executed

**Handling:**

```javascript
// backend/db.js
import mongoose from 'mongoose';

mongoose.connection.on('disconnected', () => {
  logger.error('MongoDB disconnected, attempting reconnect...');
  setTimeout(() => mongoose.connect(MONGODB_URI), 5000);
});

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB error:', error);
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});
```

**Recovery:**
- Automatic reconnection with backoff
- Queue writes during downtime
- Return cached data for reads

---

### WebSocket Connection Drop

**Symptom:** Real-time updates stop, UI shows stale data

**Handling:**

```javascript
// frontend/hooks/useWebSocket.js
export function useWebSocket(collaborationId) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    function connect() {
      ws = new WebSocket('ws://localhost:8080');

      ws.onopen = () => {
        setConnected(true);
        reconnectAttempts = 0;
        ws.send(JSON.stringify({
          type: 'subscribe',
          collaborationId
        }));
      };

      ws.onclose = () => {
        setConnected(false);

        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          logger.info(`Reconnecting in ${delay}ms...`);
          setTimeout(connect, delay);
          reconnectAttempts++;
        } else {
          logger.error('Max reconnect attempts reached');
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
      };
    }

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [collaborationId]);

  return { connected };
}
```

**Recovery:**
- Exponential backoff reconnection
- Show connection status to user
- Fetch latest data on reconnect

---

### AI API Failure

**Symptom:** AI responses fail or timeout

**Handling:**

```javascript
// backend/services/ai.js
async function callAI(prompt, retries = 3) {
  try {
    return await groq.chat(prompt);
  } catch (error) {
    // Rate limit - wait and retry
    if (error.status === 429 && retries > 0) {
      await sleep(5000);
      return callAI(prompt, retries - 1);
    }

    // Server error - retry
    if (error.status >= 500 && retries > 0) {
      await sleep(2000);
      return callAI(prompt, retries - 1);
    }

    // Give up, log, and return fallback
    logger.error('AI call failed', error);
    return {
      error: 'AI temporarily unavailable',
      fallback: true
    };
  }
}
```

**Fallback Strategy:**
- Daily check-in: Skip this batch, try again tomorrow
- User chat: Return error message, suggest trying again
- Critical operations: Degrade gracefully (skip AI suggestion)

---

### Action Execution Failure

**Symptom:** User action fails to modify collaboration

**Handling:**

```javascript
// backend/actions/execute.js
async function executeAction(actionName, params, actor) {
  try {
    // Validate permissions
    if (!hasPermission(actor, collaboration._permissions, actionName)) {
      throw new PermissionError(`User ${actor} cannot ${actionName}`);
    }

    // Execute action
    const result = await actions[actionName](collaboration, params);

    // Save to database with version check
    const updated = await db.updateOne(
      {
        id: params.collaborationId,
        version: collaboration.version
      },
      {
        $set: result.updates,
        $inc: { version: 1 }
      }
    );

    if (updated.matchedCount === 0) {
      // Version mismatch - concurrent modification
      throw new ConflictError('Collaboration was modified by another user');
    }

    return result;

  } catch (error) {
    // Log for debugging
    await db.collection('error_logs').insertOne({
      action: actionName,
      params: params,
      actor: actor,
      error: error.message,
      stack: error.stack,
      timestamp: new Date()
    });

    // Return user-friendly error
    if (error instanceof PermissionError) {
      throw new ActionError({
        code: 'PERMISSION_DENIED',
        message: 'You don\'t have permission to perform this action',
        userMessage: 'Permission denied'
      });
    }

    if (error instanceof ConflictError) {
      throw new ActionError({
        code: 'CONFLICT',
        message: error.message,
        userMessage: 'Someone else modified this. Please refresh and try again.'
      });
    }

    // Generic error
    throw new ActionError({
      code: 'INTERNAL_ERROR',
      message: error.message,
      userMessage: 'Something went wrong. Please try again.'
    });
  }
}
```

**UI Handling:**

```javascript
// frontend/hooks/useAction.js
export function useAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (actionName, params) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/collaborations/${params.collaborationId}/actions/${actionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ params })
      });

      if (!response.ok) {
        const error = await response.json();

        if (error.code === 'CONFLICT') {
          // Reload collaboration and retry
          await refreshCollaboration();
          toast.error('Someone else made changes. Please try again.');
        } else {
          toast.error(error.userMessage || 'Action failed');
        }

        throw error;
      }

      return await response.json();

    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}
```

---

### Rule Evaluation Error

**Symptom:** Rule execution fails or throws error

**Handling:**

```javascript
// backend/rules/evaluate.js
function evaluateRule(rule, collaboration) {
  try {
    // Evaluate condition in sandbox
    const result = vm.runInNewContext(rule.condition, {
      collaboration: collaboration,
      // Expose safe functions only
      Math: Math,
      Date: Date
    }, {
      timeout: 1000 // 1 second max
    });

    return !!result;

  } catch (error) {
    logger.error(`Rule ${rule.id} evaluation failed`, error);

    // Track failures
    rule.failureCount = (rule.failureCount || 0) + 1;

    // Disable rule after 3 consecutive failures
    if (rule.failureCount >= 3) {
      rule.enabled = false;
      logger.warn(`Rule ${rule.id} disabled after 3 failures`);

      // Notify collaboration owner
      sendMessage(collaboration.owner, {
        type: 'rule_disabled',
        ruleId: rule.id,
        reason: 'Too many evaluation errors'
      });
    }

    return false;
  }
}
```

---

## Monitoring & Alerting

### Error Logging

```javascript
// backend/utils/logger.js
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    // Write all errors to error.log
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    }),

    // Write all logs to combined.log
    new winston.transports.File({
      filename: 'combined.log'
    })
  ]
});

// Log to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### Health Check Endpoint

```javascript
// backend/routes/health.js
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date(),
    services: {}
  };

  // Check MongoDB
  try {
    await db.admin().ping();
    health.services.mongodb = 'ok';
  } catch (error) {
    health.services.mongodb = 'error';
    health.status = 'degraded';
  }

  // Check AI provider
  try {
    await groq.ping();
    health.services.ai = 'ok';
  } catch (error) {
    health.services.ai = 'error';
    // AI failure is degraded, not down
    if (health.status === 'ok') {
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Metrics

```javascript
// backend/middleware/metrics.js
const requestCounts = new Map();
const errorCounts = new Map();

export function trackMetrics(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = `${req.method} ${req.route?.path || req.path}`;

    // Track request count
    requestCounts.set(route, (requestCounts.get(route) || 0) + 1);

    // Track errors
    if (res.statusCode >= 400) {
      errorCounts.set(route, (errorCounts.get(route) || 0) + 1);
    }

    logger.info('Request', {
      route,
      method: req.method,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
}

// Expose metrics endpoint
router.get('/metrics', (req, res) => {
  res.json({
    requests: Object.fromEntries(requestCounts),
    errors: Object.fromEntries(errorCounts),
    uptime: process.uptime()
  });
});
```

---

## Graceful Degradation

### Feature Availability Matrix

| Feature | MongoDB Down | AI Down | WebSocket Down |
|---------|--------------|---------|----------------|
| **View collaboration** | ❌ | ✅ | ✅ |
| **Modify data** | ❌ | ✅ | ✅ |
| **Real-time updates** | ✅ | ✅ | ❌ (poll instead) |
| **AI chat** | ✅ | ❌ (show error) | ✅ |
| **Daily check-in** | ❌ | ❌ | ✅ |
| **Rule evaluation** | ✅ | ✅ | ✅ |

### Fallback Strategies

**WebSocket down → Poll for updates:**
```javascript
// frontend/hooks/useCollaboration.js
const { connected } = useWebSocket(collaborationId);

useEffect(() => {
  if (!connected) {
    // Fallback to polling every 5 seconds
    const interval = setInterval(async () => {
      const latest = await fetch(`/api/collaborations/${collaborationId}`);
      setCollaboration(await latest.json());
    }, 5000);

    return () => clearInterval(interval);
  }
}, [connected, collaborationId]);
```

**AI down → Skip suggestions:**
```javascript
// backend/actions/execute.js
async function executeAction(actionName, params, actor) {
  // Execute action normally
  const result = await performAction(actionName, params);

  // Try to get AI suggestion (optional)
  try {
    const suggestion = await ai.suggestNextSteps(collaboration);
    result.aiSuggestion = suggestion;
  } catch (error) {
    // AI unavailable, continue without suggestion
    logger.warn('AI suggestion skipped', error);
  }

  return result;
}
```

---

**Next:** [Deployment Guide](DEPLOYMENT.md) - Production setup and scaling
