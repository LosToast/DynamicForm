# Dynamic Forms POC (Spring Boot + PostgreSQL)

## 1) Overview

This project is a **Dynamic Forms** Proof of Concept (POC) built using:

- **Spring Boot** (REST API)
- **Spring Data JPA / Hibernate**
- **PostgreSQL** (JSONB storage)
- Docker for local DB runtime

The system allows:
- Creating a **Form**
- Creating multiple **Form Versions** (schema changes over time)
- Publishing one version as the **active** version
- Capturing **Form Submissions** against a specific form version
- Supporting enterprise-like behavior:
    - When a new version is published, existing users can continue on old version until they "sync" to new version.

---

## 2) Goals

### POC Goals Achieved ✅
1. **Dynamic fields support**
    - Form schema stored as JSONB (`schema_json`)
    - Answers stored as JSONB (`answers_json`)

2. **Versioned forms**
    - Each schema change creates a new version
    - Versions are immutable snapshots (recommended behavior)

3. **Publish mechanism**
    - Only **one active version per form** at a time
    - Publishing a version deactivates previous active version

4. **Submission safety**
    - A submission references `form_version_id`
    - Submissions never break when schema changes because old versions remain stored

5. **Enterprise behavior simulation**
    - Existing users can keep using old version (opened version stored client-side)
    - New version availability prompts user to sync

---

## 3) High Level Architecture

### Components
- **Forms Service**
    - Create form
    - Track form lifecycle status (DRAFT, PUBLISHED, ARCHIVED)

- **Form Versions Service**
    - Create new version (schema snapshot)
    - Publish version (activate/deactivate)

- **Submission Service**
    - Submit answers against version
    - Validate submission rules (active/published version)

---

## 4) Database Design (Core)

### Why JSONB?
Dynamic fields mean we cannot keep a fixed relational structure for every possible field.  
Instead:
- store schema as JSONB
- store answers as JSONB

PostgreSQL JSONB provides:
- indexing capability (GIN)
- query support
- flexibility

### Tables
#### `forms`
Represents the master form entity.

Key fields:
- `id (uuid)`
- `name`
- `status` (DRAFT/PUBLISHED/ARCHIVED)
- `created_by`
- timestamps

#### `form_versions`
Represents a versioned schema snapshot.

Key fields:
- `id (uuid)`
- `form_id (uuid)` FK reference (logical reference, not necessarily JPA relationship)
- `version (int)`
- `schema_json (jsonb)`
- `is_active (boolean)`
- `published_at`
- timestamps

Important constraints:
- Unique `(form_id, version)` → prevents duplicate version numbers
- Unique active version per form:
    - enforced via **partial unique index**:
        - only one row with `is_active = true` per `form_id`

#### `form_submissions`
Stores user submissions against a version.

Key fields:
- `id (uuid)`
- `form_id`
- `form_version_id`
- `answers_json (jsonb)`
- `submitted_by`
- timestamps

---

## 5) Key Backend Workflows

### 5.1 Create Form
- Creates `forms` row with status `DRAFT`

### 5.2 Create Version
- Creates new `form_versions` row
- `version` increments
- `is_active=false` by default
- schema stored in `schema_json`

### 5.3 Publish Version (Most Important)
Publishing means:
- deactivate current active version (if any)
- activate target version
- update `forms.status = PUBLISHED`

#### Concurrency + Consistency
This operation must be **transactional**.

Recommended publish algorithm:
1. Lock the form row or ensure serialized publish per form
2. Deactivate existing active version (single update query)
3. Flush (so DB sees it before activating new)
4. Activate target version

---

## 6) Common Issues Observed During POC

### Issue: Duplicate key violation on active version
Error:

Cause:
- DB partial unique constraint ensures only 1 active version
- During publish, if deactivate + activate are not properly ordered/flushed, DB can temporarily see two actives

Fix:
- Ensure deactivate query executes first at DB level
- Use `@Modifying` update query + flush
- Optionally lock form row during publish

---

## 7) API Summary

### Forms
- `POST /api/forms`
- `GET /api/forms/{formId}` (optional)
- `GET /api/forms/{formId}/active`

### Versions
- `POST /api/forms/{formId}/versions`
- `GET /api/forms/{formId}/versions`
- `GET /api/forms/{formId}/versions/{versionId}`
- `POST /api/forms/{formId}/versions/{versionId}/publish`

### Submissions
- `POST /api/forms/{formId}/submissions`
- `GET /api/forms/{formId}/submissions` (optional)

