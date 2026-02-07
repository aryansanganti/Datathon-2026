# Feature 2: Automated Jira Task Allocation

## 1. Overview

Automatically create Jira sprints and assign tasks to team members based on their roles, leveraging MongoDB task data. This eliminates manual sprint planning and ensures role-appropriate task distribution.

---

## 2. Problem Statement

| Pain Point | Impact |
|------------|--------|
| Manual sprint creation in Jira | 15-30 min per sprint |
| Role mismatch in task assignment | Rework, delays |
| Deadline misses due to poor planning | Project slippage |
| No single source of truth | Data inconsistency |

---

## 3. Goals

1. **Zero-touch sprint creation** – Generate sprints in Jira from MongoDB task data
2. **Intelligent assignment** – Match tasks to users by `role` field
3. **Deadline awareness** – Prioritize tasks by due date
4. **Audit trail** – Log all allocations for traceability

---

## 4. Data Model Requirements

### 4.1 Enhanced Task Schema (MongoDB)

```javascript
// server/models/Task.js (NEW)
const TaskSchema = new mongoose.Schema({
    task_id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    role_required: { type: String, required: true }, // 'frontend', 'backend', 'qa', 'devops'
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    deadline: { type: Date, required: true },
    estimated_hours: { type: Number },
    status: { type: String, default: 'pending' }, // pending, allocated, in_progress, done
    allocated_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    jira_issue_key: { type: String }, // Set after Jira sync (e.g., 'SCRUM-15')
    jira_issue_id: { type: String }, // Jira internal ID
    sprint_id: { type: String },
    sprint_name: { type: String },
    synced_to_jira: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
});
```

### 4.2 User Role Extension

```javascript
// Extend existing User model (server/models/User.js)
UserSchema.add({
    role: { type: String }, // 'frontend', 'backend', 'qa', 'devops'
    jira_account_id: { type: String }, // Required for Jira assignment (from /myself or user search)
    capacity_hours_per_sprint: { type: Number, default: 40 }
});
```

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Allocation Engine                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Fetch pending tasks from MongoDB (by deadline)             │
│  2. Group tasks by role_required                                │
│  3. For each role, round-robin assign to users with that role  │
│  4. Create Sprint in Jira via Agile API                        │
│  5. Create Issues in Jira, link to Sprint                      │
│  6. Update MongoDB task records with Jira keys                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. API Endpoints (Write Operations)

### 6.1 Trigger Allocation

```
POST /api/allocation/run
Body: {
    project_key: "SCRUM",
    board_id: 1,
    sprint_name: "Sprint 2026-02-08",
    sprint_duration_days: 14
}
Response: {
    sprint_id: "123",
    sprint_name: "Sprint 2026-02-08",
    issues_created: 5,
    assignments: [
        { task_id: "T001", jira_key: "SCRUM-10", assigned_to: "user@email.com" }
    ]
}
```

### 6.2 Preview Allocation (Dry Run)

```
GET /api/allocation/preview?project_key=SCRUM
Response: {
    tasks: [...],
    proposed_assignments: [...]
}
```

### 6.3 Get Allocation History

```
GET /api/allocation/history?limit=10
```

---

## 7. Fetch Endpoints (Read from MongoDB & Jira)

### 7.1 Fetch All Tasks from MongoDB

```
GET /api/fetch/tasks
Query Params: ?status=pending&role=backend&limit=50&page=1
Response: {
    tasks: [
        { task_id, title, role_required, deadline, status, allocated_to, jira_issue_key }
    ],
    total: 120,
    page: 1
}
```

### 7.2 Fetch Single Task

```
GET /api/fetch/tasks/:task_id
Response: { task_id, title, description, role_required, deadline, status, jira_issue_key, ... }
```

### 7.3 Fetch All Users (with Roles & Jira IDs)

```
GET /api/fetch/users
Query Params: ?role=frontend&source=Jira
Response: {
    users: [
        { user_id, display_name, email, role, jira_account_id, capacity_hours_per_sprint }
    ]
}
```

### 7.4 Fetch Jira Projects (Live from Jira)

