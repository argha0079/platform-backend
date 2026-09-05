# CivicSync Backend — SDK & System Design

A complete, engineering-grade reference for the CivicSync API: architecture, data model, every endpoint's behavior and payload, and step-by-step frontend integration.

> **Base URL:** `http://localhost:8080/api` (dev). All timestamps are ISO-8601 UTC.

---

## Table of contents

1. [Tech stack & architecture](#1-tech-stack--architecture)
2. [Data model & enums](#2-data-model--enums)
3. [Authentication & authorization](#3-authentication--authorization)
4. [API conventions](#4-api-conventions)
5. [Endpoint reference](#5-endpoint-reference)
   - 5.1 [User](#51-user)
   - 5.2 [Challenges](#52-challenges)
   - 5.3 [Organizations](#53-organizations)
   - 5.4 [Projects & milestones](#54-projects--milestones)
   - 5.5 [Admin](#55-admin)
   - 5.6 [Notifications](#56-notifications)
6. [End-to-end workflows](#6-end-to-end-workflows)
7. [Notification reference](#7-notification-reference)
8. [Frontend integration guide](#8-frontend-integration-guide)
9. [Error codes & edge cases](#9-error-codes--edge-cases)
10. [Environment & deployment](#10-environment--deployment)

---

## 1. Tech stack & architecture

| Layer | Technology |
|---|---|
| Runtime | Node.js (ES Modules, `"type": "module"`) |
| Framework | Express 5 |
| ORM | Prisma 7 (`PrismaPg` driver adapter) |
| Database | PostgreSQL (Neon) |
| Auth | Clerk (`@clerk/express`) — JWT only, no local passwords |
| Media upload | Cloudinary (public image/audio URLs) + Multer (memory storage) |
| ML service | External `SIH-ai-service` (FastAPI), consumed over HTTP |

### Layered request flow

Every request travels through the same structured pipeline:

```
 Browser
   │  Authorization: Bearer <Clerk JWT>
   ▼
┌────────────────────────────────────────────────────────┐
│ src/index.js                                           │
│  cors() → clerkMiddleware() → express.json()           │
└────────────────────────────────────────────────────────┘
   │
   ▼
┌────────────────────────────────────────────────────────┐
│ src/routes/index.js  (/api/*)                          │
│  user / challenge / organization / project /           │
│  milestone / admin / notification routers              │
└────────────────────────────────────────────────────────┘
   │
   ▼
 middlewares (per route, in order)
  authenticateUser  → reads JWT, sets req.clerkId
  syncUser          → find-or-create DB User, sets req.user
  requireRole(...)  → guards on req.user.role  (ADMIN/ORGANIZATION/…)
  upload.fields()   → parses multipart (challenge submit only)
   │
   ▼
 controller  → validates params/body, calls service
   │
   ▼
 service     → business logic, cross-entity orchestration
   │            (fires notifications as side effects)
   ▼
 repository  → Prisma queries only
   │
   ▼
 PostgreSQL (via generated Prisma client + PrismaPg adapter)
   │
   ▼
 error middleware → uniform { success:false, message } on failure
```

**Design rules (important):**

- Services/repositories contain **no try/catch** — errors bubble to the global `errorHandler`.
- Business errors are thrown as `new Error(msg)` with a numeric `error.statusCode` (400/403/404/409).
- Notifications are **fire-and-forget**: `NotificationService.notify()` never throws, so a notification failure can never break the main flow.
- The backend never stores/touches passwords. Identity belongs to Clerk; the local `User` row only shadows contact info + role.

### System context

```
┌──────────┐   HTTPS (JWT)   ┌─────────────┐   analyze/similarity   ┌───────────────┐
│ Frontend │ ──────────────▶ │  Backend    │ ─────────────────────▶ │  ML service   │
│  (React) │ ◀────────────── │  :8080      │ ◀───────────────────── │  :8000        │
└──────────┘  JSON responses └─────────────┘        JSON            └───────────────┘
                                  │  ▲                  │
                       PrismaPg   │  │  Cloudinary      │ media buffers
                                  ▼  │                  ▼
                              ┌──────────┐         ┌───────────┐
                              │ Neon     │         │ Cloudinary│
                              │ Postgres │         │  (public  │
                              └──────────┘         │   URLs)   │
                                                   └───────────┘
```

---

## 2. Data model & enums

### Entities (Prisma schema)

| Model | Fields | Purpose |
|---|---|---|
| `User` | id, clerkId (uniq), name, email?, phone?, role | Any human. `role` drives authorization. |
| `Organization` | id, userId (uniq), name, description, type, domains[], email, phone?, website, isVerified, isActive | An org account owned by one `User`. |
| `Challenge` | id, title, description, status, userId, mlCategory, category, priority, priorityScore, mlConfidence, extraction (Json), isDuplicate, similarChallenges[], similarityScore, mlExplanation, unifiedText | A civic issue reported by a citizen, enriched by ML. |
| `ChallengeMedia` | id, challengeId, url, publicId (uniq), mediaType, originalName | Cloudinary-backed image/audio for a challenge. |
| `OrganizationAssignment` | id, challengeId, organizationId, status, source, remarks?, assignedAt, respondedAt | Ties a challenge to an org for response. |
| `Project` | id, challengeId (**uniq**), organizationId, title, description, status | An org actively working a challenge. |
| `Milestone` | id, projectId, title, description, status, dueDate?, completedAt | Sub-steps of a project. |
| `Notification` | id, userId, title, message, type, isRead | In-app alerts, polled by the frontend. |

### Relationships

```
User 1───0..1 Organization 1───0..* OrganizationAssignment *───1 Challenge
User 1───0..* Challenge 1───0..1 Project 1───0..* Milestone
User 1───0..* Notification
Challenge 1───0..* ChallengeMedia
```

### Key enums

```
UserRole        : USER | ORGANIZATION | ADMIN
ChallengeStatus : SUBMITTED | PROCESSING | ASSIGNED | IN_PROGRESS
                | COMPLETED | DUPLICATE | NEEDS_REASSIGNMENT | FAILED
Domain          : DISASTER_MANAGEMENT | AGRICULTURE | HEALTH | EDUCATION
                | WATER_SANITATION | INFRASTRUCTURE | ENVIRONMENT | MINING
                | TRIBAL_WELFARE | EMPLOYMENT | URBAN_DEVELOPMENT | ENERGY | OTHER
Priority        : LOW | MEDIUM | HIGH | CRITICAL        (CRITICAL never produced by ML)
AssignmentStatus: PENDING | ACCEPTED | REJECTED
AssignmentSource: AUTOMATIC | ADMIN
ProjectStatus   : NOT_STARTED | IN_PROGRESS | ON_HOLD | COMPLETED | CANCELLED
MilestoneStatus : PENDING | IN_PROGRESS | COMPLETED
NotificationType: CHALLENGE_SUBMITTED | CHALLENGE_ASSIGNED | CHALLENGE_ACCEPTED
                | CHALLENGE_REJECTED | PROJECT_STARTED | PROJECT_COMPLETED
```

### Status lifecycles

**Challenge:**

```
        submit                    duplicate detected
 USER ─────────────▶ PROCESSING ───────────────▶ DUPLICATE
        │              │  ML unreachable
        │              ▼
        │            FAILED
        ▼
     SUBMITTED ──(auto/manual assign)──▶ ASSIGNED
        ▲                                │
        │                       org ACCEPTS │ (creates Project)
        │ all orgs REJECT                 ▼
        └──────────── NEEDS_REASSIGNMENT IN_PROGRESS ──(project COMPLETED)──▶ COMPLETED
```

**Project / Assembly invariant:** a challenge is worked by **one** org only. `Project.challengeId` is unique, so a second ACCEPT → `409`. Accepting auto-**REJECTs** every sibling PENDING assignment.

| Project status | Challenge status effect |
|---|---|
| `NOT_STARTED` → `IN_PROGRESS` | challenge → `IN_PROGRESS` |
| `IN_PROGRESS`, `ON_HOLD` | challenge stays `IN_PROGRESS` (org owns it) |
| `COMPLETED` | challenge → `COMPLETED` |
| `CANCELLED` | project row **deleted** (milestones cascade) + challenge → `NEEDS_REASSIGNMENT` (admin can reassign; a `CANCELLED` row would 409 re-accept). Cancelling an already-`COMPLETED` project is a no-op. |

---

## 3. Authentication & authorization

- **Who holds identity:** Clerk hosts users (email, phone, MFA, etc.). The backend receives the request only if the Clerk JWT validates.
- **How auth reaches the backend:** request header `Authorization: Bearer <clerk-jwt>` (set automatically by Clerk's frontend SDK when you render its components).
- **How roles work:** the JWT identifies *who* you are (`req.clerkId`). The *role* lives in the DB `User.role` and is attached by `syncUser` (`req.user`). Backend middleware guards use the **DB role**, never Clerk session claims.

### Permission matrix

| Endpoint (path) | USER | ORGANIZATION | ADMIN |
|---|:---:|:---:|:---:|
| `GET /users/me` | ✅ | ✅ | ✅ |
| `POST /challenges` | ✅ | ✅ | ✅ |
| `GET /challenges/mine` | ✅ | ✅ | ✅ |
| `GET /challenges/:id` | owner only | assigned org only | ✅ |
| `GET /challenges/open` | ❌ | ❌ | ✅ |
| `POST /challenges/:id/assign` | ❌ | ❌ | ✅ |
| `POST /organizations/register` | ✅ | ❌ (already org → 400) | ✅ |
| `GET /organizations` | ❌ | ❌ | ✅ |
| `GET/PATCH /organizations/me` | ❌ | ✅ | ✅ |
| `GET /organizations/me/challenges` | ❌ | ✅ | ❌ |
| `PATCH /organizations/me/assignments/:id` | ❌ | ✅ | ❌ |
| `GET /projects/me` | ❌ | ✅ | ❌ |
| `GET /projects/:id` | ❌ | owner org | ✅ |
| `PATCH /projects/:id` | ❌ | ✅ | ❌ |
| `POST/GET /projects/:id/milestones` | ❌ | ✅ | ❌ |
| `PATCH/DELETE /milestones/:id` | ❌ | ✅ | ❌ |
| `GET /admin/*` | ❌ | ❌ | ✅ |
| `GET /notifications*` , `PATCH /notifications*` | ✅ | ✅ | ✅ |

> **Bootstrap admin:** no user exists at first. Set the first one directly in SQL, then use `PATCH /api/admin/users/:id/role` to promote others:
> ```sql
> UPDATE "User" SET role = 'ADMIN' WHERE clerk_id = '<clerkUserId>';
> ```

---

## 4. API conventions

### Response envelope

```jsonc
// success
{ "success": true, "message": "…", "data": <any> }
// success with warning (e.g. degraded submission)
{ "success": true, "message": "…", "data": <any>, "warning": "…" | null }
// failure
{ "success": false, "message": "reason" }
```

### Content types

| Endpoint kind | `Content-Type` | Encoding |
|---|---|---|
| Everything except challenge submit | `application/json` | JSON body |
| `POST /api/challenges` | `multipart/form-data` | text fields `title`, `description` + files `image`, `audio` |

### HTTP status codes

| Code | Meaning | Typical cause |
|---|---|---|
| 200 | OK | reads / updates |
| 201 | Created | submission, assignment, milestone, org register |
| 400 | Bad request | missing/invalid body, invalid enum, self-role-change, file too big per-type |
| 401 | Unauthenticated | missing/invalid Clerk JWT |
| 403 | Forbidden | wrong role via `requireRole` |
| 404 | Not found | missing entity **or** ownership concealment (404 instead of 403 by design) |
| 409 | Conflict | duplicate org registration, email/phone clash, challenge already handled |
| 413 | Payload too large | >10 MB upload |
| 500 | Server error | unexpected; global handler |

---

## 5. Endpoint reference

> Field names with `*` are required. Booleans are `true/false`, dates are ISO-8601.

---

### 5.1 User

#### `GET /api/users/me`
- **Role:** any authenticated user
- **Returns the local `User` row** for the signed-in Clerk user (created on first call via `syncUser`).
- **Frontend:** first screen after login; drives header name/avatar and feature gating by `role`.

```jsonc
// 200
{ "success": true, "message": "User fetched successfully",
  "data": {
    "id": "cm1…", "clerkId": "user_2X…", "name": "Aarav Mehta",
    "email": "aarav@x.com", "phone": null, "role": "USER",
    "createdAt": "2026-09-06T10:00:00Z", "updatedAt": "2026-09-06T10:00:00Z"
  } }
```

---

### 5.2 Challenges

#### `POST /api/challenges` — submit a civic issue
- **Role:** any authenticated user
- **`Content-Type: multipart/form-data`**

| Field | Type | Required | Rules |
|---|---|---|---|
| `title` | text | ✅ | non-empty |
| `description` | text | ⬜ | string; **at least one of** description/image/audio |
| `image` | file | ⬜ | `image/jpeg/png/webp`, ≤ 5 MB |
| `audio` | file | ⬜ | `audio/mpeg|wav|x-wav|mp4|m4a|webm`, ≤ 10 MB |

**What the backend does (sequential):**
1. Creates the challenge with status `PROCESSING`.
2. Calls ML `POST /analyze` (title+description merged, capped at 5000 chars) → on failure **1 retry after 2 s** → if still unreachable/empty, status `FAILED` and returns a warning.
3. Uploads image/audio buffers to **Cloudinary** and stores media rows (failures are non-fatal → warning).
4. Runs ML `POST /similarity` against existing challenges → if `duplicate`, status `DUPLICATE`; else `SUBMITTED` (similarity failures → warning, no dedup).
5. Auto-assigns to orgs whose `domains` contain the ML category → challenge `ASSIGNED` (failures → warning).
6. Returns `201` + the final challenge + a single concatenated `warning` (or `null`).

```jsonc
// 201
{ "success": true, "message": "Challenge submitted successfully",
  "warning": null,
  "data": {
    "id": "cm…", "title": "Broken street light near Vashi station",
    "description": "The light is flickering for a week.",
    "status": "ASSIGNED", "userId": "cm…",
    "category": "INFRASTRUCTURE", "mlCategory": "infrastructure",
    "priority": "HIGH", "priorityScore": 0.87, "mlConfidence": 0.992,
    "extraction": { "location": "Vashi station", "entities": [] },
    "isDuplicate": false, "similarChallenges": [], "similarityScore": null,
    "mlExplanation": "Long-term power fault", "unifiedText": "…",
    "media": [{ "id": "cm…", "url": "https://res.cloudinary.com/…/img.jpg",
                "mediaType": "IMAGE", "originalName": "photo.jpg" }],
    "assignments": [/* filled after auto-assign */],
    "project": null,
    "createdAt": "…", "updatedAt": "…"
  } }
```

**Frontend (file upload) — snippet:**
```tsx
const fd = new FormData();
fd.append("title", title);
if (desc) fd.append("description", desc);
if (image) fd.append("image", image);   // File
if (audio) fd.append("audio", audio);   // File
const res = await api.post("/challenges", fd);   // api = axios instance (see §8)
if (res.data.warning) toast(res.data.warning);    // degraded but saved
// navigate to challenge detail: `/challenges/${res.data.data.id}`
```

#### `GET /api/challenges/mine`
- **Role:** any authenticated user
- Returns current user's challenges, newest first. No pagination (latest 100). Includes `media`, `assignments` (with org) and `project`.

#### `GET /api/challenges/:id`
- **Role:** the **owner**, an **ADMIN**, or an **organization with a PENDING or ACCEPTED assignment** on it.
- Anyone else receives **404** (ownership is concealed).
- Full detail: media, assignments (→ org), project.

#### `GET /api/challenges/open` — admin queue
- **Role:** ADMIN
- Challenges with status `SUBMITTED`, `ASSIGNED`, or `NEEDS_REASSIGNMENT` (newest first). This is the admin's **manual assignment inbox**.

#### `POST /api/challenges/:id/assign` — manual assignment
- **Role:** ADMIN
- Body:
```jsonc
{ "organizationId": "cm…", "remarks": "optional note" }
```
- Allowed when challenge is `SUBMITTED` | `ASSIGNED` | `DUPLICATE` | `NEEDS_REASSIGNMENT`.
- Creates a `PENDING` assignment (source `ADMIN`), sets challenge → `ASSIGNED`, and **notifies the org** (`CHALLENGE_ASSIGNED`).

```jsonc
// 201
{ "success": true, "message": "Challenge assigned successfully",
  "data": {
    "id": "cm…", "challengeId": "cm…", "organizationId": "cm…",
    "status": "PENDING", "source": "ADMIN", "remarks": "…", "assignedAt": "…",
    "respondedAt": null,
    "challenge": { /* full challenge + media */ },
    "organization": { /* org row */ }, "createdAt": "…", "updatedAt": "…"
  } }
```

---

### 5.3 Organizations

#### `POST /api/organizations/register`
- **Role:** any authenticated user who is not already an org owner (else 400)
- Creates an `Organization` and flips `User.role` → `ORGANIZATION` **in one transaction**.

| Field | Type | Required |
|---|---|---|
| `name` | string | ✅ |
| `description` | string | ⬜ |
| `type` | one of `GOVERNMENT | NGO | ACADEMIC_INSTITUTION | STARTUP | MSME | CORPORATE | RESEARCH_ORGANIZATION | OTHER` | ⬜ (defaults OTHER) |
| `domains` | array of `Domain` enum strings | ⬜ (used for auto-assignment matching) |
| `email` | string | ⬜ |
| `phone` | string | ⬜ |
| `website` | string | ⬜ |

```jsonc
// 201 -> { success, message, data: <Organization row: id, userId, name, type,
//          domains[], email, isVerified:false, isActive:true, user:{...}> }
```
> Registering also lets admins see you in `GET /api/admin/organizations` and verify you.

#### `GET /api/organizations` — admin directory
- **Role:** ADMIN — every org + owner contact info + assignment/project counts.

#### `GET /api/organizations/me` / `PATCH /api/organizations/me`
- **Role:** ORGANIZATION (same fields as register; PATCH accepts partial updates).
- 404 if the caller isn't an org owner.

#### `GET /api/organizations/me/challenges`
- **Role:** ORGANIZATION
- Assignments with status `PENDING` **or** `ACCEPTED` (newest first), each with full challenge + media.

#### `PATCH /api/organizations/me/assignments/:assignmentId`
- **Role:** ORGANIZATION (org owner can only respond to its own assignment)
- Body:
```jsonc
{ "response": "ACCEPT" | "REJECT" }
```
- **ACCEPT:** creates a `Project` (`NOT_STARTED`), challenge → `IN_PROGRESS`, auto-**REJECTS** sibling PENDING assignments, notifies submitter (`CHALLENGE_ACCEPTED`). Returns **409** if the challenge is already handled (`Project.challengeId` unique).
- **REJECT:** notifies submitter (`CHALLENGE_REJECTED`); when **no PENDING assignment remains** the challenge → `NEEDS_REASSIGNMENT` so admins can reassign.

```jsonc
// 200 ACCEPT
{ "success": true, "message": "Assignment accepted",
  "data": { "id":"cm…", "challengeId":"cm…", "organizationId":"cm…",
            "status":"ACCEPTED", "source":"AUTOMATIC", "assignedAt":"…",
            "respondedAt":"…", "challenge":{/* w/ media */},
            "organization":{ /* org */ } } }
```

---

### 5.4 Projects & milestones

#### `GET /api/projects/me`
- **Role:** ORGANIZATION — all projects for the caller's org, newest first. Each includes challenge (+ media), org, ordered milestones, `_count.milestones`.

#### `GET /api/projects/:id`
- **Role:** org owner or ADMIN (non-owner org → 404).

#### `PATCH /api/projects/:id`
- **Role:** ORGANIZATION (admin can read, not mutate)
- Body (all optional, partial): `{ "title": "…", "description": "…", "status": "PROJECT_STATUS" }`
- Status side effects on the challenge — see [§2 lifecycle table](#status-lifecycles).

```jsonc
// 200
{ "success": true, "message": "Project updated successfully",
  "data": {
    "id":"cm…", "challengeId":"cm…", "organizationId":"cm…",
    "title":"Vashi street light repair", "description":"…",
    "status":"NOT_STARTED" /* → IN_PROGRESS | ON_HOLD | COMPLETED | CANCELLED */,
    "createdAt":"…", "updatedAt":"…" } }
```

#### `POST /api/projects/:id/milestones`
- **Role:** ORGANIZATION
- Body: `{ "title"*, "description"?, "dueDate"? (ISO string) }`
- If the project was `NOT_STARTED`, it auto-promotes to `IN_PROGRESS` (challenge too) and the submitter gets `PROJECT_STARTED`.

```jsonc
// 201
{ "success": true, "message": "Milestone added successfully",
  "data": { "id":"cm…", "projectId":"cm…", "title":"Site survey",
            "description":"…", "status":"PENDING", "dueDate":"…",
            "completedAt": null, "createdAt":"…", "updatedAt":"…" } }
```

#### `GET /api/projects/:id/milestones`
- **Role:** ORGANIZATION — ordered list for the project.

#### `PATCH /api/milestones/:milestoneId`
- **Role:** ORGANIZATION (must own the parent project; else 404)
- Body: `{ "title"?, "description"?, "status"?, "dueDate"? }`
- Setting `status: "COMPLETED"` stamps `completedAt` (kept if already set); any other status clears it.

#### `DELETE /api/milestones/:milestoneId`
- **Role:** ORGANIZATION
- `200 { success:true, message:"Milestone deleted successfully", data:null }`

---

### 5.5 Admin

All admin routes: `authenticateUser` + `syncUser` + `requireRole("ADMIN")`.

#### `GET /api/admin/stats` — dashboard
```jsonc
// 200 { success, message, data:
{ "totalUsers": 120, "totalOrganizations": 8, "totalChallenges": 45,
  "totalProjects": 6, "totalAssignments": 60, "totalMilestones": 12,
  "challengesByStatus":   { "SUBMITTED": 12, "ASSIGNED": 9, "NEEDS_REASSIGNMENT": 2,
                            "IN_PROGRESS": 4, "COMPLETED": 3, "DUPLICATE": 14, "FAILED": 1 },
  "challengesByPriority": { "HIGH": 11, "MEDIUM": 20, "LOW": 4 },
  "challengesByCategory": { "INFRASTRUCTURE": 15, "EDUCATION": 8 } }
```
Keys without rows are simply absent.

#### `GET /api/admin/users`
Every user (≤100) + their org + counts:
```jsonc
{ "id":"…", "clerkId":"…", "name":"…", "email":"…", "phone":"…", "role":"USER",
  "createdAt":"…",
  "organization": { "id":"…", "name":"…", "type":"NGO", "isVerified":false, "isActive":true } | null,
  "_count": { "challenges": 3, "notifications": 5 } }
```

#### `PATCH /api/admin/users/:id/role`
- Body: `{ "role": "USER" | "ORGANIZATION" | "ADMIN" }`
- Cannot change **your own** role (`400`). Missing user → `404`. Invalid role → `400`.
- This is the **only** way to mint new admins after the first SQL bootstrap.

#### `GET /api/admin/challenges`
All challenges (≤100), each with media, submitter, assignments (→ org), and project (+ milestone count).

#### `PATCH /api/admin/challenges/:id/status`
- Body: `{ "status": "SUBMITTED" | "ASSIGNED" | "NEEDS_REASSIGNMENT" | "COMPLETED" | "DUPLICATE" | "FAILED" }`
- `PROCESSING` / `IN_PROGRESS` are rejected (`400`) — they are system-managed. Missing challenge → `404`.
- Typical use: force a challenge back into the pool, or mark an unreachable one.

#### `GET /api/admin/organizations`
Same shape as `GET /api/organizations` (owner contact + assignment/project counts).

#### `PATCH /api/admin/organizations/:id/verify`
- Body: `{ "isVerified": true | false }` (non-boolean → `400`, missing → `404`)

---

### 5.6 Notifications

Any authenticated role. List is capped at 50 (newest first).

| Endpoint | Purpose |
|---|---|
| `GET /api/notifications` | My notifications, newest first |
| `GET /api/notifications/unread-count` | `{ "success":true, "data": { "count": 3 } }` |
| `PATCH /api/notifications/read-all` | Mark all mine as read |
| `PATCH /api/notifications/:id/read` | Mark one; someone else's → `404` |

```jsonc
// notification object
{ "id":"cm…", "userId":"cm…", "title":"Challenge accepted",
  "message":"Your challenge \"Broken street light…\" has been accepted by an organization.",
  "type":"CHALLENGE_ACCEPTED", "isRead":false,
  "createdAt":"2026-09-06T12:30:00Z", "updatedAt":"…" }
```

---

## 6. End-to-end workflows

### A) Citizen submits a challenge (auto-assignment)

```
 Citizen                    Backend                    ML (:8000)          Cloudinary          Org users
    │  POST /challenges        │                          │                     │                  │
    │ (multipart)              │                          │                     │                  │
    │─────────────────────────▶│  status=PROCESSING       │                     │                  │
    │                          │─────────────────────────▶│ POST /analyze       │                  │
    │                          │◀────────────────────────│ category/priority   │                  │
    │                          │      (retry once)       │                     │                  │
    │                          │───────────────────────────────────────────────▶│ upload media    │
    │                          │◀───────────────────────────────────────────────│ URL             │
    │                          │ POST /similarity (dedup)                       │                  │
    │                          │ SUBMITTED | DUPLICATE                           │                  │
    │                          │ auto-assign if category ∊ org.domains           │                  │
    │                          │──────────────────────────────────────────────────────────────▶ CHALLENGE_ASSIGNED
    │ 201 + challenge + warning│                          │                     │                  │
    │◀─────────────────────────│                          │                     │                  │
```
The submitter sees their result immediately; the **org users are notified** (`CHALLENGE_ASSIGNED`) and their inbox (`GET /organizations/me/challenges`) shows the PENDING assignment.

### B) Assignment accepted → project → milestones

```
 Admin  /  Org A                    Backend                         Citizen
   │  assign or org ACCEPT           │                              │
   │────────────────────────────────▶│ Project created (NOT_STARTED)│
   │                                 │ siblings auto-REJECTED       │
   │                                 │ challenge → IN_PROGRESS      │
   │                                 │ CHALLENGE_ACCEPTED          │──────────notification
   │ org adds milestone              │ (promotes to IN_PROGRESS)    │
   │────────────────────────────────▶│ PROJECT_STARTED             │──────────notification
   │ org sets project COMPLETED      │ challenge → COMPLETED        │
   │────────────────────────────────▶│ PROJECT_COMPLETED           │──────────notification
```

### C) Rejection → reassignment loop

```
 Org rejects → CHALLENGE_REJECTED (submitter)
   └─ if no PENDING assignments remain → challenge NEEDS_REASSIGNMENT
        → shows in GET /challenges/open
        → admin assigns to another org (POST /challenges/:id/assign)
        → org ACCEPT → fresh Project (no 409, because cancel rejects delete cleanly)
```

---

## 7. Notification reference

| `type` | Fired when | Recipient | Title |
|---|---|---|---|
| `CHALLENGE_ASSIGNED` | auto-assign on submit **or** manual admin assign | the assigned org's user | New challenge assigned |
| `CHALLENGE_ACCEPTED` | org accepts an assignment | the challenge submitter | Challenge accepted |
| `CHALLENGE_REJECTED` | org rejects an assignment | the challenge submitter | Challenge rejected |
| `PROJECT_STARTED` | project `NOT_STARTED → IN_PROGRESS` (incl. first milestone) | the challenge submitter | Project started |
| `PROJECT_COMPLETED` | project → `COMPLETED` | the challenge submitter | Project completed |

(No notification is sent on a raw challenge submission — chosen product scope. Sibling auto-rejections don't notify.)

Notifications are **stored and polled**, not pushed (no SSE/WebSocket). Frontend pattern: poll `GET /notifications/unread-count` every 30–60 s; refresh badge; refetch on visibilitychange.

---

## 8. Frontend integration guide

### 8.1 Set up Clerk + the API client

```tsx
// main.tsx — wrap your app once
import { ClerkProvider } from "@clerk/clerk-react";

<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
  <App />
</ClerkProvider>
```

Clerk's SDK attaches the JWT to requests. Make sure the **axios instance passes it through** (it does automatically for `fetch` via `getToken`, but for axios use an interceptor):

```ts
// api.ts
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + "/api" });

// attach the Clerk JWT to every request
export function useApi() {
  const { getToken } = useAuth();
  api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return api;
}
```

### 8.2 Auth state → role-based UI

```tsx
const { isLoaded, isSignedIn, user } = useUser();
useEffect(() => { if (isSignedIn) api.get("/users/me").then(r => setMe(r.data.data)); }, [isSignedIn]);
// me.role === "USER"  |  "ORGANIZATION"  |  "ADMIN"
// gate routes: <Route element={me?.role === "ADMIN" ? <AdminHome/> : <Navigate to="/"/>}/>
```
> On a new Clerk auth, `/users/me` **auto-creates** the DB user (via `syncUser`). It must be called once after sign-in (and the frontend must send the JWT or `syncUser` can't find the clerk user).

### 8.3 Submit a challenge (multipart)

```tsx
const onSubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData();
  fd.append("title", titleRef.current.value);
  if (desc) fd.append("description", desc);
  if (imageFile) fd.append("image", imageFile);
  if (audioFile) fd.append("audio", audioFile);
  const { data } = await api.post("/challenges", fd);
  if (data.warning) notify(data.warning);       // media/similarity degraded
  navigate(`/challenges/${data.data.id}`);
};
```
File constraints to enforce client-side to match the server: image `jpeg/png/webp` ≤ 5 MB, audio `mpeg/wav/m4a/webm` ≤ 10 MB.

### 8.4 Org inbox: accept / reject

```tsx
const { data } = await api.get("/organizations/me/challenges");
// data.data = [{ id, status:"PENDING", challenge:{title, media:[…]}, … }]

const respond = async (assignmentId, response) =>
  api.patch(`/organizations/me/assignments/${assignmentId}`, { response });

// ACCEPT failure paths to handle:
//  409 → "already handled by another org" (someone was faster)
//  400 → "already responded"
```

### 8.5 Admin dashboard + assignments

```tsx
const [stats, setStats] = useState();
useEffect(() => { api.get("/admin/stats").then(r => setStats(r.data.data)); }, []);

// assignment inbox:
const { data } = await api.get("/challenges/open");   // SUBMITTED|ASSIGNED|NEEDS_REASSIGNMENT
await api.post(`/challenges/${id}/assign`, { organizationId });
```

### 8.6 Notification badge (polling)

```tsx
const [unread, setUnread] = useState(0);
useEffect(() => {
  const tick = async () => {
    const r = await api.get("/notifications/unread-count");
    setUnread(r.data.data.count);
  };
  tick();
  const t = setInterval(tick, 30_000);
  return () => clearInterval(t);
}, []);

// mark one read:
await api.patch(`/notifications/${id}/read`);
// mark all:
await api.patch("/notifications/read-all");
```

### 8.7 Recommended screen map

| Role | Screens |
|---|---|
| USER | Home, Submit Challenge, My Challenges, Challenge Detail, Notifications (bell) |
| ORGANIZATION | Inbox (assignments), Projects list, Project detail + milestones, Organization profile, Notifications |
| ADMIN | Dashboard (stats), Users (promote/verify), Challenges (status + assign), Organizations (verify), Notifications |

---

## 9. Error codes & edge cases

| # | Gotcha | Consequence / handling |
|---|---|---|
| 1 | **ML availability** | If `/analyze` unreachable after 1 retry → challenge `FAILED`, `201` with `warning`. Retry requires citizen resubmission (no retry endpoint). |
| 2 | **ML rate limits** | `/analyze` 10/min, `/similarity` 20/min (per ML service) — do not hammer during load-tests. |
| 3 | **Single-org guarantee** | `Project.challengeId @unique` → second ACCEPT `409` "already handled". |
| 4 | **Reassignment loop** | All orgs reject → `NEEDS_REASSIGNMENT`; cancel likewise. Both visible in `/challenges/open` and assignable. |
| 5 | **Cancel deletes the project** | `CANCELLED` removes the project + milestones so a new org can build fresh. Do not expect audit history post-cancel. |
| 6 | **409 on register/contact** | Duplicate org or email/phone already used → `409` with readable message (from `syncUser` P2002 guard). |
| 7 | **404 privacy** | Non-owner/non-assigned viewing a challenge/project/milestone → `404` (not `403`). |
| 8 | **Multer limits** | Any upload > 10 MB → `413`; wrong mimetype → `400`; per-type caps (5 MB image / 10 MB audio) are **400**. |
| 9 | **Comma in text** | Backend strips commas before `/similarity` so a comma inside text doesn't split list items (verified live). |
| 10 | **Pagination cap** | Read lists return ≤100 (orgs/challenges/users), notifications ≤50. No cursor API yet. |
| 11 | **CRITICAL priority** | Enum exists but ML only yields High/Medium/Low — frontend can ignore `CRITICAL`. |

---

## 10. Environment & deployment

### Backend `.env`
```
PORT=8080
DATABASE_URL=postgresql://… (Neon, sslmode=require)
CLERK_PUBLISHABLE_KEY=…
CLERK_SECRET_KEY=…
ML_SERVICE_URL=http://127.0.0.1:8000
CLOUDINARY_CLOUD_NAME=…
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
```

### One-time bootstrap
1. `npm install`
2. Migrate DB: `npx prisma migrate dev`
3. Start ML service (its venv needs `slowapi` — missing from its `requirements.txt`; install if missing)
4. `npm run dev`
5. **Create the first admin** via SQL (see §3), then promote others via `PATCH /api/admin/users/:id/role`.

### External service contracts (reference only — do NOT modify the ML repo)
- `POST /analyze?challenge=<text 1..5000 chars>` (multipart, optional `image`/`audio`) → `{ challenge, unified_text, category, extraction, priority, similarity, explanation }`
- `POST /similarity` (multipart `challenge`, `existing_challenges` comma-separated) → `{ duplicate, similar, similarity_score, matched_challenge }`
- `/analyze` returns an **empty similarity** block — dedup must use `/similarity` separately (the backend already does this).