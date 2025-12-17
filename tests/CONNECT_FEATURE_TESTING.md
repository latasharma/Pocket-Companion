# Testing Guide for CONNECT Feature

## Overview
CONNECT is a feature that helps users find communities, join group activities, and connect with people who share similar interests. This guide shows how to test it using our test suites.

## What to Test

### 1. **Web Landing Page** (Current: `connect.astro`)
- Page renders correctly
- All sections display properly
- Safety guidelines are visible
- Navigation works

### 2. **Mobile App Features** (Future Implementation)
- Browse communities by interest
- Join/leave groups
- View group activities
- RSVP to events
- Safety features (report, block)
- Group chat functionality

### 3. **API Endpoints** (Future Implementation)
- GET /api/connect/groups
- POST /api/connect/groups/:id/join
- GET /api/connect/activities
- POST /api/connect/activities/:id/rsvp
- POST /api/connect/report

---

## Test Implementation

### Step 1: Cypress E2E Tests (Web Landing Page)

Create: `tests/cypress/e2e/connect.cy.ts`

```typescript
describe('CONNECT Landing Page', () => {
  it('displays the CONNECT hero section', () => {
    cy.visit('/connect');
    cy.contains(/more than just ai/i).should('be.visible');
    cy.contains(/introducing connect/i).should('be.visible');
  });

  it('shows all three feature cards', () => {
    cy.visit('/connect');
    cy.contains(/shared interests/i).should('be.visible');
    cy.contains(/group activities/i).should('be.visible');
    cy.contains(/supportive community/i).should('be.visible');
  });

  it('displays safety guidelines', () => {
    cy.visit('/connect');
    cy.contains(/your safety is our priority/i).should('be.visible');
    cy.contains(/never meet someone one-on-one/i).should('be.visible');
    cy.contains(/group meetings only/i).should('be.visible');
  });

  it('has proper images with alt text', () => {
    cy.visit('/connect');
    cy.get('img[alt*="Shared Interests"]').should('be.visible');
    cy.get('img[alt*="Group Activities"]').should('be.visible');
    cy.get('img[alt*="Supportive Community"]').should('be.visible');
  });
});
```

### Step 2: Jest Component Tests (If you add React components)

Create: `tests/jest/components/ConnectScreen.test.tsx`

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ConnectScreen } from '@/screens/ConnectScreen';

describe('ConnectScreen', () => {
  it('displays list of available groups', () => {
    const { getByText } = render(<ConnectScreen />);
    expect(getByText(/find your community/i)).toBeTruthy();
  });

  it('allows filtering groups by interest', async () => {
    const { getByPlaceholderText, getByText } = render(<ConnectScreen />);
    const filterInput = getByPlaceholderText(/search interests/i);
    
    fireEvent.changeText(filterInput, 'reading');
    
    await waitFor(() => {
      expect(getByText(/reading group/i)).toBeTruthy();
    });
  });

  it('shows join button for groups', () => {
    const { getAllByText } = render(<ConnectScreen />);
    const joinButtons = getAllByText(/join group/i);
    expect(joinButtons.length).toBeGreaterThan(0);
  });
});
```

### Step 3: Jest Hook Tests (For Connect functionality)

Create: `tests/jest/hooks/useConnect.test.ts`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { useConnect } from '@/hooks/useConnect';

jest.mock('@/services/connect', () => ({
  getGroups: jest.fn().mockResolvedValue([
    { id: '1', name: 'Reading Club', members: 12 },
    { id: '2', name: 'Hiking Group', members: 8 },
  ]),
  joinGroup: jest.fn().mockResolvedValue({ success: true }),
}));

describe('useConnect', () => {
  it('loads groups on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useConnect());
    
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    
    expect(result.current.groups).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('joins a group successfully', async () => {
    const { result } = renderHook(() => useConnect());
    
    await act(async () => {
      await result.current.joinGroup('1');
    });

    expect(result.current.joinedGroups).toContain('1');
  });

  it('filters groups by interest', async () => {
    const { result } = renderHook(() => useConnect());
    
    act(() => {
      result.current.setInterestFilter('reading');
    });

    await waitFor(() => {
      expect(result.current.filteredGroups).toHaveLength(1);
      expect(result.current.filteredGroups[0].name).toBe('Reading Club');
    });
  });
});
```

