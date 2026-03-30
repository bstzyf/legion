---
name: legion:security-review
description: OWASP Top 10 and STRIDE threat modeling security review for code and architecture
triggers: [security, owasp, threat-model, vulnerability, cso]
token_cost: high
summary: "Structured security review using OWASP Top 10 checklist and STRIDE threat modeling. Activates on --security flag or when security-sensitive files are modified."
---

# Security Review

Structured security review skill for Legion. Provides OWASP Top 10 checklist evaluation and STRIDE threat modeling for code and architecture review. Activates automatically when security-sensitive files are modified, or explicitly via the `--security` / `--just-security` intent flag.

Agent: `engineering-security-engineer`

---

## Section 1: Activation

This skill activates when ANY of these conditions are met:

### Explicit Activation
- `--security` or `--just-security` intent flag on `/legion:review`
- `/legion:plan --auto` includes security scan (and `--skip-security` is NOT set)

### Automatic Activation
- Files modified in the current phase include security-sensitive patterns:
  - `*auth*`, `*login*`, `*session*`, `*token*`, `*jwt*`
  - `*password*`, `*credential*`, `*secret*`, `*encrypt*`, `*crypto*`
  - `*permission*`, `*rbac*`, `*acl*`, `*role*`
  - `*middleware*` (often contains auth middleware)
  - API route files with authentication decorators
  - Configuration files with secrets or keys

### Codebase-Aware Activation
- When `.planning/CODEBASE.md` exists and its Risk Areas section identifies security-critical files
- When the phase type is `api` or `security` in CONTEXT.md frontmatter

### When NOT to activate
- Non-code phases (documentation, design, marketing)
- Phases that only modify test files or configuration comments
- When `--skip-security` is explicitly set

---

## Section 2: OWASP Top 10 Checklist

Structured pass/fail evaluation for each OWASP category. The `engineering-security-engineer` agent evaluates each category against the code under review.

### 2.1: Checklist

| # | Category | Severity | Check Items |
|---|----------|----------|-------------|
| 1 | **Injection** | CRITICAL | SQL queries use parameterized statements (not string concatenation). NoSQL queries use typed operators. OS commands use allowlists, not user input. LDAP queries are escaped. Template engines auto-escape output. |
| 2 | **Broken Authentication** | CRITICAL | Passwords hashed with bcrypt/scrypt/argon2 (not MD5/SHA1). Session tokens are cryptographically random. Session invalidation on logout. MFA available for sensitive operations. Rate limiting on login attempts. Account lockout after N failures. |
| 3 | **Sensitive Data Exposure** | HIGH | Data encrypted in transit (TLS 1.2+). Sensitive data encrypted at rest. No secrets in source code or logs. API responses don't leak internal details. PII handling follows minimum necessary principle. Proper key management (no hardcoded keys). |
| 4 | **XML External Entities (XXE)** | HIGH | XML parsers disable external entity processing. DTD processing disabled. If XML not used: N/A (mark as PASS). |
| 5 | **Broken Access Control** | CRITICAL | Resource-level authorization enforced (not just route-level). RBAC/ABAC consistently applied. No IDOR vulnerabilities (direct object references validated). Admin endpoints require elevated privileges. CORS configured restrictively. |
| 6 | **Security Misconfiguration** | MEDIUM | No default credentials in production. Unnecessary features/endpoints disabled. Error messages don't expose stack traces or internal paths. Security headers set (CSP, X-Frame-Options, HSTS). Debug mode disabled in production. |
| 7 | **Cross-Site Scripting (XSS)** | HIGH | Output encoding applied in templates. Content Security Policy (CSP) headers configured. User input sanitized before rendering. DOM manipulation uses safe APIs (textContent, not innerHTML). |
| 8 | **Insecure Deserialization** | HIGH | Untrusted data is not deserialized without validation. Type checking enforced on deserialized objects. Integrity checks (signatures/HMACs) on serialized data. |
| 9 | **Known Vulnerabilities** | MEDIUM | Dependencies scanned for known CVEs. No critically vulnerable packages. Patch currency: dependencies updated within reasonable timeframe. Lock files committed (package-lock.json, yarn.lock). |
| 10 | **Insufficient Logging** | MEDIUM | Authentication events logged (login, logout, failed attempts). Authorization failures logged. Input validation failures logged. Logs don't contain sensitive data (passwords, tokens, PII). Alerting configured for suspicious patterns. |

