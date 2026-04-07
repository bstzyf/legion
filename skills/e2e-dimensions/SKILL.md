# E2E Quality Dimensions — Implementation Guide

Reference for the e2e-runner agent. Each Section covers one quality dimension: core pattern, key API, pass criteria. Agent should adapt and extend these patterns to the specific project.

---

## Section 1: Functional (Journey Testing)

**Tool**: Playwright POM + journey-based specs

**POM pattern** — one class per page, semantic locators only:

```typescript
// e2e/pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(private page: Page) {
    this.email = page.getByRole('textbox', { name: /email/i });
    this.password = page.getByLabel(/password/i);
    this.submit = page.getByRole('button', { name: /sign in|log in|submit/i });
    this.error = page.getByRole('alert');
  }

  async goto() { await this.page.goto('/login'); }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
```

**Journey spec pattern**:

```typescript
// e2e/journeys/auth.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Auth journey', () => {
  test('valid login → dashboard', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('user@test.com', 'Password123');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('invalid login → error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('user@test.com', 'wrong');
    await expect(login.error).toBeVisible();
  });
});
```

**Locator priority**: `getByRole()` > `getByLabel()` > `getByText()` > `getByTestId()` > CSS. Never XPath.

**Pass criteria**: All HIGH-priority journeys pass. >95% overall.

---

## Section 2: Visual Regression

**Tool**: Playwright `toHaveScreenshot()` with pixel-ratio threshold

**Core pattern** — one spec file covering all critical pages:

```typescript
// e2e/visual/pages.visual.spec.ts
import { test, expect } from '@playwright/test';

const pages = ['/', '/login', '/dashboard'];

for (const path of pages) {
  test(`visual: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    // stylePath hides dynamic content (timestamps, avatars, ads)
    await expect(page).toHaveScreenshot(`${path.replace(/\//g, '_') || 'home'}.png`, {
      maxDiffPixelRatio: 0.01,
      stylePath: 'e2e/helpers/screenshot.css',
    });
  });
}
```

**screenshot.css** — hide volatile elements:
```css
[data-testid="timestamp"], [data-testid="avatar"], .ad-banner { visibility: hidden !important; }
```

**Baseline management**: Stored in `e2e/snapshots/`, committed to VCS. Update: `npx playwright test --update-snapshots`.

**Pass criteria**: All screenshots match baselines within 1% pixel diff.

---

## Section 3: Accessibility

**Tool**: `@axe-core/playwright` — WCAG 2.1 AA scanning

**Setup**: `npm install -D @axe-core/playwright`

**Core pattern** — scan each critical page after navigation:

```typescript
// e2e/a11y/pages.a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/login', '/dashboard'];

for (const path of pages) {
  test(`a11y WCAG AA: ${path}`, async ({ page }, testInfo) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    // Attach full results for debugging
    await testInfo.attach('a11y-results', {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });
    expect(results.violations).toEqual([]);
  });
}
```

**Handling known issues**: `.exclude('#third-party-widget')` or `.disableRules(['color-contrast'])` for documented exceptions only.

**Pass criteria**: Zero violations on critical pages. Attach full JSON for audit trail.

---

## Section 4: Performance

**Tool**: Playwright `page.evaluate()` with Navigation Timing API

**Core pattern** — collect all key metrics in one evaluate call:

```typescript
// e2e/performance/pages.perf.spec.ts
import { test, expect } from '@playwright/test';

const pages = ['/', '/login', '/dashboard'];

