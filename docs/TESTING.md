# Testing Strategy

**E2E-First TDD for AI-Augmented Development**

---

## E2E-First TDD Workflow

```
1. Human describes feature
   ↓
2. AI writes E2E test (would pass if feature exists)
   ↓
3. Human reviews test: "Yes, this is what I meant"
   ↓
4. AI runs test → ❌ RED
   ↓
5. AI implements feature
   ↓
6. AI runs test → ✅ GREEN
   ↓
7. AI refactors if needed
   ↓
8. Human validates UX/experience
```

**Tests are the spec.** If tests pass, feature is done.

---

## Test Infrastructure

### Test Container Setup

```yaml
# docker-compose.yml
services:
  test-runner:
    build: ./e2e-tests
    volumes:
      - ./e2e-tests:/tests
    environment:
      - TEST_DB_URI=mongodb://mongodb-test:27017/test
      - APP_URL=http://frontend
    depends_on:
      - mongodb-test
      - api
      - frontend

  mongodb-test:
    image: mongo:7
    volumes:
      - mongo-test-data:/data/db
    ports:
      - "27018:27017"

volumes:
  mongo-test-data:
```

**Separate test database** ensures clean slate for each test run.

---

## Test Layers

### 1. Component Tests (Fast, Focused)

**Location:** Co-located with components

```
/frontend/components/DatePicker/
  DatePicker.tsx
  DatePicker.test.tsx  ← Lives with component
```

**Example:**
```javascript
test('DatePicker component works', () => {
  render(<DatePicker value="2025-06-14" onChange={handleChange} />);
  userEvent.click(screen.getByTestId('date-picker'));
  userEvent.click(screen.getByText('15'));
  expect(handleChange).toHaveBeenCalledWith('2025-06-15');
});
```

**Purpose:**
- Test UI primitives in isolation
- Fast feedback loop
- No database/API needed

---

### 2. E2E Tests (Comprehensive)

**Location:** Separate test directory

```
/e2e-tests/
  user-creates-collaboration.test.js
  user-adds-activity.test.js
  user-votes-on-consensus.test.js
  helpers/
    collaboration-ui.js
    db.js
    browser.js
```

**Example:**
```javascript
test('User creates collaboration and adds activity', async () => {
  // TRUE end-to-end: browser automation
  await page.goto('/');
  await page.click('[data-testid="new-collaboration"]');
  await page.fill('[data-testid="ai-chat"]', 'Create camping trip');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-testid="collaboration-created"]');

  await page.click('[data-testid="add-activity"]');
  await page.fill('[data-testid="activity-name"]', 'Morning Hike');
  await page.click('[data-testid="save-activity"]');

  // Verify in UI
  await expect(page.locator('[data-testid="activity-card"]'))
    .toContainText('Morning Hike');

  // Verify in database
  const collab = await db.collection('collaborations')
    .findOne({owner: 'testuser'});
  expect(collab.activities[0].name).toBe('Morning Hike');
});
```

**Purpose:**
- Test complete user workflows
- Verify browser + API + database integration
- Ensure features actually work end-to-end

---

## Test Helpers

### Collaboration UI Helpers

```javascript
// e2e-tests/helpers/collaboration-ui.js

export async function createCollaboration(page, outcome) {
  await page.click('[data-testid="new-collaboration"]');
  await page.fill('[data-testid="ai-chat"]', `Create: ${outcome}`);
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-testid="collaboration-created"]');
}

export async function addActivity(page, name) {
  await page.click('[data-testid="add-activity"]');
  await page.fill('[data-testid="activity-name"]', name);
  await page.click('[data-testid="save-activity"]');
  await page.waitForSelector(`text=${name}`);
}

export async function vote(page, consensusName, option) {
  await page.click(`[data-testid="consensus-${consensusName}"]`);
  await page.click(`[data-testid="option-${option}"]`);
  await page.waitForSelector('[data-testid="vote-confirmed"]');
}
```

### Database Helpers

```javascript
// e2e-tests/helpers/db.js

import { MongoClient } from 'mongodb';

let client;
let db;

export async function connectDB() {
  client = await MongoClient.connect(process.env.TEST_DB_URI);
  db = client.db('test');
}

export async function getCollaboration(owner) {
  return await db.collection('collaborations').findOne({owner});
}

export async function resetDatabase() {
  await db.collection('collaborations').deleteMany({});
  await db.collection('users').deleteMany({});
  await db.collection('discussions').deleteMany({});
  await db.collection('audit_logs').deleteMany({});
}

export async function closeDB() {
  await client.close();
}
```

### Browser Helpers

```javascript
// e2e-tests/helpers/browser.js

export async function login(page, userId) {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', `${userId}@test.com`);
  await page.fill('[data-testid="password"]', 'testpass');
  await page.click('[data-testid="submit"]');
  await page.waitForURL('/dashboard');
}

export async function waitForSync(page) {
  // Wait for WebSocket to sync changes
  await page.waitForTimeout(2000);
}
```

