# Slack Agent Platform — Full API Reference

> **Base URL:** `http://localhost:5001/api/slack-agent`
> **Auth:** Bearer JWT via `Authorization: Bearer <token>` header (except `/events/ingest`)
> **Response Envelope:**
>
> ```json
> { "success": true|false, "message": "Human-readable message", "data": {...} | [...] | null }
> ```

---

## Table of Contents

1. [Setup Flow — What To Do After What](#setup-flow--what-to-do-after-what)
2. [Workspaces](#1-workspaces)
3. [Channels](#2-channels)
4. [Users](#3-users)
5. [Agents](#4-agents)
6. [Tickets](#5-tickets)
7. [Threads](#6-threads)
8. [Classification](#7-classification)
9. [Workflows](#8-workflows)
10. [Skills](#9-skills)
11. [SLA](#10-sla)
12. [Escalations](#11-escalations)
13. [Routing](#12-routing)
14. [Knowledge](#13-knowledge)
15. [Events](#14-events)
16. [Analytics](#15-analytics)
17. [Dashboard](#16-dashboard)
18. [Audit Logs](#17-audit-logs)
19. [Notifications](#18-notifications)
20. [Search](#19-search)
21. [Admin](#20-admin)
22. [MCP (Model Context Protocol)](#21-mcp-model-context-protocol)
23. [Webhooks](#22-webhooks)
24. [Status Codes](#status-codes)

---

## Setup Flow — What To Do After What

This platform has a natural dependency order. Follow this sequence when testing or building:

```
Phase 1 ── Foundation
─────────────────────────────────────────────────
  1. POST /api/auth/user/login          (get JWT token)
  2. GET  /workspaces/oauth-url          (get Slack install URL)
  3. POST /workspaces/install            (install Slack workspace)
  4. POST /workspaces/:id/channels/sync  (discover Slack channels)
  5. POST /workspaces/:id/users/sync     (discover Slack users)

Phase 2 ── Intelligence
─────────────────────────────────────────────────
  6. POST /admin/categories              (define ticket categories)
  7. POST /admin/tags                    (define ticket tags)
  8. POST /skills                        (register agent skills)
  9. POST /knowledge                     (upload knowledge docs)
 10. POST /knowledge/:id/index           (index for vector search)

Phase 3 ── Agents & Rules
─────────────────────────────────────────────────
 11. POST /agents                        (create AI agent)
 12. POST /agents/:id/channels           (assign channels to agent)
 13. POST /agents/:id/skills             (assign skills to agent)
 14. POST /agents/:id/toggle             (enable agent)
 15. POST /sla-policies                  (define SLA policies)
 16. POST /escalations                   (define escalation rules)
 17. POST /routing/rules                 (define routing rules)
 18. POST /workflows                     (create automation workflows)

Phase 4 ── Operations
─────────────────────────────────────────────────
 19. POST /tickets                       (create a ticket)
 20. POST /classify/tickets/:id          (AI classify the ticket)
 21. POST /tickets/:id/assign            (assign to agent/user)
 22. POST /tickets/:id/close             (resolve & close)
 23. POST /tickets/:id/comments          (add follow-up)
 24. POST /threads/:id/link              (link Slack thread)

Phase 5 ── Monitoring
─────────────────────────────────────────────────
 25. GET  /analytics/tickets             (view ticket metrics)
 26. GET  /analytics/sla                 (view SLA compliance)
 27. GET  /dashboard/live                (live monitoring)
 28. GET  /audit-logs                    (audit trail)
```

**Dependency rule:** You cannot use an `:id` parameter until you have created/retrieved that resource in a prior step.

---

## 1. Workspaces

Workspaces represent Slack team installations. You must install a workspace before doing anything else.

---

### `GET /workspaces/oauth-url`

**What it does:** Returns the Slack OAuth v2 URL. Redirect users to this URL so they can authorize the app in their Slack workspace.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "url": "https://slack.com/oauth/v2/authorize?client_id=123&scope=channels:read,chat:write,..."
  }
}
```

---

### `POST /workspaces/install`

**What it does:** Exchanges the OAuth code (returned by Slack after user authorization) for access tokens and saves the workspace in the database.

**Request Body:**

```json
{
  "code": "1234567890.abcdef",
  "redirectUri": "https://yourapp.com/auth/slack/callback"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Slack workspace installed successfully",
  "data": {
    "_id": "660abc123...",
    "teamId": "T0123456",
    "teamName": "Acme Corp",
    "teamDomain": "acme",
    "isActive": true,
    "settings": {},
    "installedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

> ⬇️ Save `data._id` as `workspaceId` — you'll use it in every channel/user call.

---

### `GET /workspaces`

**What it does:** Lists all Slack workspaces your organization has installed.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "660abc123...",
      "teamId": "T0123456",
      "teamName": "Acme Corp",
      "isActive": true,
      "installedAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### `GET /workspaces/:workspaceId`

**What it does:** Gets full details for a single installed workspace.

**Request:** None (uses URL param)  
**Response:** Full workspace document.

---

### `POST /workspaces/:workspaceId/sync`

**What it does:** Re-fetches workspace metadata (team name, domain, icon) from the Slack API and updates the database.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Workspace synced successfully",
  "data": {
    /* updated workspace document */
  }
}
```

---

### `PATCH /workspaces/:workspaceId/settings`

**What it does:** Updates workspace-level settings like default notification preferences.

**Request Body:**

```json
{
  "settings": { "defaultMonitorChannel": "C12345", "notificationPrefs": { "onTicketCreate": true } }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Workspace settings updated",
  "data": {
    /* workspace with new settings */
  }
}
```

---

### `DELETE /workspaces/:workspaceId`

**What it does:** Disconnects the workspace and revokes all Slack tokens. The workspace and its channels/users remain in the database but are marked inactive.

**Request:** None  
**Response:**

```json
{ "success": true, "message": "Workspace disconnected successfully", "data": null }
```

---

## 2. Channels

Channels are Slack conversation rooms. You can sync them from Slack and configure monitoring.

---

### `POST /workspaces/:workspaceId/channels/sync`

**What it does:** Fetches all channels (public and private where the bot is a member) from Slack and stores/updates them in the database.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Channels synced successfully",
  "data": [
    {
      "_id": "660def...",
      "channelId": "C12345",
      "channelName": "general",
      "isMember": true,
      "isPrivate": false,
      "isMonitored": false,
      "memberCount": 42
    }
  ]
}
```

> ⬇️ Pick a channel and save `_id` as `channelId`.

---

### `GET /workspaces/:workspaceId/channels`

**What it does:** Lists all channels from the database for a given workspace.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": [
    { "_id": "660def...", "channelId": "C12345", "channelName": "general", "isMonitored": true, ... }
  ]
}
```

---

### `GET /workspaces/:workspaceId/channels/search?q=keyword`

**What it does:** Searches channels by name substring.

**Query:** `q` — search keyword  
**Response:**

```json
{
  "success": true,
  "data": [
    /* matching channels */
  ]
}
```

---

### `GET /channels/:channelId`

**What it does:** Gets detailed information about a single channel.

**Request:** None  
**Response:** Full channel document.

---

### `POST /channels/:channelId/monitor`

**What it does:** Adds the channel to the monitoring list. The AI agent will listen to messages in this channel and can auto-create tickets from them.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Channel added to monitoring",
  "data": {
    /* channel with isMonitored: true */
  }
}
```

> **Flow:** Do this AFTER creating an agent and BEFORE expecting the agent to respond in that channel.

---

### `DELETE /channels/:channelId/monitor`

**What it does:** Removes the channel from monitoring. The agent will stop listening.

**Request:** None  
**Response:**

```json
{ "success": true, "message": "Channel removed from monitoring", "data": null }
```

---

### `PATCH /channels/:channelId/permissions`

**What it does:** Updates channel-level permissions (e.g., who can read/write/monitor).

**Request Body:**

```json
{ "permissions": ["read", "write", "monitor"] }
```

**Response:**

```json
{
  "success": true,
  "message": "Channel permissions updated",
  "data": {
    /* updated channel */
  }
}
```

---

### `PATCH /channels/:channelId/config`

**What it does:** Updates channel-specific configuration (auto-response rules, ticket creation settings, etc.).

**Request Body:**

```json
{ "configuration": { "autoCreateTickets": true, "autoRespondGreeting": false } }
```

**Response:**

```json
{
  "success": true,
  "message": "Channel configuration updated",
  "data": {
    /* updated channel */
  }
}
```

---

## 3. Users

Sync and look up Slack users (members) from your workspace.

---

### `POST /workspaces/:workspaceId/users/sync`

**What it does:** Fetches all users from Slack and stores them in the database.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Users synced successfully",
  "data": [
    {
      "_id": "660abc...",
      "slackUserId": "U12345",
      "name": "john.doe",
      "realName": "John Doe",
      "email": "john@acme.com",
      "isAdmin": false,
      "isBot": false,
      "timezone": "America/New_York"
    }
  ]
}
```

---

### `GET /workspaces/:workspaceId/users`

**What it does:** Lists all Slack users stored for the workspace.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": [
    /* array of user objects */
  ]
}
```

---

### `GET /workspaces/:workspaceId/users/:slackUserId`

**What it does:** Looks up a single user by their Slack user ID (e.g., `U12345`).

**Request:** None  
**Response:** Single user document.

---

### `GET /workspaces/:workspaceId/user-groups`

**What it does:** Lists Slack user groups (usergroups) for the workspace. _(Placeholder — returns `[]`)_

---

### `GET /workspaces/:workspaceId/teams`

**What it does:** Lists Slack teams (Enterprise Grid). _(Placeholder — returns `[]`)_

---

## 4. Agents

Agents are AI entities that monitor channels, create tickets, and execute skills. This is the core intelligence layer.

---

### `POST /agents`

**What it does:** Creates a new AI agent. You give it a name, description, AI instructions, and LLM configuration.

**Request Body:**

```json
{
  "name": "Support Bot",
  "description": "Handles customer support inquiries in the #support channel",
  "aiInstructions": [
    {
      "type": "system",
      "content": "You are a helpful support agent for Acme Corp.",
      "priority": "high"
    }
  ],
  "llmConfig": { "provider": "openai", "model": "gpt-4o", "temperature": 0.3 },
  "assignedChannelIds": ["660def..."],
  "skills": ["ticketing", "knowledge-base"]
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Agent created successfully",
  "data": {
    "_id": "660a12...",
    "name": "Support Bot",
    "description": "Handles customer support inquiries...",
    "isActive": true,
    "isEnabled": false,
    "assignedChannelIds": ["660def..."],
    "skills": ["ticketing", "knowledge-base"],
    "aiInstructions": [ ... ],
    "llmConfig": { ... },
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

> ⬇️ Save `data._id` as `agentId`.

---

### `GET /agents`

**What it does:** Lists all agents for your organization.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": [
    /* array of agent objects */
  ]
}
```

---

### `GET /agents/:agentId`

**What it does:** Gets full details of a single agent.

**Request:** None  
**Response:** Full agent document.

---

### `PATCH /agents/:agentId`

**What it does:** Updates agent properties (name, description, instructions, LLM config, etc.).

**Request Body:**

```json
{ "name": "Support Bot v2", "llmConfig": { "temperature": 0.5 } }
```

**Response:**

```json
{
  "success": true,
  "message": "Agent updated successfully",
  "data": {
    /* updated agent */
  }
}
```

---

### `DELETE /agents/:agentId`

**What it does:** Permanently deletes an agent.

**Request:** None  
**Response:**

```json
{ "success": true, "message": "Agent deleted successfully", "data": null }
```

---

### `POST /agents/:agentId/clone`

**What it does:** Creates a copy of the agent with a new name.

**Request Body:**

```json
{ "name": "Support Bot v2" }
```

**Response (201):**

```json
{
  "success": true,
  "message": "Agent cloned successfully",
  "data": {
    /* new cloned agent */
  }
}
```

---

### `POST /agents/:agentId/toggle`

**What it does:** Enables or disables the agent. Disabled agents do not process messages or execute actions.

**Request Body:**

```json
{ "isEnabled": true }
```

**Response:**

```json
{
  "success": true,
  "message": "Agent enabled successfully",
  "data": {
    /* agent with isEnabled: true */
  }
}
```

> **Flow:** Toggle ON only after assigning channels and skills.

---

### `POST /agents/:agentId/channels`

**What it does:** Assigns one or more Slack channels to the agent. The agent will monitor these channels for messages.

**Request Body:**

```json
{ "channelIds": ["660def...", "660fed..."] }
```

**Response:**

```json
{
  "success": true,
  "message": "Channels assigned to agent",
  "data": {
    /* updated agent */
  }
}
```

> **Flow:** Do this BEFORE enabling the agent and BEFORE expecting automatic ticket creation.

---

### `PATCH /agents/:agentId/skills`

**What it does:** Sets the list of skills the agent can use. Skills are registered capabilities (ticketing, knowledge-search, CRM integration, etc.).

**Request Body:**

```json
{ "skills": ["ticketing", "knowledge-base", "crm"] }
```

**Response:**

```json
{
  "success": true,
  "message": "Agent skills updated",
  "data": {
    /* updated agent */
  }
}
```

---

### `PATCH /agents/:agentId/permissions`

**What it does:** Sets granular permissions for what the agent is allowed to do (create tickets, resolve tickets, send messages, etc.).

**Request Body:**

```json
{ "permissions": { "canCreateTickets": true, "canResolveTickets": false, "canSendMessages": true } }
```

**Response:**

```json
{
  "success": true,
  "message": "Agent permissions updated",
  "data": {
    /* updated agent */
  }
}
```

---

## 5. Tickets

Tickets are the core support entity. They represent a customer issue from creation through resolution.

---

### `POST /tickets`

**What it does:** Creates a new support ticket.

**Request Body:**

```json
{
  "title": "Login issue on production",
  "description": "User cannot log in after password reset",
  "priority": "high",
  "category": "authentication",
  "tags": ["urgent", "login"],
  "channelId": "660def...",
  "source": "slack",
  "senderSlackUserId": "U12345"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Ticket created successfully",
  "data": {
    "_id": "660b12...",
    "title": "Login issue on production",
    "description": "User cannot log in after password reset",
    "status": "open",
    "priority": "high",
    "category": "authentication",
    "tags": ["urgent", "login"],
    "createdAt": "2025-01-15T12:00:00.000Z",
    "createdById": "660user...",
    "commentCount": 0
  }
}
```

> ⬇️ Save `data._id` as `ticketId`.

---

### `GET /tickets`

**What it does:** Lists tickets with optional filters.

**Query Parameters:** `status`, `priority`, `category`, `assignedToId`, `tags` (any combination)  
**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "660b12...",
      "title": "Login issue on production",
      "status": "open",
      "priority": "high",
      "assignedTo": { "id": "660user...", "name": "Jane" },
      "commentCount": 3,
      "createdAt": "2025-01-15T12:00:00.000Z"
    }
  ]
}
```

---

### `GET /tickets/search?q=keyword`

**What it does:** Full-text search across ticket titles, descriptions, and tags.

**Query:** `q` — search term  
**Response:**

```json
{
  "success": true,
  "data": [
    /* matching tickets */
  ]
}
```

---

### `GET /tickets/:ticketId`

**What it does:** Gets full ticket details with comments, attachments, and timeline.

**Request:** None  
**Response:** Complete ticket document.

---

### `PATCH /tickets/:ticketId`

**What it does:** Updates ticket fields (title, description, priority, tags, etc.).

**Request Body:** Any subset of ticket fields

```json
{ "title": "Updated title", "priority": "critical", "tags": ["urgent", "security"] }
```

**Response:**

```json
{
  "success": true,
  "message": "Ticket updated successfully",
  "data": {
    /* updated ticket */
  }
}
```

---

### `POST /tickets/:ticketId/close`

**What it does:** Sets ticket status to `closed` and records `closedAt` timestamp.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Ticket closed",
  "data": {
    /* ticket with status: 'closed' */
  }
}
```

> **Flow:** Close AFTER classifying, assigning, and resolving the issue.

---

### `POST /tickets/:ticketId/reopen`

**What it does:** Reopens a closed ticket (status becomes `reopened`).

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Ticket reopened",
  "data": {
    /* ticket with status: 'reopened' */
  }
}
```

---

### `POST /tickets/:ticketId/assign`

**What it does:** Assigns the ticket to a user or agent.

**Request Body:**

```json
{ "assigneeId": "660user...", "assigneeType": "user" }
```

**Response:**

```json
{
  "success": true,
  "message": "Ticket assigned",
  "data": { "assignedToId": "660user...", "status": "in_progress" }
}
```

> **Flow:** Do this AFTER creating the ticket and optionally AFTER running classification to know who to assign to.

---

### `POST /tickets/:ticketId/unassign`

**What it does:** Removes the current assignment. Ticket goes back to unassigned status.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Ticket unassigned",
  "data": {
    /* ticket with no assignee */
  }
}
```

---

### `POST /tickets/:ticketId/transfer`

**What it does:** Transfers the ticket from one user to another.

**Request Body:**

```json
{ "fromUserId": "660user1...", "toUserId": "660user2..." }
```

**Response:**

```json
{
  "success": true,
  "message": "Ticket transferred",
  "data": {
    /* ticket with new assignee */
  }
}
```

---

### `POST /tickets/:ticketId/merge`

**What it does:** Merges one or more source tickets into this target ticket. Source tickets are marked as merged and their content is appended to the target.

**Request Body:**

```json
{ "sourceTicketIds": ["660b21...", "660b22..."] }
```

**Response:**

```json
{
  "success": true,
  "message": "Tickets merged",
  "data": {
    "mergedTicketIds": ["660b21...", "660b22..."],
    "targetTicketId": "660b12...",
    "status": "open"
  }
}
```

---

### `POST /tickets/:ticketId/split`

**What it does:** Splits a ticket into multiple new tickets with specified titles.

**Request Body:**

```json
{ "titles": ["Database connection error", "UI timeout issue"] }
```

**Response (201):**

```json
{
  "success": true,
  "message": "Tickets split",
  "data": [
    { "_id": "660b31...", "title": "Database connection error", "splitFromId": "660b12..." },
    { "_id": "660b32...", "title": "UI timeout issue", "splitFromId": "660b12..." }
  ]
}
```

---

### `POST /tickets/:ticketId/comments`

**What it does:** Adds an internal or public comment to the ticket.

**Request Body:**

```json
{ "body": "We're investigating the root cause now.", "isInternal": false }
```

**Response (201):**

```json
{
  "success": true,
  "message": "Comment added",
  "data": {
    "_id": "660c01...",
    "ticketId": "660b12...",
    "authorId": "660user...",
    "body": "We're investigating the root cause now.",
    "isInternal": false,
    "createdAt": "2025-01-15T13:00:00.000Z"
  }
}
```

---

### `POST /tickets/:ticketId/attachments`

**What it does:** Attaches a file reference to the ticket.

**Request Body:**

```json
{
  "fileName": "error_log.txt",
  "fileType": "text/plain",
  "fileUrl": "https://cdn.example.com/error_log.txt",
  "fileSize": 2048
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Attachment added",
  "data": {
    /* attachment object */
  }
}
```

---

### `GET /tickets/:ticketId/timeline`

**What it does:** Returns the activity timeline — status changes, assignments, comments, and system actions with timestamps.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": [
    /* array of timeline entries */
  ]
}
```

---

### `GET /tickets/:ticketId/history`

**What it does:** Returns the complete audit trail for the ticket — every change made, by whom, and when.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": [
    /* array of audit log entries */
  ]
}
```

---

### `POST /tickets/:ticketId/watch`

**What it does:** Adds the current user as a watcher. Watchers receive notifications on all activity.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Now watching ticket",
  "data": {
    /* ticket with watchers updated */
  }
}
```

---

### `POST /tickets/:ticketId/follow`

**What it does:** Adds the current user as a follower (receives notifications on major updates only).

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Now following ticket",
  "data": {
    /* ticket with followers updated */
  }
}
```

---

## 6. Threads

Threads link Slack conversation threads to tickets for context preservation.

---

### `GET /tickets/:ticketId/thread`

**What it does:** Gets the Slack thread that is linked to this ticket.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "660d01...",
    "threadTs": "1710500000.000001",
    "channelId": "660def...",
    "messageCount": 15,
    "participants": ["U12345", "U67890"],
    "linkedTicketId": "660b12..."
  }
}
```

---

### `POST /threads/:threadId/link`

**What it does:** Links a Slack thread to a ticket. After linking, the thread context is available when viewing the ticket.

**Request Body:**

```json
{ "ticketId": "660b12..." }
```

**Response:**

```json
{
  "success": true,
  "message": "Thread linked to ticket",
  "data": { "threadId": "660d01...", "ticketId": "660b12..." }
}
```

---

### `GET /threads/:threadId`

**What it does:** Fetches all messages in the Slack thread directly from the Slack API.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": [
    /* array of Slack message objects */
  ]
}
```

---

### `POST /threads/:threadId/sync`

**What it does:** Fetches thread messages from Slack and stores them in the local database.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Thread synced",
  "data": {
    /* thread with updated messages */
  }
}
```

---

### `POST /threads/:threadId/summary`

**What it does:** Uses AI to generate a concise summary of the entire thread conversation, including key points and action items.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": {
    "summary": "The discussion involved troubleshooting a login issue where users were getting session expired errors after password reset. The root cause was identified as a stale session cookie.",
    "keyPoints": [
      "Root cause: stale session cookie",
      "Fix: clear cookie on password reset",
      "Deployed to staging"
    ],
    "actionItems": ["Monitor deployment for regressions", "Notify affected users via email"]
  }
}
```

---

## 7. Classification

AI-powered classification service. Analyzes text to determine intent, category, priority, sentiment, and more.

---

### `POST /classify/tickets/:ticketId`

**What it does:** Runs full AI classification on the ticket — determines intent, category, priority, sentiment, and urgency level.

**Request Body:**

```json
{ "text": "I cannot log in after changing my password" }
```

**Response:**

```json
{
  "success": true,
  "data": {
    "intent": "authentication_issue",
    "category": "login",
    "priority": "high",
    "sentiment": "frustrated",
    "urgency": "high",
    "confidence": 0.92
  }
}
```

> **Flow:** Run this AFTER creating a ticket, BEFORE assigning it (so you know who to assign to).

---

### `POST /classify/intent`

**What it does:** Detects the user's intent from a piece of text.

**Request Body:**

```json
{ "text": "How do I reset my password?" }
```

**Response:**

```json
{ "success": true, "data": { "intent": "password_reset", "confidence": 0.95 } }
```

---

### `POST /classify/category`

**What it does:** Predicts the most appropriate category for a support request.

**Request Body:**

```json
{ "text": "My payment didn't go through" }
```

**Response:**

```json
{ "success": true, "data": { "category": "billing", "confidence": 0.88 } }
```

---

### `POST /classify/priority`

**What it does:** Predicts the priority level of a ticket based on the description text.

**Request Body:**

```json
{ "text": "Production is down, all users are affected!" }
```

**Response:**

```json
{ "success": true, "data": { "priority": "critical", "confidence": 0.97 } }
```

---

### `POST /classify/sentiment`

**What it does:** Analyzes the sentiment (positive/negative/neutral) and intensity of the text.

**Request Body:**

```json
{ "text": "I'm very frustrated with this issue, it's been happening for days" }
```

**Response:**

```json
{ "success": true, "data": { "sentiment": "negative", "score": 0.85 } }
```

---

### `POST /classify/duplicate`

**What it does:** Checks if a given text is a duplicate of one or more existing tickets.

**Request Body:**

```json
{ "text": "Unable to login after password reset", "existingTicketIds": ["660b21...", "660b22..."] }
```

**Response:**

```json
{
  "success": true,
  "data": { "isDuplicate": true, "duplicateOfId": "660b21...", "similarityScore": 0.93 }
}
```

---

### `GET /classify/tickets/:ticketId/similar?limit=5`

**What it does:** Finds tickets similar to this one using vector embedding similarity.

**Query:** `limit` (default 5)  
**Response:**

```json
{
  "success": true,
  "data": [
    { "_id": "660b21...", "title": "Login failure", "similarity": 0.91 },
    { "_id": "660b22...", "title": "Password reset issue", "similarity": 0.87 }
  ]
}
```

---

### `POST /classify/suggest-assignee`

**What it does:** Suggests the best person to assign the ticket to based on skills, workload, and category match.

**Request Body:**

```json
{ "text": "Database connection timeout in production", "category": "infrastructure" }
```

**Response:**

```json
{
  "success": true,
  "data": {
    "suggestedAssigneeId": "660user...",
    "name": "Jane Doe",
    "reason": "Skill match: Database administration, current load: 3 tickets"
  }
}
```

---

### `POST /classify/suggest-response`

**What it does:** Generates an AI-suggested response to a ticket.

**Request Body:**

```json
{ "ticketId": "660b12...", "context": "User reported login issue after password reset" }
```

**Response:**

```json
{
  "success": true,
  "data": {
    "suggestedResponse": "Hi there, I'm sorry you're experiencing trouble logging in. Let me help you resolve this...",
    "confidence": 0.84
  }
}
```

---

## 8. Workflows

Workflows define multi-step automated sequences with conditional branching and optional human approval steps.

---

### `POST /workflows`

**What it does:** Creates a new automated workflow definition with triggers, conditions, and steps.

**Request Body:**

```json
{
  "name": "Critical Escalation Workflow",
  "description": "Escalate critical priority tickets to on-call engineer and notify manager",
  "trigger": "ticket.priority_changed",
  "conditions": [{ "field": "priority", "operator": "equals", "value": "critical" }],
  "steps": [
    {
      "type": "notification",
      "name": "Notify on-call",
      "config": { "channelType": "slack", "template": "escalation_alert" }
    },
    {
      "type": "approval",
      "name": "Manager approval",
      "config": { "approverRole": "manager", "timeoutMinutes": 60 }
    },
    {
      "type": "action",
      "name": "Assign to senior engineer",
      "config": { "assignToTeam": "senior-engineering" }
    }
  ]
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Workflow created",
  "data": {
    "_id": "660e01...",
    "name": "Critical Escalation Workflow",
    "trigger": "ticket.priority_changed",
    "status": "draft",
    "version": 1,
    "conditions": [ ... ],
    "steps": [ ... ],
    "createdAt": "2025-01-15T14:00:00.000Z"
  }
}
```

---

### `POST /workflows/:workflowId/execute`

**What it does:** Triggers the workflow with input data. Returns an execution ID that can be used to track progress.

**Request Body:**

```json
{
  "input": { "ticketId": "660b12...", "priority": "critical", "assignedTo": "660user..." }
}
```

**Response (202):**

```json
{
  "success": true,
  "message": "Workflow execution started",
  "data": {
    "executionId": "660e02...",
    "workflowId": "660e01...",
    "status": "running",
    "startedAt": "2025-01-15T14:00:00.000Z"
  }
}
```

---

### `GET /workflows/executions/:executionId/logs`

**What it does:** Gets detailed step-by-step logs for a workflow execution, including each step's status and duration.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": [
    {
      "stepName": "Notify on-call",
      "type": "notification",
      "status": "completed",
      "duration": 1200,
      "timestamp": "..."
    },
    { "stepName": "Manager approval", "type": "approval", "status": "pending", "duration": null }
  ]
}
```

---

### `POST /workflows/executions/approve`

**What it does:** Approves a human-in-the-loop workflow step, allowing the execution to proceed.

**Request Body:**

```json
{
  "executionId": "660e02...",
  "stepId": "step-2",
  "approvedBy": "660user...",
  "reason": "Escalation approved"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Step approved",
  "data": { "stepName": "Manager approval", "status": "completed" }
}
```

---

## 9. Skills

Skills are pluggable capabilities (ticketing, HR, CRM, Jira integration, etc.) that can be attached to agents.

---

### `POST /skills`

**What it does:** Registers a new skill. Skills define what capabilities agents can use.

**Request Body:**

```json
{
  "name": "Jira Integration",
  "description": "Create and update Jira issues from Slack",
  "type": "integration",
  "version": "1.0.0",
  "configuration": { "jiraUrl": "https://acme.atlassian.net", "projectKey": "SUP" },
  "entryPoint": "jira.createIssue"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Skill registered",
  "data": { "_id": "660f01...", "name": "Jira Integration", "isEnabled": false, "version": "1.0.0" }
}
```

---

### `POST /skills/:skillId/toggle`

**What it does:** Enables or disables a skill.

**Request Body:**

```json
{ "isEnabled": true }
```

**Response:**

```json
{
  "success": true,
  "message": "Skill enabled",
  "data": {
    /* skill with isEnabled: true */
  }
}
```

---

### `PATCH /skills/:skillId/config`

**What it does:** Updates the skill's configuration (e.g., change Jira URL).

**Request Body:**

```json
{ "configuration": { "jiraUrl": "https://acme-new.atlassian.net" } }
```

**Response:**

```json
{
  "success": true,
  "message": "Skill configured",
  "data": {
    /* skill with new config */
  }
}
```

---

### `POST /skills/:skillId/execute`

**What it does:** Executes the skill with input data and context.

**Request Body:**

```json
{
  "input": { "summary": "Login issue", "description": "Users cannot log in", "priority": "high" },
  "context": { "channelId": "C12345", "userId": "U67890" }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "result": "Jira issue SUP-123 created",
    "output": { "issueKey": "SUP-123", "issueUrl": "https://..." }
  }
}
```

---

## 10. SLA

Define Service Level Agreement policies with response and resolution time targets.

---

### `POST /sla-policies`

**What it does:** Creates a new SLA policy with response/resolution time targets, breach notification, and escalation settings.

**Request Body:**

```json
{
  "name": "Critical SLA",
  "description": "Response within 15 min, resolution within 1 hour",
  "priority": "critical",
  "responseTimeMinutes": 15,
  "resolutionTimeMinutes": 60,
  "businessHoursOnly": true,
  "notifyOnBreach": true,
  "escalateAfterBreach": true
}
```

**Response (201):**

```json
{ "success": true, "message": "SLA policy created", "data": { "_id": "660g01...", "name": "Critical SLA", ... } }
```

---

### `GET /sla-policies`

**What it does:** Lists all SLA policies.

---

### `GET /sla-policies/:slaId`

**What it does:** Gets details of a specific SLA policy.

---

### `PATCH /sla-policies/:slaId`

**What it does:** Updates an SLA policy.

---

### `DELETE /sla-policies/:slaId`

**What it does:** Deletes an SLA policy.

---

## 11. Escalations

Define multi-level escalation rules with timeouts.

---

### `POST /escalations`

**What it does:** Creates an escalation rule with multiple levels, each with assignee and timeout.

**Request Body:**

```json
{
  "name": "SLA Breach Escalation",
  "trigger": "sla.breach",
  "levels": [
    { "level": 1, "name": "Team Lead", "assignedToType": "user", "timeoutMinutes": 30 },
    { "level": 2, "name": "Manager", "assignedToType": "user", "timeoutMinutes": 60 }
  ],
  "notifyOnEscalate": true
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Escalation rule created",
  "data": {
    /* escalation document */
  }
}
```

---

### `POST /escalations/:escalationId/trigger`

**What it does:** Manually triggers the escalation for a specific ticket.

**Request Body:**

```json
{ "ticketId": "660b12..." }
```

**Response (202):**

```json
{
  "success": true,
  "message": "Escalation triggered",
  "data": {
    "escalationId": "660f01...",
    "ticketId": "660b12...",
    "currentLevel": 1,
    "status": "active"
  }
}
```

---

## 12. Routing

Define ticket routing rules with load balancing and skill-based assignment.

---

### `POST /routing/rules`

**What it does:** Creates a routing rule that determines how tickets are assigned.

**Request Body:**

```json
{
  "name": "Billing -> Billing Team",
  "priority": 1,
  "conditions": { "category": "billing" },
  "targetType": "team",
  "targetId": "660team...",
  "loadBalancingStrategy": "round_robin",
  "order": 1
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Routing rule created",
  "data": {
    /* rule document */
  }
}
```

---

### `POST /routing/route-ticket`

**What it does:** Manually runs the routing engine on a ticket. Evaluates all rules and assigns the ticket to the best match.

**Request Body:**

```json
{ "ticketId": "660b12..." }
```

**Response:**

```json
{
  "success": true,
  "message": "Ticket routed",
  "data": {
    "assignedToId": "660user...",
    "assignedTeamId": "660team...",
    "ruleMatched": "Billing -> Billing Team",
    "routingMethod": "skill_based"
  }
}
```

> **Flow:** Run this AFTER classification (so category is known) and BEFORE manual assignment if desired.

---

## 13. Knowledge

Upload, index, and search knowledge documents from various sources (PDF, URL, Notion, Google Drive, Confluence).

---

### `POST /knowledge`

**What it does:** Uploads a knowledge document. The document is stored and queued for indexing.

**Request Body:**

```json
{
  "name": "Product FAQ",
  "description": "Frequently asked questions about our product",
  "sourceType": "pdf",
  "fileUrl": "https://cdn.example.com/faq.pdf",
  "tags": ["faq", "product"]
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Knowledge uploaded",
  "data": { "_id": "660h01...", "name": "Product FAQ", "indexStatus": "pending" }
}
```

---

### `POST /knowledge/:knowledgeId/index`

**What it does:** Starts vector indexing. The document is chunked and embeddings are generated for semantic search.

**Request:** None  
**Response (202):**

```json
{ "success": true, "message": "Indexing started", "data": { "indexStatus": "indexing" } }
```

> **Flow:** Upload → Index → THEN search. Until indexed, the document won't appear in search results.

---

### `POST /knowledge/:knowledgeId/refresh`

**What it does:** Re-indexes an already-indexed knowledge document (e.g., after the source was updated).

**Request:** None  
**Response (202):**

```json
{ "success": true, "message": "Refresh started", "data": { "indexStatus": "indexing" } }
```

---

### `GET /knowledge/search?q=keyword&limit=10`

**What it does:** Semantic search across indexed knowledge. Returns the most relevant chunks sorted by relevance.

**Query:** `q` — search query, `limit` — results count (default 10)  
**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "660h01...",
      "name": "Product FAQ",
      "sourceType": "pdf",
      "relevanceScore": 0.92,
      "snippet": "How to reset your password: Go to Settings > Security..."
    }
  ]
}
```

---

### `DELETE /knowledge/:knowledgeId`

**What it does:** Deletes a knowledge entry and its associated vector embeddings.

**Request:** None  
**Response:**

```json
{ "success": true, "message": "Knowledge deleted", "data": null }
```

---

## 14. Events

Events are Slack webhook payloads (messages, mentions, reactions, file shares). The ingest endpoint is called by Slack.

---

### `POST /events/ingest`

**What it does:** **Public endpoint** — called by Slack's Event Subscriptions. Ingests any Slack event type (message, app_mention, reaction_added, etc.). Events are queued for async processing.

**Request Body:** Slack event payload (varies by type)  
**Response (202):**

```json
{
  "success": true,
  "message": "Accepted",
  "data": { "eventId": "660i01...", "eventType": "message.channels", "status": "pending" }
}
```

> **Note:** This is the only public endpoint (no auth required). Slack signs requests with a shared secret, which is verified internally.

---

### `POST /events/:eventId/replay`

**What it does:** Re-queues a failed event for processing.

**Request:** None  
**Response (202):**

```json
{ "success": true, "message": "Event queued for replay", "data": { "eventId": "660i01..." } }
```

---

## 15. Analytics

Aggregated metrics for tickets, SLA compliance, costs, and system performance.

---

### `GET /analytics/tickets?startDate=2025-01-01&endDate=2025-01-31&groupBy=day`

**What it does:** Returns ticket volume analytics — created, resolved, and breakdown by status over time.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalCreated": 150,
    "totalResolved": 120,
    "avgResolutionTimeHours": 4.5,
    "byStatus": { "open": 30, "in_progress": 15, "closed": 105 },
    "trend": [
      { "date": "2025-01-01", "created": 12, "resolved": 10 },
      { "date": "2025-01-02", "created": 15, "resolved": 14 }
    ]
  }
}
```

---

### `GET /analytics/sla?startDate=...&endDate=...`

**What it does:** Returns SLA compliance metrics — response time compliance %, resolution compliance %, breached count, average times.

**Response:**

```json
{
  "success": true,
  "data": {
    "responseCompliance": 94.5,
    "resolutionCompliance": 89.2,
    "breachedCount": 8,
    "avgResponseTimeMinutes": 12,
    "avgResolutionTimeMinutes": 95
  }
}
```

---

### `GET /analytics/costs`

**What it does:** Returns cost analytics — LLM token usage by model, API call costs, per-agent cost breakdown.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalCost": 152.4,
    "byModel": { "gpt-4o": 120.0, "gpt-3.5": 32.4 },
    "byAgent": { "Support Bot": 85.0 }
  }
}
```

---

### `GET /analytics/latency`

**What it does:** Returns system latency metrics — LLM response time, API response time, P95/P99 latencies.

**Response:**

```json
{
  "success": true,
  "data": { "avgLlmLatencyMs": 850, "avgApiLatencyMs": 120, "p95LlmLatencyMs": 2100 }
}
```

---

## 16. Dashboard

Aggregated views for different personas.

---

### `GET /dashboard/executive`

**What it does:** High-level executive metrics (ticket volume trends, SLA compliance, team performance summary).

### `GET /dashboard/team`

**What it does:** Team-level metrics and performance breakdown.

### `GET /dashboard/agent`

**What it does:** Per-agent performance dashboard.

### `GET /dashboard/tickets`

**What it does:** Real-time ticket status distribution dashboard.

### `GET /dashboard/live?workspaceId=...`

**What it does:** Live monitoring dashboard showing active conversations, real-time events, and current agent status.

**Response:**

```json
{
  "success": true,
  "data": {
    "activeConversations": 12,
    "agentsOnline": 3,
    "ticketsCreatedToday": 24,
    "latestEvents": [
      /* recent events */
    ]
  }
}
```

---

## 17. Audit Logs

Immutable audit trail for all actions, AI decisions, and approvals.

---

### `GET /audit-logs?action=ticket.created&resourceType=ticket&limit=50`

**What it does:** Lists audit log entries. Filterable by action, resource type, and resource ID.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "660j01...",
      "actorId": "660user...",
      "actorType": "user",
      "action": "ticket.created",
      "resourceType": "ticket",
      "resourceId": "660b12...",
      "timestamp": "2025-01-15T12:00:00.000Z",
      "metadata": { "title": "Login issue" }
    }
  ]
}
```

---

### `GET /audit-logs/ai-decisions`

**What it does:** Returns a filtered view of AI-made decisions (classifications, suggestions, automated assignments).

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "actorType": "ai",
      "action": "classification.intent",
      "resourceType": "ticket",
      "resourceId": "660b12...",
      "changes": { "intent": "authentication_issue", "confidence": 0.92 }
    }
  ]
}
```

---

### `GET /audit-logs/approvals`

**What it does:** Returns a filtered view of human approvals in workflows.

---

## 18. Notifications

Send and track notifications across Slack, email, and webhook channels.

---

### `POST /notifications/send`

**What it does:** Sends a notification via the specified channel (Slack DM, email, webhook).

**Request Body:**

```json
{
  "channelType": "slack",
  "recipientId": "U12345",
  "recipientType": "user",
  "title": "Ticket Assigned",
  "body": "Ticket #123 has been assigned to you.",
  "templateId": "ticket_assigned",
  "templateData": { "ticketNumber": "123", "ticketTitle": "Login issue" }
}
```

**Response (202):**

```json
{
  "success": true,
  "message": "Notification queued",
  "data": { "_id": "660k01...", "status": "pending" }
}
```

---

### `POST /notifications/:notificationId/read`

**What it does:** Marks a notification as read by the recipient.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    /* updated notification */
  }
}
```

---

## 19. Search

Global full-text and filtered search across all resource types.

---

### `GET /search?q=login+issue&types=ticket,knowledge,user&limit=20`

**What it does:** Global search — queries across tickets, knowledge, users, channels, and conversations simultaneously.

**Query:** `q` (search term), `types` (comma-separated resource types), `limit`, `offset`  
**Response:**

```json
{
  "success": true,
  "data": {
    "tickets": [
      /* matching tickets */
    ],
    "knowledge": [
      /* matching knowledge */
    ],
    "users": [
      /* matching users */
    ],
    "totalResults": 42
  }
}
```

---

### `GET /search/tickets?q=keyword&status=open`

**What it does:** Searches tickets with filters.

---

### `GET /search/knowledge?q=keyword`

**What it does:** Searches the knowledge base.

---

## 20. Admin

Manage organizational entities — departments, teams, categories, tags, business hours, holidays.

---

### `POST /admin/departments`

**What it does:** Creates a department in the organizational hierarchy.

**Request Body:**

```json
{
  "name": "Engineering",
  "description": "Software engineering department",
  "headUserId": "660user..."
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Department created",
  "data": {
    /* department document */
  }
}
```

---

### `POST /admin/teams`

**What it does:** Creates a team within a department.

**Request Body:**

```json
{
  "name": "Platform Team",
  "description": "Core platform engineering",
  "departmentId": "660dept...",
  "leadUserId": "660user...",
  "skills": ["node.js", "devops"]
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Team created",
  "data": {
    /* team document */
  }
}
```

---

### `POST /admin/categories`

**What it does:** Creates a ticket category with optional sub-categories.

**Request Body:**

```json
{
  "name": "Billing",
  "description": "Billing and payment issues",
  "subCategories": ["Invoice", "Payment", "Refund"]
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Category created",
  "data": {
    /* category document */
  }
}
```

---

### `POST /admin/tags`

**What it does:** Creates a tag with a color for visual identification.

**Request Body:**

```json
{
  "name": "urgent",
  "color": "#FF0000",
  "description": "Urgent issues requiring immediate attention"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Tag created",
  "data": {
    /* tag document */
  }
}
```

---

### `POST /admin/business-hours`

**What it does:** Defines business hours used for SLA timer calculations (only count time during business hours).

**Request Body:**

```json
{
  "name": "US East Hours",
  "timezone": "America/New_York",
  "days": {
    "monday": [{ "start": "09:00", "end": "17:00" }],
    "tuesday": [{ "start": "09:00", "end": "17:00" }],
    "wednesday": [{ "start": "09:00", "end": "17:00" }],
    "thursday": [{ "start": "09:00", "end": "17:00" }],
    "friday": [{ "start": "09:00", "end": "17:00" }],
    "saturday": [],
    "sunday": []
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Business hours created",
  "data": {
    /* business hours document */
  }
}
```

---

### `POST /admin/holidays`

**What it does:** Defines a holiday that excludes SLA timer counting.

**Request Body:**

```json
{ "name": "New Year's Day", "date": "2025-01-01", "recurrence": "yearly" }
```

**Response (201):**

```json
{
  "success": true,
  "message": "Holiday created",
  "data": {
    /* holiday document */
  }
}
```

---

## 21. MCP (Model Context Protocol)

Register and communicate with external MCP servers to extend AI capabilities with custom tools.

---

### `POST /mcp/servers`

**What it does:** Registers an external MCP server connection.

**Request Body:**

```json
{
  "name": "Internal Tools",
  "serverUrl": "https://mcp.internal.acme.com",
  "serverType": "http",
  "apiKey": "sk-xxx",
  "authentication": { "type": "bearer" },
  "configuration": { "timeout": 30000 }
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "MCP server registered",
  "data": {
    "_id": "660l01...",
    "name": "Internal Tools",
    "isConnected": false,
    "healthStatus": "unknown"
  }
}
```

---

### `POST /mcp/servers/:connectionId/connect`

**What it does:** Connects to the MCP server and discovers available tools.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "message": "Connected to MCP server",
  "data": {
    "isConnected": true,
    "tools": [{ "name": "get_weather", "description": "Get weather for a city", "inputSchema": {} }]
  }
}
```

> **Flow:** Register → Connect → THEN list tools and execute them.

---

### `GET /mcp/servers/:connectionId/tools`

**What it does:** Lists all available tools on the connected MCP server with their input schemas.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": [
    {
      "name": "get_weather",
      "description": "Get weather for a city",
      "inputSchema": { "type": "object", "properties": { "city": { "type": "string" } } }
    }
  ]
}
```

---

### `POST /mcp/servers/:connectionId/execute`

**What it does:** Executes a tool on the MCP server with the provided arguments.

**Request Body:**

```json
{ "toolName": "get_weather", "arguments": { "city": "New York" } }
```

**Response:**

```json
{
  "success": true,
  "data": {
    "result": { "temperature": 22, "conditions": "Sunny", "city": "New York" },
    "executionTimeMs": 234
  }
}
```

---

### `GET /mcp/servers/:connectionId/health`

**What it does:** Checks the health status and latency of the MCP server connection.

**Request:** None  
**Response:**

```json
{
  "success": true,
  "data": {
    "healthStatus": "healthy",
    "lastHealthCheckAt": "2025-01-15T15:00:00.000Z",
    "latencyMs": 45
  }
}
```

---

## 22. Webhooks

Create outgoing webhooks with retry logic and dead-letter queues.

---

### `POST /webhooks`

**What it does:** Creates a new outgoing webhook that fires on specified events.

**Request Body:**

```json
{
  "name": "Ticket Notifier",
  "type": "outgoing",
  "url": "https://hooks.acme.com/tickets",
  "secret": "whsec_xxx",
  "events": ["ticket.created", "ticket.updated"],
  "headers": { "X-Custom": "value" },
  "retryConfig": { "maxRetries": 3, "backoffMs": 1000 }
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Webhook created",
  "data": { "_id": "660m01...", "name": "Ticket Notifier", "isActive": true }
}
```

---

### `POST /webhooks/:webhookId/trigger`

**What it does:** Manually triggers the webhook with a custom event and payload.

**Request Body:**

```json
{
  "event": "ticket.created",
  "payload": { "ticketId": "660b12...", "title": "Login issue", "status": "open" }
}
```

**Response (202):**

```json
{
  "success": true,
  "message": "Webhook triggered",
  "data": { "deliveryId": "660m02...", "status": "delivering" }
}
```

---

### `POST /webhooks/:webhookId/retry`

**What it does:** Retries a failed webhook delivery from the dead-letter queue.

**Request Body:**

```json
{ "entryId": "dead-letter-entry-id" }
```

**Response (202):**

```json
{ "success": true, "message": "Retry queued", "data": { "deliveryId": "660m03..." } }
```

---

### `GET /webhooks/:webhookId/dead-letter`

**What it does:** Gets all failed deliveries in the dead-letter queue.

**Response:**

```json
{
  "success": true,
  "data": [
    { "eventId": "evt_001", "payload": { ... }, "error": "HTTP 500", "failedAt": "2025-01-15T16:00:00.000Z", "retryCount": 3 }
  ]
}
```

---

## Status Codes

| Code    | When                                                                       |
| ------- | -------------------------------------------------------------------------- |
| **200** | Successful GET, PATCH, POST (read operations)                              |
| **201** | Resource created (POST — agents, tickets, skills, etc.)                    |
| **202** | Async operation accepted (workflow execute, knowledge index, event ingest) |
| **204** | Delete operations (when applicable)                                        |
| **400** | Validation error — missing or invalid request body fields                  |
| **401** | Missing or expired JWT token                                               |
| **403** | Insufficient permissions (e.g., admin routes without admin role)           |
| **404** | Resource not found (invalid ID)                                            |
| **409** | Conflict — duplicate resource or invalid state transition                  |
| **422** | Unprocessable entity — semantic validation failure                         |
| **429** | Rate limit exceeded                                                        |
| **500** | Internal server error                                                      |

---

_22 route groups · ~200 endpoints · Generated from `src/modules/slackAgent/presentation/routes/` and `src/modules/slackAgent/presentation/controllers/`_