```
GET /api/fetch/jira/projects
Response: {
    projects: [
        { id: "10000", key: "SCRUM", name: "My Scrum Project" }
    ]
}
```

### 7.5 Fetch Jira Boards (Live from Jira)

```
GET /api/fetch/jira/boards?project_key=SCRUM
Response: {
    boards: [
        { id: 1, name: "SCRUM board", type: "scrum" }
    ]
}
```

### 7.6 Fetch Sprints from Board (Live from Jira)

```
GET /api/fetch/jira/sprints?board_id=1
Response: {
    sprints: [
        { id: "123", name: "Sprint 1", state: "active", startDate, endDate }
    ]
}
```

### 7.7 Fetch Issues from Jira (Live)

```
GET /api/fetch/jira/issues?project_key=SCRUM&sprint_id=123
Response: {
    issues: [
        { key: "SCRUM-1", summary: "Task Title", status: "To Do", assignee: {...}, priority: "Medium" }
    ]
}
```

### 7.8 Fetch User Workload

```
GET /api/fetch/users/:user_id/workload
Response: {
    user_id: "...",
    allocated_tasks: 5,
    total_estimated_hours: 32,
    capacity_hours: 40,
    availability_percentage: 80
}
```

### 7.9 Fetch Dashboard Summary

```
GET /api/fetch/dashboard/summary
Response: {
    pending_tasks: 15,
    allocated_tasks: 42,
    active_sprints: 2,
    users_by_role: { frontend: 3, backend: 4, qa: 2 }
}
```

---

## 8. Jira API Implementation (jiraClient.js)

> **IMPORTANT**: Jira Cloud API v3 uses `POST /search/jql` with cursor-based pagination (`nextPageToken`), NOT `startAt`. The `startAt` parameter will return 400 Bad Request.

### 8.1 Fetch Projects

```javascript
async function fetchProjects() {
    const res = await axios.get(`${baseURL}/project`, { auth });
    return res.data; // [{ id, key, name, ... }]
}
```

### 8.2 Fetch Boards (Agile API)

