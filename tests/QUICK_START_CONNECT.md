# Quick Start: Testing CONNECT Feature

## Right Now (Landing Page)

You have a Connect landing page at `/connect`. Here's how to test it:

### 1. Run Cypress Tests

```bash
# Make sure your dev server is running
npm run dev

# In another terminal, open Cypress
npm run cypress:open

# Or run headless
npm run test:cypress
```

### 2. The Test File Already Exists!

I've created `tests/cypress/e2e/connect.cy.ts` with tests for your current landing page.

### 3. What Gets Tested

✅ Hero section displays correctly  
✅ All three feature cards show up  
✅ Safety guidelines are visible  
✅ Images load with proper alt text  
✅ Safety warning is prominent  

---

## As You Build More Features

### When you add React components:

1. Create component tests:
   ```bash
   touch tests/jest/components/ConnectScreen.test.tsx
   ```

2. Use the template from `CONNECT_FEATURE_TESTING.md`

### When you add API endpoints:

1. Create API tests:
   ```bash
   touch tests/supertest/connect.api.test.ts
   ```

2. Run them:
   ```bash
   npm run test:api
   ```

### When you add mobile features:

1. Create Detox tests:
   ```bash
   touch tests/detox/connect.e2e.spec.ts
   ```

2. Run them:
   ```bash
   npm run test:detox
   ```

---

## Testing Workflow

1. **Write test first** (TDD approach)
2. **See it fail** (red)
3. **Write code** to make it pass
4. **See it pass** (green)
5. **Refactor** if needed

---

## Example: Adding a New Connect Feature

Let's say you want to add a "Browse Groups" feature:

### Step 1: Write the test

```typescript
// tests/jest/components/BrowseGroups.test.tsx
describe('BrowseGroups', () => {
  it('displays list of groups', () => {
    const { getByText } = render(<BrowseGroups />);
    expect(getByText(/reading club/i)).toBeTruthy();
  });
});
```

### Step 2: Run the test (it will fail)

```bash
npm test
```

### Step 3: Build the component

```typescript
// src/components/BrowseGroups.tsx
export function BrowseGroups() {
  return <div>Reading Club</div>;
}
```

### Step 4: Run the test again (it should pass!)

```bash
npm test
```

---

## Need Help?

- See `CONNECT_FEATURE_TESTING.md` for detailed examples
- Check `tests/PROMPTS.md` for Cursor prompts to generate tests
- Look at existing tests in `tests/jest/` for patterns