---

## 8) Validation Rules (Backend)

### Form Version rules
- cannot publish archived form
- cannot publish a version that doesn't belong to form
- only one active version allowed

### Submission rules
- submissions must reference an existing form_version
- submissions should only be allowed for:
    - active version OR
    - published version (depends on business rule)
- store submission even if later schema changes

---

## 9) What We Improved vs Initial POC

### Backend Improvements Done ✅
- Versioning introduced instead of overwriting schema
- Active version constraint to prevent multiple published versions
- Transactional publish workflow
- Submission tied to version for historical integrity

### Key Design Strength
Even if schema changes:
- v1 submissions still remain valid
- v1 schema still retrievable
- system supports audits and history

---

## 10) Future Improvements (Production Roadmap)

This section focuses on making the backend scalable and production-ready.

### 10.1 Data Modeling Improvements
1. **Use proper FK constraints**
    - `form_versions.form_id` → FK to `forms.id`
    - `form_submissions.form_version_id` → FK to `form_versions.id`

2. **Store schema metadata separately**
    - Add columns:
        - `schema_hash`
        - `change_summary`
        - `created_by`
    - Helps detect duplicate schemas and diff generation server-side

3. **Add `form_version_status`**
    - DRAFT / PUBLISHED / DEPRECATED
    - Instead of only boolean `is_active`

---

### 10.2 Concurrency and Locking
Publishing should be safe under high traffic.

Recommended:
- pessimistic lock on form row:
    - `SELECT ... FOR UPDATE`
- or optimistic locking using `@Version` on `forms`

---

### 10.3 Schema Validation Layer
Before storing schema_json:
- validate schema structure (field key uniqueness, allowed types)
- validate field constraints (min/max for slider)
- enforce key naming rules

Implementation:
- JSON Schema validation library
- or custom validator in Spring

---

### 10.4 Submission Validation and Compatibility
Production apps require stronger rules:
- allow old versions submissions if user is still on old version
- enforce required fields based on that version schema
- validate answer types:
    - number for NUMBER/SLIDER
    - email regex for EMAIL
    - options membership for RADIO/SELECT

---

### 10.5 Indexing and Performance
Add indexes for:
- `form_versions(form_id, version desc)`
- `form_versions(form_id) where is_active=true`
- `form_submissions(form_id)`
- `form_submissions(form_version_id)`
- GIN index for JSONB:
    - `answers_json`
    - optionally `schema_json`

---

### 10.6 Querying JSONB (Advanced Reporting)
For enterprise reporting:
- ability to search submissions by dynamic field values

Approach:
- define query endpoints like:
    - `/submissions/search?fieldKey=email&value=abc@x.com`
- implement JSONB query:
    - `answers_json ->> 'email' = 'abc@x.com'`

---

### 10.7 Audit + Compliance
Production requires:
- audit log for schema changes
- who published what version and when
- immutable publish events

Add tables:
- `form_version_events`
    - published_by, published_at, previous_version_id, new_version_id

---

### 10.8 Caching
To scale:
- cache active schema per formId
- cache schema by versionId
  Use:
- Redis cache
- Spring Cache abstraction

---

### 10.9 Security
Add:
- authentication (JWT/OAuth)
- authorization rules:
    - only admins can publish
    - users can submit
- request validation + rate limiting

---

### 10.10 Multi-Tenancy (Enterprise Requirement)
If multiple clients/tenants use same app:
- add `tenant_id` column in all tables
- enforce tenant filtering in every query
- use schema-per-tenant or row-level tenancy

---

## 11) Recommended Production Deployment Setup

### Docker Compose (Production-like)
- Postgres container
- Spring Boot container
- optional:
    - Redis
    - Nginx reverse proxy

---

## 12) Summary

This POC demonstrates a robust pattern for dynamic forms:

- JSONB for flexibility
- versioned schemas for history
- submissions tied to version for integrity
- single active published version per form

Next steps toward production:
- enforce validation, locking, auditing, indexing, caching, security, and multi-tenancy.

---

## 13) Quick Test Scenarios (Backend)

### Happy Path
1. Create form
2. Create v1
3. Publish v1
4. Submit against v1
5. Create v2
6. Publish v2
7. Submit against v2
8. Verify v1 submissions remain unchanged

### Negative Tests
- submit to inactive version → reject
- publish version from different formId → reject
- publish archived form → reject
- create duplicate version number → reject

---