### 2.2: Evaluation Process

```
For each OWASP category:

Step 1: Determine applicability
  - Is this category relevant to the files under review?
  - If not applicable (e.g., no XML parsing → XXE is N/A): mark PASS with note "N/A"

Step 2: Check each item
  - For each check item in the category:
    - Search the codebase for relevant patterns
    - Evaluate against the check criteria
    - Mark as PASS, FAIL, or WARN (partial compliance)

Step 3: Produce category verdict
  - All items PASS → Category: PASS
  - Any item FAIL with CRITICAL severity → Category: FAIL (blocker)
  - Any item FAIL with HIGH severity → Category: FAIL (must fix before ship)
  - Any item WARN → Category: WARN (recommend fixing)

Step 4: Record findings
  - For each FAIL or WARN: produce a structured finding (Section 5)
```

---

## Section 3: STRIDE Threat Model

Apply STRIDE threat categories to each system boundary identified in the code under review.

### 3.1: Threat Categories

| Category | Question | Mitigation Pattern |
|----------|----------|--------------------|
| **Spoofing** | Can an attacker impersonate a legitimate user or system? | Strong authentication, token validation, certificate pinning |
| **Tampering** | Can data be modified in transit or at rest without detection? | Integrity checks (HMAC, signatures), input validation, checksums |
| **Repudiation** | Can a user deny performing an action? | Audit logging, non-repudiation signatures, timestamps |
| **Information Disclosure** | Can sensitive data be accessed by unauthorized parties? | Encryption, access control, data minimization, secure error handling |
| **Denial of Service** | Can the system be made unavailable? | Rate limiting, resource quotas, input size limits, circuit breakers |
| **Elevation of Privilege** | Can a user gain unauthorized capabilities? | Least privilege, RBAC enforcement, input validation, sandboxing |

### 3.2: Threat Modeling Process

```
For each system boundary (API endpoint, data store, external integration):

Step 1: Identify the boundary
  - What enters and exits this boundary?
  - Who/what are the actors?
  - What data flows through?

Step 2: Apply STRIDE
  - For each of the 6 threat categories:
    - Is this threat applicable to this boundary?
    - What specific attack vectors exist?
    - What mitigations are in place?
    - Are mitigations sufficient?

Step 3: Produce threat table
  | Boundary | Threat | Category | Attack Vector | Mitigation | Status |
  |----------|--------|----------|---------------|------------|--------|
  | /api/auth/login | Brute force | DoS | Repeated login attempts | Rate limiting at 5/min | MITIGATED |
  | /api/auth/login | Credential stuffing | Spoofing | Leaked credentials | MFA + breach detection | PARTIAL |

Step 4: Flag gaps
  - MITIGATED: threat has adequate countermeasure
  - PARTIAL: countermeasure exists but incomplete
  - UNMITIGATED: no countermeasure — produce finding
```

---

## Section 4: Attack Surface Mapping

Read from `.planning/CODEBASE.md` (if exists) to identify security-relevant surfaces.

### 4.1: Surface Categories

| Surface | What to Look For | Risk Level |
|---------|-----------------|------------|
| **API Endpoints** | Authentication requirements, input validation, rate limiting | HIGH |
| **Authentication Boundaries** | Login flows, token generation, session management | CRITICAL |
| **Data Storage** | Encryption at rest, access controls, backup security | HIGH |
| **External Integrations** | API keys, webhook validation, trust boundaries | MEDIUM |
| **File Upload Handlers** | Type validation, size limits, storage location, execution prevention | HIGH |
| **Admin Interfaces** | Elevated privilege paths, access controls, audit logging | CRITICAL |
| **Client-Side Storage** | localStorage/sessionStorage usage, cookie security flags | MEDIUM |
| **Error Handling** | Information leakage in error messages, stack trace exposure | MEDIUM |