---

## Test Structure Example

### Complete E2E Test

```javascript
import { test, expect } from '@playwright/test';
import { connectDB, resetDatabase, getCollaboration, closeDB } from './helpers/db';
import { login, waitForSync } from './helpers/browser';
import { createCollaboration, addActivity } from './helpers/collaboration-ui';

test.describe('Collaboration Creation', () => {
  test.beforeAll(async () => {
    await connectDB();
  });

  test.beforeEach(async () => {
    await resetDatabase();
  });

  test.afterAll(async () => {
    await closeDB();
  });

  test('User creates collaboration with AI help', async ({ page }) => {
    // 1. Login
    await login(page, 'testuser');

    // 2. Create collaboration via AI chat
    await createCollaboration(page, 'Camping trip with friends');

    // 3. Verify in UI
    await expect(page.locator('[data-testid="collaboration-title"]'))
      .toContainText('Camping trip');

    // 4. Verify in database
    const collab = await getCollaboration('testuser');
    expect(collab).toBeDefined();
    expect(collab.outcome).toContain('Camping trip');
    expect(collab.owner).toBe('testuser');
  });

  test('User adds activity to collaboration', async ({ page }) => {
    await login(page, 'testuser');
    await createCollaboration(page, 'Weekend retreat');

    // Add activity
    await addActivity(page, 'Morning Yoga');

    // Verify UI updated
    await expect(page.locator('[data-testid="activity-card"]'))
      .toContainText('Morning Yoga');

    // Verify database
    const collab = await getCollaboration('testuser');
    expect(collab.activities).toHaveLength(1);
    expect(collab.activities[0].name).toBe('Morning Yoga');
  });

  test('Multiple users can collaborate in real-time', async ({ browser }) => {
    // Open two browser contexts (two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // User 1 creates collaboration
    await login(page1, 'user1');
    await createCollaboration(page1, 'Team event');

    // User 2 joins and adds activity
    await login(page2, 'user2');
    await page2.goto('/collaboration/collab_001');  // Invited via link
    await addActivity(page2, 'Ice Breaker');

    // User 1 sees update in real-time
    await waitForSync(page1);
    await expect(page1.locator('[data-testid="activity-card"]'))
      .toContainText('Ice Breaker');

    await context1.close();
    await context2.close();
  });
});
```

---

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run E2E tests only
npm run test:e2e

# Run specific test file
npm run test:e2e -- user-creates-collaboration.test.js

# Run tests in UI mode (interactive)
npm run test:e2e -- --ui

# Run tests in debug mode
npm run test:e2e -- --debug
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: sleep 10

      - name: Run E2E tests
        run: docker-compose run test-runner npm run test:e2e

      - name: Stop services
        run: docker-compose down
```

---

## Test Data Management

### Fixtures

```javascript
// e2e-tests/fixtures/collaborations.js

export const campingTripFixture = {
  id: 'collab_test_001',
  owner: 'testuser',
  outcome: 'Weekend camping trip',
  participants: [
    { userId: 'testuser', role: 'owner', joinedAt: new Date() }
  ],
  activities: [
    {
      activityId: 'act_001',
      name: 'Morning Hike',
      status: 'proposed',
      signups: []
    }
  ],
  consensus: {},
  _permissions: { /* default permissions */ }
};

export async function seedCollaboration(db, fixture) {
  await db.collection('collaborations').insertOne(fixture);
  return fixture.id;
}
```

---

## Best Practices

### DO:

✅ **Test user workflows, not implementation details**
- Test "User can create activity" not "createActivity function works"

✅ **Use data-testid attributes for stable selectors**
- Better than CSS classes which may change

✅ **Reset database between tests**
- Each test should be independent

✅ **Use helper functions to reduce duplication**
- Reusable actions like login, createCollaboration

✅ **Verify both UI and database state**
- Ensures full stack integration

### DON'T:

❌ **Test AI responses exactly**
- AI output is non-deterministic, test behavior not specific text

❌ **Make tests depend on each other**
- Each test should run independently

❌ **Use sleep() unless necessary**
- Use waitFor selectors instead

❌ **Skip database verification**
- UI might show cached data, verify persistence

---

## Debugging Failed Tests

### View Test Screenshots

Playwright automatically captures screenshots on failure:

```
/e2e-tests/test-results/
  user-creates-collaboration-failed/
    screenshot.png
    trace.zip
```

### Run in Headed Mode

```bash
npm run test:e2e -- --headed
```

### Use Playwright Inspector

```bash
npm run test:e2e -- --debug
```

---

**Next:** [API Reference](API.md) - REST endpoints and WebSocket protocol