### Step 4: Detox E2E Tests (Mobile App)

Create: `tests/detox/connect.e2e.spec.ts`

```typescript
/* global device, element, by, expect */

describe('CONNECT Feature', () => {
  beforeEach(async () => {
    // Sign in first
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('sign-in-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible();
  });

  it('navigates to CONNECT screen', async () => {
    await element(by.id('connect-tab')).tap();
    await expect(element(by.id('connect-screen'))).toBeVisible();
  });

  it('displays list of available groups', async () => {
    await element(by.id('connect-tab')).tap();
    await expect(element(by.id('group-list'))).toBeVisible();
    await expect(element(by.text(/reading club/i))).toBeVisible();
  });

  it('allows joining a group', async () => {
    await element(by.id('connect-tab')).tap();
    await element(by.id('group-reading-club')).tap();
    await element(by.id('join-group-button')).tap();
    await expect(element(by.text(/you joined this group/i))).toBeVisible();
  });

  it('shows safety warning before joining', async () => {
    await element(by.id('connect-tab')).tap();
    await element(by.id('group-reading-club')).tap();
    await element(by.id('join-group-button')).tap();
    
    await expect(element(by.text(/group meetings only/i))).toBeVisible();
    await element(by.id('acknowledge-safety-button')).tap();
  });
});
```

### Step 5: Supertest API Tests

Create: `tests/supertest/connect.api.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../api/server';

describe('CONNECT API', () => {
  let authToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'test@example.com', password: 'password123' });
    authToken = res.body.access_token;
  });

  describe('GET /api/connect/groups', () => {
    it('returns list of available groups', async () => {
      const res = await request(app)
        .get('/api/connect/groups')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('name');
    });

    it('filters groups by interest', async () => {
      const res = await request(app)
        .get('/api/connect/groups?interest=reading')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.every((g: any) => g.interest === 'reading')).toBe(true);
    });
  });

  describe('POST /api/connect/groups/:id/join', () => {
    it('allows user to join a group', async () => {
      const res = await request(app)
        .post('/api/connect/groups/1/join')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('prevents joining same group twice', async () => {
      await request(app)
        .post('/api/connect/groups/1/join')
        .set('Authorization', `Bearer ${authToken}`);
      
      const res = await request(app)
        .post('/api/connect/groups/1/join')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/connect/report', () => {
    it('allows reporting inappropriate behavior', async () => {
      const res = await request(app)
        .post('/api/connect/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          groupId: '1',
          reason: 'inappropriate_content',
          description: 'User posted inappropriate content',
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reportId');
    });
  });
});
```

---

## Quick Start: Testing Your Current Connect Page

Since you currently have the `connect.astro` landing page, start with Cypress:

1. **Run the Cypress test:**
```bash
npm run cypress:open
```

2. **Or run headless:**
```bash
npm run test:cypress
```

3. **Create the test file:**
```bash
touch tests/cypress/e2e/connect.cy.ts
```

Then copy the Cypress test code above into it.

---

## Testing Checklist

### Current (Landing Page)
- [ ] Page loads correctly
- [ ] All sections render
- [ ] Images load with proper alt text
- [ ] Safety guidelines are visible
- [ ] Responsive design works

### Future (Full Feature)
- [ ] Browse groups by interest
- [ ] Join/leave groups
- [ ] View group activities
- [ ] RSVP to events
- [ ] Safety features (report, block)
- [ ] Group chat
- [ ] Notifications

---

## Next Steps

1. **Start with Cypress** - Test your current landing page
2. **Add component tests** - When you build React components
3. **Add API tests** - When backend endpoints are ready
4. **Add Detox tests** - When mobile app features are implemented

Use the patterns from your existing test files as templates!

