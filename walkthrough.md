# Walkthrough: Removal of Hardcoded Text/Sessions & Binding to Real Active User Data

All hardcoded mock data, preset dummy sessions, fake tickets, static activity feeds, and mock user profiles have been removed from OmniDesk Copilot. Every view across the platform now dynamically derives its information from active authenticated users and real Firestore collections.

## Summary of Changes

### 1. Authentication & User Profile
- **[AuthPage.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/AuthPage.jsx)**:
  - Removed "Skip sign-in — Launch Live Demo" button.
  - Removed offline mock user generation.
- **[AuthModal.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/components/AuthModal.jsx)**:
  - Removed "One-Click Offline Demo Agent" button.
  - Replaced dummy placeholder `"e.g. Jordan Torres"` with `"Enter full name"`.
- **[AppShell.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/components/AppShell.jsx)**:
  - Removed hardcoded static nav badges (`badge: 9`, `badge: 247`).
  - Nav badges for `Live Queue` and `Tickets` are now dynamically calculated from real tickets in Firestore.
  - Removed hardcoded mock notifications (`#2341 from TechFlow Inc.`, `Agent Jordan T. burnout risk`). Notifications are now dynamically derived from recent active tickets in Firestore, with an empty state when no notifications exist.
  - Removed `'Alex Kim'` and `'AK'` user avatar/name fallback in favor of `currentUser?.displayName || currentUser?.email`.

### 2. Live Workspace & Session Management
- **[client.js](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/api/client.js)**:
  - Deleted `DEFAULT_PRESET_SESSIONS` (`TK-8492 Alex Morgan`, `TK-8493 Jessica Taylor`, `TK-8494`, `TK-8495`).
  - `getInitialSessions()` now returns `{}` if empty and filters out any legacy mock session IDs.
  - Replaced hardcoded `Alex Kim`, `Maya Patel`, `Jordan Torres` micro-habits with a dynamic habit coach generator.
- **[App.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/App.jsx)**:
  - Removed automatic session creation on sign-in.
  - Removed hardcoded `'TK-8492'` fallback in `handleSendTurn`.
  - Replaced `'Support Specialist'` with the active user's name/email when persisting conversation records to Firestore.
- **[firebase.js](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/api/firebase.js)**:
  - Exported `getCurrentAuthUser()` for reliable synchronous access to the active authenticated profile.
  - Removed fallback to `'TK-8492'` in `saveConversationRecord`.

### 3. Dashboard
- **[Dashboard.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Dashboard.jsx)**:
  - Removed hardcoded `INITIAL_ACTIVITIES` and `TOP_AGENTS`.
  - Subscribed to `listenToConversations`, `listenToTickets`, and `listenToUsers`.
  - Live activity stream is derived in real time from Firestore conversations and tickets.
  - Top agents leaderboard is dynamically built from registered users and their conversation performance metrics.
  - KPI cards (Active Sessions, Team CSAT, Suggestions Generated, Escalations Prevented) are computed dynamically from real turns.
  - Added clean empty states when no activity or team members exist.

### 4. Tickets & Live Queue
- **[Tickets.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Tickets.jsx)**:
  - Removed `DEFAULT_TICKETS` (12 fake tickets).
  - New tickets created by the user automatically assign `agent` to the active signed-in user instead of `'Alex Kim'`.
  - Filtered out any legacy dummy names from local storage cache.
  - Displays a clean empty state with a "Create First Ticket" prompt when no tickets exist.
- **[LiveQueue.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/LiveQueue.jsx)**:
  - Removed hardcoded `queue` list.
  - Subscribes to `listenToTickets` and dynamically indexes items with status `open` or `pending`.

### 5. Customers & Team Management
- **[Customers.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Customers.jsx)**:
  - Removed hardcoded `customers` array.
  - Dynamically indexes customer profiles from actual Firestore tickets and conversations.
  - Shows an informative empty state when no customer interactions are recorded yet.
- **[TeamManagement.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/TeamManagement.jsx)**:
  - Removed fallback `teammates` array (`Alex Kim`, `Maya Patel`, etc.).
  - Displays the active signed-in user and real users registered in Firestore.

### 6. Analytics & Agent Performance & Reports
- **[Analytics.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Analytics.jsx)**:
  - Removed fake `chartData`, fake `summaryCards`, and fake `channelData`.
  - Subscribed to `listenToConversations` and `listenToTickets` to aggregate real CSAT, ticket volume, coaching usage, and channel distribution.
- **[AgentPerformance.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/AgentPerformance.jsx)**:
  - Removed hardcoded `agents` list.
  - Dynamically computes agent score rings, podium rankings, burnout risk, and CSAT from Firestore `users`, `conversations`, and `tickets`.
  - AI Micro-Habit Coach dynamically targets the selected agent's actual weakest metric based on turns evaluated.
- **[Reports.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Reports.jsx)**:
  - Removed static `PREVIEW_DATA`.
  - Generates executive summaries, CSAT audits, channel breakdowns, agent performance, and coaching tip logs directly from Firestore data.