```javascript
async function fetchBoards(projectKey) {
    const agileURL = `https://${JIRA_DOMAIN}/rest/agile/1.0`;
    const res = await axios.get(`${agileURL}/board`, {
        auth,
        params: { projectKeyOrId: projectKey }
    });
    return res.data.values; // [{ id, name, type }]
}
```

### 8.3 Fetch Sprints (Agile API)

```javascript
async function fetchSprints(boardId) {
    const agileURL = `https://${JIRA_DOMAIN}/rest/agile/1.0`;
    const res = await axios.get(`${agileURL}/board/${boardId}/sprint`, { auth });
    return res.data.values; // [{ id, name, state, startDate, endDate }]
}
```

### 8.4 Search Issues (Core API v3 – Cursor-Based)

```javascript
// CORRECT: Use nextPageToken, NOT startAt
async function searchIssues(jql, nextPageToken = undefined, maxResults = 50) {
    const payload = {
        jql,
        maxResults,
        fields: ['key', 'summary', 'status', 'assignee', 'created', 'updated', 'priority']
    };
    if (nextPageToken) payload.nextPageToken = nextPageToken;
    
    const res = await axios.post(`${baseURL}/search/jql`, payload, { auth });
    return {
        issues: res.data.issues || [],
        nextPageToken: res.data.nextPageToken,
        isLast: res.data.isLast
    };
}
```

### 8.5 Create Sprint (Agile API)

```javascript
async function createSprint(boardId, name, startDate, endDate) {
    const agileURL = `https://${JIRA_DOMAIN}/rest/agile/1.0`;
    const res = await axios.post(`${agileURL}/sprint`, {
        name,
        startDate,  // ISO 8601: "2026-02-08T00:00:00.000Z"
        endDate,    // ISO 8601: "2026-02-22T00:00:00.000Z"
        originBoardId: boardId
    }, { auth });
    return res.data; // { id, name, state: "future", ... }
}
```

### 8.6 Create Issue (Core API v3)

```javascript
async function createIssue(projectKey, summary, description, issueType, assigneeAccountId) {
    const res = await axios.post(`${baseURL}/issue`, {
        fields: {
            project: { key: projectKey },
            summary,
            description: {
                type: 'doc',
                version: 1,
                content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: description || '' }]
                }]
            },
            issuetype: { name: issueType || 'Task' },
            assignee: assigneeAccountId ? { accountId: assigneeAccountId } : null
        }
    }, { auth });
    return res.data; // { id: "10001", key: "SCRUM-1", ... }
}
```

### 8.7 Move Issues to Sprint (Agile API)

```javascript
async function moveIssuesToSprint(sprintId, issueKeys) {
    const agileURL = `https://${JIRA_DOMAIN}/rest/agile/1.0`;
    await axios.post(`${agileURL}/sprint/${sprintId}/issue`, {
        issues: issueKeys // ["SCRUM-1", "SCRUM-2"]
    }, { auth });
}
```

### 8.8 Get Current User (for testing auth)

```javascript
async function getMyself() {
    const res = await axios.get(`${baseURL}/myself`, { auth });
    return res.data; // { accountId, displayName, emailAddress }
}
```

### 8.9 Search Users (for jira_account_id lookup)

```javascript
async function searchUsers(query) {
    const res = await axios.get(`${baseURL}/user/search`, {
        auth,
        params: { query }
    });
    return res.data; // [{ accountId, displayName, emailAddress }]
}
```

---

## 9. Allocation Algorithm

```
FUNCTION allocateTasks(tasks, users):
    grouped = GROUP tasks BY role_required
    assignments = []
    
    FOR EACH role, roleTasks IN grouped:
        roleUsers = FILTER users WHERE role == role AND jira_account_id EXISTS
        IF roleUsers.length == 0:
            LOG warning: "No users with Jira account for role {role}"
            CONTINUE
        
        SORT roleTasks BY deadline ASC, priority DESC
        userIndex = 0
        
        FOR EACH task IN roleTasks:
            assignedUser = roleUsers[userIndex % roleUsers.length]
            task.allocated_to = assignedUser._id
            assignments.PUSH({ task, user: assignedUser })
            userIndex++
    
    RETURN assignments