### 4.2: Mapping Process

```
Step 1: Read codebase context
  - If .planning/CODEBASE.md exists: extract Risk Areas, Detected Stack, Conventions
  - If not: scan project files for security-relevant patterns

Step 2: Enumerate surfaces
  - List all API endpoints (from route files, controller files)
  - Identify authentication entry points
  - Find data storage access patterns (database queries, file I/O)
  - Map external integrations (HTTP clients, webhook handlers)

Step 3: Classify risk
  - For each surface: assign risk level from the table above
  - CRITICAL surfaces get full OWASP + STRIDE treatment
  - HIGH surfaces get OWASP checklist
  - MEDIUM surfaces get targeted checks based on surface type

Step 4: Produce attack surface map
  Structured output showing all identified surfaces with risk levels
```

---

## Section 5: Finding Format

All security findings follow this structured format:

```markdown
| ID | OWASP Cat | Severity | Finding | File(s) | Remediation | Status |
|----|-----------|----------|---------|---------|-------------|--------|
| SEC-001 | A1:Injection | CRITICAL | SQL query uses string concatenation with user input | src/api/users.js:45 | Use parameterized queries via ORM or prepared statements | OPEN |
```

### Severity Definitions

| Severity | Meaning | Action Required |
|----------|---------|-----------------|
| CRITICAL | Actively exploitable vulnerability with high impact | Immediate fix before any deployment |
| HIGH | Exploitable vulnerability or missing critical control | Fix before ship (/legion:ship will block) |
| MEDIUM | Security weakness that increases risk | Fix soon — track in next phase |
| LOW | Minor security improvement opportunity | Track for future improvement |
| INFO | Security observation, no action needed | Note for awareness |

---

## Section 6: Integration with Review Evaluators

Security review plugs into the review-evaluators skill as the 5th evaluator type.

### 6.1: Evaluator Registration

```
Evaluator: Security Evaluator
Phase Types: security, api, full-stack
Dispatch Target: Internal (engineering-security-engineer agent)
Pass Count: 10 (OWASP categories)
Activation: Section 1 triggers (explicit or automatic)
```

### 6.2: Review Evaluator Integration

When selected by review-evaluators Section 1.2:

```
1. Run OWASP Top 10 Checklist (Section 2)
2. Run STRIDE Threat Model (Section 3) on identified boundaries
3. Run Attack Surface Mapping (Section 4) if CODEBASE.md available
4. Produce structured findings (Section 5)
5. Merge findings with other evaluator results in REVIEW.md
6. CRITICAL findings are added to fix cycle (same as review-loop)
7. HIGH findings block /legion:ship pre-ship gate
8. MEDIUM and LOW findings are reported but don't block
```

### 6.3: Standalone Mode

When invoked via `--just-security` on `/legion:review`:
- Only the Security Evaluator runs (no other evaluators)
- Full OWASP + STRIDE + attack surface mapping
- Results written to REVIEW.md with security-specific section

---

## Section 7: Graceful Degradation

Follows the standard Legion degradation pattern:

1. If security-review skill is referenced but no security-sensitive files detected: skip silently
2. If CODEBASE.md doesn't exist: perform security review without attack surface mapping context
3. If engineering-security-engineer agent personality file is missing: fall back to engineering-senior-developer
4. Never error, never block non-security workflows
5. Security findings are always advisory unless severity is CRITICAL (which blocks ship)

---

## References

This skill is consumed by:

| Consumer | Operation | Section |
|----------|-----------|---------|
| `review.md` | Security review during /legion:review | Sections 2-5 |
| `review-evaluators.md` | 5th evaluator type | Section 6 |
| `plan.md` | Security surface scan during --auto pipeline | Section 4 |
| `ship-pipeline.md` | Pre-ship gate checks for unresolved security findings | Section 5 |

Security review is an optional integration — all workflows function identically without it.