### 7. Role-Based Access Control (RBAC) & Report Data Isolation
- **[Reports.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Reports.jsx)**:
  - **Individual Agent Scoping**: When an individual specialist (such as `Sweety`) opens the Reports view, report generation is strictly restricted to their own account. They only see their personal CSAT audits, tickets handled, individual resolution metrics, and personal AI coaching logs. Records belonging to other specialists and legacy mock sessions are completely excluded.
  - **Administrator View**: Administrators (e.g. `superadmin@gmail.com`, `gupta.anshu68637ag@gmail.com`, or accounts with `admin`/`supervisor` roles) have full visibility across all specialists in the organization, complete with an **Agent Filter** dropdown to inspect any specific team member's audit or view organization-wide metrics.
  - **Visual Role Indicators**: Replaced ambiguous headings with role-specific badges (`👤 Personal Report (<Agent Name>)` for specialists vs `👑 Administrator View (Organization Wide)` for administrators).
  - **Date Windowing**: Connected date range chips (`Last 7 days`, `Last 30 days`, `Last 90 days`, `This month`, `Last month`, `All Time`) to dynamically filter records based on timestamps.
- **[Dashboard.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Dashboard.jsx)**:
  - Scoped the Recent Activity feed so standard specialists only see interactions and tickets belonging to their own account, maintaining full privacy.

### 8. Role-Based Customization in Settings & Reports
- **[Settings.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Settings.jsx)**:
  - **Removed Role Selection for Normal Users**: Normal agents no longer have an interactive `<select>` dropdown to change their role. Instead, their assigned role is displayed cleanly in a read-only badge box (`Tier-1 Support Specialist · Assigned Role`) with an informative subtitle explaining that roles and permissions are managed centrally by the organization administrator. Role selection dropdown is available exclusively to Administrators.
  - **Removed "In-Flight Alerts" for Normal Users**: The `In-Flight Alerts` tab is removed from the settings sidebar for standard agents. Only Administrators and Supervisors have access to the `In-Flight Alerts` configuration tab.
  - **Role Tampering Guard**: `handleSaveProfile` ensures that normal users cannot tamper with or escalate their role in storage or Firestore.
- **[Reports.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Reports.jsx)**:
  - **Tailored Report Types for Normal Users**: Normal agents only see reports relevant to their own individual interactions: **CSAT Report** (personal satisfaction audit) and **Coaching Report** (personal AI coaching feedback and guidance). Team-wide reports (**Volume Report** and **Performance Report**) are hidden from normal agents.
  - **Full Operational Telemetry for Supervisors & Admins**: Supervisors and Administrators have access to all 4 reports (**CSAT**, **Volume**, **Performance**, **Coaching**), plus the **Agent Filter** dropdown and role-specific badges (`👑 Administrator View` / `🛡️ Supervisor Team View`).
- **[firebase.js](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/api/firebase.js)**:
  - Cleanly distinguished `Administrator`, `Supervisor`, and `Tier-1 Specialist` in `resolveUserRole` and `normalizeRole`.

### 9. Mock Customer Session Purge & Fresh Session Display
- **Robust Centralized Filter Helpers (`isMockCustomer` & `isMockTicketOrSession`)**:
  - Implemented bidirectional substring, whitespace-trimmed, and normalized matching in [firebase.js](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/api/firebase.js) to catch any variation of legacy mock names (`Sarah Mitchell`, `Alex Morgan`, `Jessica Taylor`, `Liam Vance`, `Elena Rostova`, etc.) and placeholder records (`Customer`, `null`, etc.).
  - Applied across [Customers.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Customers.jsx), [Tickets.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Tickets.jsx), [Reports.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Reports.jsx), [Dashboard.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Dashboard.jsx), [LiveQueue.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/LiveQueue.jsx), and [client.js](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/api/client.js).
- **Automated & Authenticated Firestore Purge**:
  - `purgeMockFirestoreRecords()` runs automatically on component mount and on authenticated user state changes, executing atomic deletions (`Promise.all`) across `conversations`, `carebot_tickets`, and `carebot_sessions`.
  - Added an interactive **Purge Mock Data** button in the [Customers.jsx](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/frontend/src/pages/Customers.jsx) toolbar to allow instant manual cleanup of both Firestore and local caches.
- **Server-Side Sanitation**:
  - Updated [server/app.py](file:///c:/Users/gupta/Desktop/Infy-vi/omniDesk-copilot/server/app.py) `is_mock_session` to prevent historical SQLite mock items from being loaded into memory or returned by `/api/sessions`.

## Verification
- Built frontend production bundle: `npm run build` completed with code 0 (`dist/index.html` bundled in 2.76s).
- Validated Python test suite: `python test_novel_features.py` passed all 4 smoke tests (Burnout Detector, Momentum Forecaster, Micro-Habit Coach, CLV Risk Scorer).
- Verified that only genuine active user sessions (`Anurag`, `anu`, `Aniket`) remain indexed.