```

---

## 10. Implementation Phases

| Phase | Deliverable | Effort |
|-------|-------------|--------|
| **Phase 1** | Task & User model updates | 2 hrs |
| **Phase 2** | `jiraClient.js` – Add all fetch/create functions | 4 hrs |
| **Phase 3** | Fetch routes (`/api/fetch/jira/*`) | 2 hrs |
| **Phase 4** | Allocation engine service | 4 hrs |
| **Phase 5** | Allocation API routes & validation | 2 hrs |
| **Phase 6** | Frontend trigger button | 2 hrs |
| **Phase 7** | Testing & edge cases | 3 hrs |

**Total Estimate: 19 hours**

---

## 11. Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| No users with required role | Skip task, log warning, return in response |
| User missing `jira_account_id` | Create unassigned issue, flag for manual assignment |
| Jira API rate limit (429) | Exponential backoff, max 3 retries |
| Duplicate task allocation | Check `synced_to_jira` before creating |
| Sprint creation fails | Abort entire batch, rollback MongoDB updates |
| Invalid `board_id` | Return 400 with clear error message |
| Jira auth failure (401) | Return 401, prompt user to check `.env` credentials |

---

## 12. Environment Variables Required

```bash
# .env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

---

## 13. Success Metrics

- **Allocation time**: < 30 seconds for 50 tasks
- **Assignment accuracy**: 100% role match
- **Zero manual intervention** for standard sprints
- **API reliability**: 99.9% success rate on Jira operations

---

## 14. Future Enhancements

1. **Capacity-aware allocation** – Respect `capacity_hours_per_sprint`
2. **ML-based assignment** – Learn from historical performance
3. **Slack notifications** – Alert users on new assignments
4. **Conflict detection** – Flag overlapping deadlines
5. **Two-way sync** – Update MongoDB when Jira issues change

---
name: Feat2 Automated Jira Task Allocation
overview: "Implement Feature 2 from feat2.md: MongoDB Task model and User role extension, full Jira client (projects, boards, sprints, create sprint/issue, move to sprint, search users), allocation engine with role-based round-robin, allocation and fetch API routes, allocation history, and a frontend trigger. Integrates with existing User, jiraClient, and fetch patterns; adds recommendations where they improve on the spec."
todos: []
isProject: false
---

# Feature 2: Automated Jira Task Allocation – Implementation Plan

## Scope (from [feat2.md](Datathon-2026/feat2.md))

- **Zero-touch sprint creation** from MongoDB task data; **role-based task assignment**; **deadline-aware** ordering; **audit trail**.
- **Data**: New Task model (MongoDB); extend User with `role`, `jira_account_id`, `capacity_hours_per_sprint`.
- **Engine**: Fetch pending tasks, group by `role_required`, round-robin assign to users with that role and `jira_account_id`, create sprint and issues in Jira, move issues to sprint, update Task records.
- **APIs**: Allocation (run, preview, history); Fetch (tasks, users, jira/projects, boards, sprints, issues, workload, dashboard).

---

## Recommendations (senior engineer)


| Spec                       | Recommendation                                                         | Reason                                                                                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rollback on sprint failure | **No MongoDB writes until all Jira ops succeed**                       | Simpler and safer: create sprint → create issues → move to sprint → then bulk-update Tasks. If any Jira call fails, abort and do not update MongoDB; no rollback logic needed.                                                                              |
| User.jira_account_id       | **Keep explicit; backfill from source_user_id for Jira users**         | For `source: 'Jira'` users, set `jira_account_id = source_user_id` when missing so existing ingested users can be used for allocation without manual data fix.                                                                                              |
| searchIssues pagination    | **Keep existing POST /search/jql + nextPageToken**                     | Your [jiraClient.js](Datathon-2026/server/services/jiraClient.js) already uses cursor-based search; feat2 is correct. No change.                                                                                                                            |
| Fetch route layout         | **Register specific paths before `/:source/:entity**`                  | In [server/routes/fetch.js](Datathon-2026/server/routes/fetch.js), add GET `/tasks`, `/tasks/:task_id`, `/users`, `/jira/projects`, etc. **before** the existing `router.get('/:source/:entity')` so `/api/fetch/tasks` is not interpreted as source=tasks. |
| Allocation history         | **New model AllocationRun**                                            | Store each run: `sprint_id`, `sprint_name`, `project_key`, `board_id`, `assignments[]`, `issues_created`, `created_at` for GET /api/allocation/history.                                                                                                     |
| Jira 429 / retries         | **Reuse [server/utils/retry.js**](Datathon-2026/server/utils/retry.js) | Wrap Jira write calls (createSprint, createIssue, moveIssuesToSprint) with existing exponential backoff; max 3 retries for 429.                                                                                                                             |
| Board fetch                | **GET /rest/agile/1.0/board?projectKeyOrId=X**                         | Agile API lists boards; filter by project via query param.                                                                                                                                                                                                  |


---

## Architecture

```mermaid
flowchart LR
  subgraph api [API]
    AllocRun[POST allocation/run]
    AllocPreview[GET allocation/preview]
    AllocHistory[GET allocation/history]
    FetchTasks[GET fetch/tasks]
    FetchJira[GET fetch/jira/*]
    FetchUsers[GET fetch/users]
    FetchDashboard[GET fetch/dashboard]
  end
  subgraph engine [Allocation Engine]
    LoadTasks[Load pending tasks]
    Allocate[Allocate by role]
    CreateSprint[Create Jira sprint]
    CreateIssues[Create Jira issues]
    MoveSprint[Move issues to sprint]
    UpdateTasks[Update Task docs]
  end
  subgraph store [(MongoDB)]
    Task[Task]
    User[User]
    AllocationRun[AllocationRun]
  end
  subgraph jira [Jira Cloud]
    JiraAPI[Jira REST and Agile API]
  end
  AllocRun --> engine
  LoadTasks --> Task
  Allocate --> User
  CreateSprint --> JiraAPI
  CreateIssues --> JiraAPI
  MoveSprint --> JiraAPI
  UpdateTasks --> Task
  engine --> AllocationRun
  FetchTasks --> Task
  FetchUsers --> User
  FetchJira --> JiraAPI
  FetchDashboard --> Task
  FetchDashboard --> User
```



---

## Phase 1: Data models and User extension

**1.1 Task model (new)**  
Create [server/models/Task.js](Datathon-2026/server/models/Task.js) per feat2 §4.1:

- Fields: `task_id` (string, required, unique), `title`, `description`, `role_required` (required, enum: frontend, backend, qa, devops), `priority` (enum: high, medium, low), `deadline` (Date, required), `estimated_hours`, `status` (default pending; pending, allocated, in_progress, done), `allocated_to` (ref User), `jira_issue_key`, `jira_issue_id`, `sprint_id`, `sprint_name`, `synced_to_jira` (boolean, default false), `created_at`.
- Indexes: `status`, `deadline`, `role_required`, `synced_to_jira`, and optionally `allocated_to`.

**1.2 User extension**  
Extend [server/models/User.js](Datathon-2026/server/models/User.js) per feat2 §4.2:

- Add `role` (string, enum or free text: frontend, backend, qa, devops), `jira_account_id` (string), `capacity_hours_per_sprint` (number, default 40).
- Do **not** remove or change existing fields (`user_id`, `source`, `source_user_id`, etc.). Existing Jira-ingested users have `source: 'Jira'` and `source_user_id`; add a one-time or lazy backfill so `jira_account_id = source_user_id` when source is Jira and `jira_account_id` is missing (optional migration or set in allocation when reading users).

**1.3 AllocationRun model (new)**  
Create [server/models/AllocationRun.js](Datathon-2026/server/models/AllocationRun.js) for history:

- Fields: `sprint_id`, `sprint_name`, `project_key`, `board_id`, `assignments` (array of `{ task_id, jira_key, assigned_to_email_or_id }`), `issues_created` (number), `created_at`.
- Index: `created_at` desc for history listing.

---

## Phase 2: Jira client extensions

Extend [server/services/jiraClient.js](Datathon-2026/server/services/jiraClient.js). Keep existing `searchIssues` and `fetchSprints`; add:

- **fetchProjects**: GET `/rest/api/3/project` (or project search if needed); return list of `{ id, key, name }`.
- **fetchBoards**: GET `/rest/agile/1.0/board?projectKeyOrId={projectKey}`; return `res.data.values` (id, name, type).
- **createSprint**: POST `/rest/agile/1.0/sprint` with body `{ name, startDate, endDate, originBoardId }`; startDate/endDate ISO 8601.
- **createIssue**: POST `/rest/api/3/issue` with `fields.project.key`, `summary`, `description` (ADF: doc with paragraph/text), `issuetype.name` (e.g. Task), `assignee.accountId` (optional).
- **moveIssuesToSprint**: POST `/rest/agile/1.0/sprint/{sprintId}/issue` with body `{ issues: ["KEY-1", "KEY-2"] }`.
- **getMyself**: GET `/rest/api/3/myself` (auth check).
- **searchUsers**: GET `/rest/api/3/user/search?query=...` (for jira_account_id lookup).

Use existing auth (JIRA_EMAIL + JIRA_API_TOKEN). Wrap write calls with [server/utils/retry.js](Datathon-2026/server/utils/retry.js) (e.g. 3 attempts, exponential backoff) for 429 handling. Use config from [server/config/env.js](Datathon-2026/server/config/env.js); ensure JIRA_BASE_URL or JIRA_DOMAIN is present (already used in jiraClient).

---

## Phase 3: Allocation engine service

Create [server/services/allocationEngine.js](Datathon-2026/server/services/allocationEngine.js):

- **allocateTasks(tasks, users)** (pure): Group tasks by `role_required`; for each role, filter users with that `role` and non-empty `jira_account_id`; sort tasks by deadline asc, priority (high > medium > low); round-robin assign to filtered users; return list of `{ task, user }`.
- **previewAllocation(projectKey)** (read-only): Load pending tasks from MongoDB (status = pending, optional filter by role); load users with roles; run allocateTasks; return `{ tasks, proposed_assignments }` without writing.
- **runAllocation(payload)**: Payload: `project_key`, `board_id`, `sprint_name`, `sprint_duration_days`.
  - Load pending tasks (sort by deadline), load users; run allocateTasks.
  - **Step 1**: Create sprint in Jira (startDate = today, endDate = today + sprint_duration_days). On failure: return error, no MongoDB changes.
  - **Step 2**: For each assignment, create Jira issue (project_key, summary from task.title, description from task.description, assignee by user.jira_account_id). Collect issue keys. On any failure: do not update MongoDB; return partial error or abort (recommend abort and return error so user can retry).
  - **Step 3**: moveIssuesToSprint(sprintId, issueKeys).
  - **Step 4**: Bulk-update Task documents: set `jira_issue_key`, `jira_issue_id`, `allocated_to`, `sprint_id`, `sprint_name`, `status: 'allocated'`, `synced_to_jira: true`.
  - **Step 5**: Create AllocationRun document; return `{ sprint_id, sprint_name, issues_created, assignments }`.

Skip tasks already with `synced_to_jira: true` in the run (idempotency). If no users for a role, skip those tasks and log (include in response); still create issues unassigned if desired, or skip (feat2: "Skip task, log warning, return in response").

---

## Phase 4: Allocation API routes

Create [server/routes/allocation.js](Datathon-2026/server/routes/allocation.js):

- **POST /run**: Body `project_key`, `board_id`, `sprint_name`, `sprint_duration_days`. Validate required fields; call allocationEngine.runAllocation; return 200 with sprint_id, sprint_name, issues_created, assignments (e.g. `{ task_id, jira_key, assigned_to }`). On Jira/auth errors return 401/502 with message.
- **GET /preview**: Query `project_key` (optional). Call allocationEngine.previewAllocation; return `{ tasks, proposed_assignments }`.
- **GET /history**: Query `limit` (default 10). Query AllocationRun, sort by created_at desc, limit; return array of run summaries.

Mount under `/api/allocation` in [server/routes/index.js](Datathon-2026/server/routes/index.js) (e.g. `router.use('/allocation', require('./allocation'))`).

---

## Phase 5: Fetch routes (MongoDB and Jira)

Extend [server/routes/fetch.js](Datathon-2026/server/routes/fetch.js). **Define these routes before the existing `router.get('/:source/:entity')**` so they take precedence.

**5.1 Tasks (MongoDB)**  

- **GET /tasks**: Query params `status`, `role`, `limit`, `page`. Filter Task by status/role; paginate; return `{ tasks: [...], total, page }`. Populate `allocated_to` with user display_name/email if needed.
- **GET /tasks/:task_id**: Find Task by task_id; 404 if not found; return single task (with allocated_to populated).

**5.2 Users (MongoDB)**  

- **GET /users**: Query params `role`, `source`. Filter User by role/source; return `{ users: [{ user_id, display_name, email, role, jira_account_id, capacity_hours_per_sprint }] }`.

**5.3 Jira (live)**  

- **GET /jira/projects**: Call jiraClient.fetchProjects(); return `{ projects: [...] }`.
- **GET /jira/boards**: Query `project_key`; call fetchBoards(project_key); return `{ boards: [...] }`.
- **GET /jira/sprints**: Query `board_id`; call fetchSprints(board_id); return `{ sprints: [...] }`.
- **GET /jira/issues**: Query `project_key`, `sprint_id`; build JQL, call searchIssues; return `{ issues: [...] }`.

**5.4 Workload and dashboard**  

- **GET /users/:user_id/workload**: From MongoDB count Task where allocated_to = user_id and status in [allocated, in_progress]; sum estimated_hours; get user capacity_hours_per_sprint; return `{ user_id, allocated_tasks, total_estimated_hours, capacity_hours, availability_percentage }`.
- **GET /dashboard/summary**: Aggregations: pending_tasks (status pending), allocated_tasks (allocated/in_progress), active_sprints (from Jira or from AllocationRun – recommend count AllocationRun with recent created_at or call Jira; simplest: count Task with sprint_id set and status not done). users_by_role: count User grouped by role. Return `{ pending_tasks, allocated_tasks, active_sprints, users_by_role }`.

Route order in fetch.js: first mount the new routes (e.g. router.get('/tasks', ...), router.get('/tasks/:task_id', ...), router.get('/users', ...), router.get('/jira/projects', ...), router.get('/jira/boards', ...), router.get('/jira/sprints', ...), router.get('/jira/issues', ...), router.get('/users/:user_id/workload', ...), router.get('/dashboard/summary', ...)), then the existing `router.get('/:source/:entity', ...)`.

---

## Phase 6: Frontend

- Add an **Allocation** section to [client/src/App.tsx](Datathon-2026/client/App.tsx) (or a dedicated page): form with project_key, board_id, sprint_name, sprint_duration_days and a **Run allocation** button that calls POST `/api/allocation/run`. Show success result (sprint name, issues created, assignments list) or error.
- Optional: **Preview** button that calls GET `/api/allocation/preview?project_key=X` and displays proposed assignments.
- Optional: **Allocation history** list from GET `/api/allocation/history`.
- Reuse existing API base URL and styling (e.g. existing Button, cards).

---

## Phase 7: Edge cases and env

- **No users for role**: Skip those tasks; include in response; do not create Jira issue for them, or create unassigned (feat2: skip and log).
- **User missing jira_account_id**: Skip assignment for that user in round-robin, or create issue unassigned and flag (feat2: create unassigned, flag).
- **Duplicate allocation**: Only consider tasks with `status === 'pending'` and `synced_to_jira !== true` for allocation.
- **Invalid board_id / 401**: Return 400/401 with clear message; no MongoDB writes.
- **Jira 429**: Retry with backoff (max 3) via retry.js.
- **Env**: JIRA_BASE_URL (or JIRA_DOMAIN), JIRA_EMAIL, JIRA_API_TOKEN already used; document in [server/.env.example](Datathon-2026/server/.env.example) if not already present.

---

## File summary


| Area        | Action                                                                                                                                                                                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Models      | New: [server/models/Task.js](Datathon-2026/server/models/Task.js), [server/models/AllocationRun.js](Datathon-2026/server/models/AllocationRun.js). Extend: [server/models/User.js](Datathon-2026/server/models/User.js).                                                                                                                 |
| Jira client | Extend [server/services/jiraClient.js](Datathon-2026/server/services/jiraClient.js): fetchProjects, fetchBoards, createSprint, createIssue, moveIssuesToSprint, getMyself, searchUsers.                                                                                                                                                  |
| Engine      | New: [server/services/allocationEngine.js](Datathon-2026/server/services/allocationEngine.js).                                                                                                                                                                                                                                           |
| Routes      | New: [server/routes/allocation.js](Datathon-2026/server/routes/allocation.js). Extend: [server/routes/fetch.js](Datathon-2026/server/routes/fetch.js) with /tasks, /users, /jira/*, /users/:id/workload, /dashboard/summary before /:source/:entity. Mount allocation in [server/routes/index.js](Datathon-2026/server/routes/index.js). |
| Client      | Extend [client/src/App.tsx](Datathon-2026/client/App.tsx) (or new page): allocation form and run button; optional preview and history.                                                                                                                                                                                                   |


---

## Implementation order

1. **Phase 1**: Task, AllocationRun models; User schema extension.
2. **Phase 2**: jiraClient extensions (fetchProjects, fetchBoards, createSprint, createIssue, moveIssuesToSprint, getMyself, searchUsers).
3. **Phase 3**: allocationEngine (allocateTasks, previewAllocation, runAllocation).
4. **Phase 4**: allocation routes (run, preview, history).
5. **Phase 5**: fetch routes (tasks, users, jira/*, workload, dashboard) with correct route order.
6. **Phase 6**: Frontend allocation trigger and optional preview/history.
7. **Phase 7**: Error handling and env/docs.

This delivers feat2 end-to-end and aligns with your existing Jira auth, User model, and route structure while applying the recommended safety and routing improvements.
