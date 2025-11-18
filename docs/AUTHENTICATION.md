# Authentication

**Supabase Auth Integration**

---

## Why Supabase Auth

Replacing Firebase Auth with Supabase:

✅ **Open source** - Self-hostable, full control
✅ **Drop-in replacement** - Same login methods (Google, email, etc.)
✅ **PostgreSQL-backed** - Already running DB anyway
✅ **Free tier generous** - 50,000 MAUs free
✅ **Self-hostable** - Can run locally/on-premise

---

## Authentication Flow

### Login Flow

```
1. User clicks "Login with Google"
   ↓
2. Frontend redirects to Supabase
   ↓
3. User authenticates with Google
   ↓
4. Supabase returns JWT token
   ↓
5. Frontend stores token, includes in API requests
   ↓
6. API validates JWT, extracts userId
   ↓
7. API checks permissions for user
```

---

## Setup

### Supabase Configuration

```javascript
// frontend/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Environment Variables

```bash
# .env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

# Backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Frontend Implementation

### Login Component

```javascript
// frontend/src/components/Login.jsx
import { supabase } from '../lib/supabase';

export function Login() {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      console.error('Login error:', error);
    }
  };

  const handleEmailLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error);
    } else {
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  };

  return (
    <div>
      <button onClick={handleGoogleLogin}>
        Login with Google
      </button>

      <form onSubmit={(e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        handleEmailLogin(email, password);
      }}>
        <input name="email" type="email" placeholder="Email" />
        <input name="password" type="password" placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
```

### Session Management

```javascript
// frontend/src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

### Protected Routes

```javascript
// frontend/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}
```

---

## Backend Implementation

### API Middleware

```javascript
// backend/middleware/authenticate.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}
```

### Using Middleware

```javascript
// backend/routes/collaborations.js
import express from 'express';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/:id', async (req, res) => {
  const collaboration = await db.findOne({
    id: req.params.id,
    'participants.userId': req.userId  // Ensure user has access
  });

  if (!collaboration) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json(collaboration);
});
```

---

## WebSocket Authentication

### Client Connection

```javascript
// Frontend: Include token in WebSocket connection
const token = (await supabase.auth.getSession()).data.session.access_token;

const ws = new WebSocket(`ws://localhost:8080?token=${token}`);
```

### Server Validation

```javascript
// Backend: Validate WebSocket connections
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(1008, 'No token provided');
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      ws.close(1008, 'Invalid token');
      return;
    }

    // Store user info with connection
    ws.userId = user.id;
    ws.userEmail = user.email;

    // Handle messages...
  } catch (error) {
    ws.close(1011, 'Authentication failed');
  }
});
```

---

## User Creation Flow

### On First Login

When user logs in for the first time, create user document:

```javascript
// backend/routes/auth.js
router.post('/create-user', authenticate, async (req, res) => {
  const { user } = req;

  // Check if user already exists
  const existing = await db.collection('users').findOne({ userId: user.id });

  if (existing) {
    return res.json({ exists: true });
  }

  // Create new user document
  await db.collection('users').insertOne({
    userId: user.id,
    email: user.email,
    name: user.user_metadata.full_name || user.email,
    avatar: user.user_metadata.avatar_url,
    preferences: {
      notifications: {
        email: true,
        push: false
      }
    },
    createdAt: new Date()
  });

  res.json({ created: true });
});
```

---

## Logout

```javascript
// Frontend
const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
};
```

---

## Security Considerations

### Token Storage

✅ **DO:** Store tokens in memory or httpOnly cookies
❌ **DON'T:** Store in localStorage (XSS vulnerable)

```javascript
// Supabase automatically handles secure storage
// Tokens are stored in httpOnly cookies by default
```

### Token Refresh

```javascript
// Supabase automatically refreshes tokens
// No manual refresh needed
```

### Rate Limiting

```javascript
// Limit login attempts
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

router.post('/login', loginLimiter, async (req, res) => {
  // Handle login
});
```

---

**Next:** [Error Handling](ERROR_HANDLING.md) - Failure modes and resilience
