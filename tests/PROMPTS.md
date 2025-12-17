# Meta-Prompts You Can Reuse in Cursor

Here are reusable prompts you can keep in this file:

## Generate Jest tests

> "Using `tests/jest/components/ChatScreen.test.tsx` as a style guide, generate Jest tests for `src/screens/OnboardingScreen.tsx`. Cover: initial render, entering a name, selecting focus area (safety vs wellness), and navigation into the Home screen."

## Generate Detox flows

> "Using `tests/detox/app.e2e.spec.ts` as reference, create Detox tests that cover: failed login, successful login, opening the chat with PoCo, sending a message, and seeing a response placeholder."

## Generate Cypress specs

> "Look at `tests/cypress/e2e/login.cy.ts` and generate additional Cypress tests for the `/dashboard/users` page, including search, pagination, and editing a user's emergency contacts."

## Generate Supertest suites

> "Using `tests/supertest/sos.api.test.ts` as a template, create Supertest suites for `/api/mood` with endpoints: POST /log, GET /summary, and proper validation errors."

## Generate AI evals

> "Extend `tests/ai-evals/coaching-evals.json` with 10 more scenarios focused on older men living alone, covering themes like retirement, grief, boredom, and health anxiety. Include `id`, `prompt`, and 3–5 clear `expectations` each."