for (const path of pages) {
  test(`perf budget: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const fcp = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint');
      return {
        fcp: fcp?.startTime ?? null,
        dcl: nav.domContentLoadedEventEnd - nav.startTime,
        load: nav.loadEventEnd - nav.startTime,
        ttfb: nav.responseStart - nav.requestStart,
        transferKB: Math.round(nav.transferSize / 1024),
      };
    });

    if (m.fcp !== null) expect(m.fcp).toBeLessThan(3000);    // FCP < 3s
    expect(m.dcl).toBeLessThan(4000);                          // DCL < 4s
    expect(m.load).toBeLessThan(6000);                         // Load < 6s
    expect(m.ttfb).toBeLessThan(1800);                         // TTFB < 1.8s
    expect(m.transferKB).toBeLessThan(5 * 1024);               // < 5MB
  });
}
```

**Budget tiers** (adjust per project):

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| FCP | < 1.8s | < 3s | > 3s |
| LCP | < 2.5s | < 4s | > 4s |
| CLS | < 0.1 | < 0.25 | > 0.25 |
| TTFB | < 800ms | < 1.8s | > 1.8s |

**Pass criteria**: All critical pages meet "Acceptable" or better. Advisory, not blocking.

---

## Section 5: Responsive

**Tool**: Playwright `devices` registry + multi-project config

No separate spec files needed. Functional journeys run automatically across configured viewports.

**Key checks per viewport**:
- Nav menu visible (desktop) / hamburger works (mobile)
- Critical content not clipped, no horizontal scroll
- Touch targets ≥ 44x44px on mobile
- Dark mode: add a project with `colorScheme: 'dark'` to spot theme issues

**Project config** (add to `playwright.config.ts` projects array):
```typescript
{ name: 'mobile-chrome', use: devices['Pixel 7'] },
{ name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
// Optional: dark mode
{ name: 'desktop-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
```

**Pass criteria**: All functional journeys pass on all configured viewports.

---

## Section 6: API Contract

**Tool**: Playwright `APIRequestContext` — no browser needed

**Core pattern**:

```typescript
// e2e/api/api.contract.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Contracts', () => {
  test('GET /api/users → 200, array with id+email', async ({ request }) => {
    const res = await request.get('/api/users');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
  });

  test('POST /api/login → token in response', async ({ request }) => {
    const res = await request.post('/api/login', {
      data: { email: 'test@example.com', password: 'Password123' },
    });
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toHaveProperty('token');
  });

  test('protected route without auth → 401', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    expect(res.status()).toBe(401);
  });
});
```

**Hybrid pattern** — API setup + UI verify:
```typescript
test('API-created item visible in UI', async ({ page, request }) => {
  await request.post('/api/items', { data: { name: 'Test' } });
  await page.goto('/items');
  await expect(page.getByText('Test')).toBeVisible();
});
```

**Pass criteria**: All documented endpoints return expected status codes and shapes.

---

## Section 7: Playwright Configuration Template

One unified config covering all dimensions. Comment out unused projects.

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: 30000,
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 }, // Dim 2: visual threshold
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: devices['Desktop Chrome'] },         // Dim 1,2,3,4
    { name: 'mobile-chrome', use: devices['Pixel 7'] },                 // Dim 5: responsive
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } }, // Dim 5: responsive
    { name: 'api', testMatch: '**/api.contract.spec.*', use: {} },       // Dim 6: API only
  ],
  reporter: [
    ['html', { open: 'never', outputFolder: 'e2e-report/html' }],
    ['json', { outputFile: 'e2e-report/results.json' }],
    ['junit', { outputFile: 'e2e-report/junit.xml' }],
  ],
  outputDir: 'e2e-results',
  snapshotDir: 'e2e/snapshots',
});
```

## Section 8: Directory Structure

```
e2e/
├── pages/              # POM — one file per page (Dim 1)
├── journeys/           # Functional journey specs (Dim 1)
├── visual/             # Screenshot comparison specs (Dim 2)
├── a11y/               # Accessibility scan specs (Dim 3)
├── performance/        # Performance budget specs (Dim 4)
├── api/                # API contract specs (Dim 6)
├── snapshots/          # Visual baselines, committed to VCS (Dim 2)
├── fixtures/           # Shared test data
└── helpers/            # setup.ts, screenshot.css, shared utilities
```

Dim 5 (Responsive) needs no directory — it reuses Dim 1 specs across viewport projects.
