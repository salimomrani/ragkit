# Feature Specification: User Authentication (username/password)

**Feature Branch**: `008-user-auth`
**Created**: 2026-02-23
**Status**: Draft
**Input**: User description: "Ajouter l'authentification par username/password à l'application PALO RAG (backend FastAPI + frontend Angular 21). Inclure : login endpoint, JWT tokens, protection des routes API, et login page Angular."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Login (Priority: P1)

A user opens the application and is presented with a login form. They enter their username and password, submit the form, and gain access to the RAG assistant interface.

**Why this priority**: Without authentication, no other feature is accessible. This is the critical path for all users.

**Independent Test**: Can be fully tested by navigating to the app, submitting valid credentials, and verifying access to the chat interface.

**Acceptance Scenarios**:

1. **Given** a user with valid credentials, **When** they submit the login form, **Then** they are redirected to the main application and can interact with the RAG assistant.
2. **Given** a user with invalid credentials, **When** they submit the login form, **Then** an error message is displayed and they remain on the login page.
3. **Given** a user with empty fields, **When** they submit the login form, **Then** inline validation messages indicate the required fields.

---

### User Story 2 - Protected Routes (Priority: P2)

An unauthenticated user who tries to access any application page (chat, ingest, logs, eval) is automatically redirected to the login page.

**Why this priority**: Protects all existing features from unauthorized access. Essential for security.

**Independent Test**: Can be tested by directly navigating to `/chat` without being logged in and verifying a redirect to `/login`.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they navigate to any protected page, **Then** they are redirected to `/login`.
2. **Given** an authenticated user, **When** they navigate to any protected page, **Then** they access the page normally.
3. **Given** an authenticated user whose session has expired, **When** they make any action, **Then** they are redirected to `/login` with a session-expired message.

---

### User Story 3 - User Logout (Priority: P3)

An authenticated user can log out of the application, which clears their session and redirects them to the login page.

**Why this priority**: Required for security and multi-user environments (shared machines).

**Independent Test**: Can be tested by clicking the logout button and verifying the user is redirected to login and cannot access protected pages.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they click logout, **Then** they are redirected to `/login` and their session is invalidated.
2. **Given** a logged-out user, **When** they press the browser back button, **Then** they are redirected to `/login` (session no longer valid).

---

### Edge Cases

- What happens when a user submits the form multiple times rapidly? → Only one request is processed; the button is disabled during submission.
- How does the system handle a JWT token that has been tampered with? → Token is rejected, user is redirected to login.
- What happens if the backend is unreachable during login? → A user-friendly error message is displayed ("Service unavailable, try again later").
- What happens with concurrent logins for the same user? → Both sessions are valid (stateless JWT); no conflict.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose a login endpoint accepting username and password credentials.
- **FR-002**: System MUST return a signed JWT access token upon successful authentication.
- **FR-003**: System MUST reject requests to all protected API endpoints that lack a valid JWT token (returns 401).
- **FR-004**: System MUST display a login page as the entry point when the user is not authenticated.
- **FR-005**: System MUST redirect unauthenticated users from any protected route to the login page.
- **FR-006**: System MUST display clear, user-friendly error messages for invalid credentials or expired sessions.
- **FR-007**: System MUST provide a logout action that clears the client-side token and invalidates the session context.
- **FR-008**: System MUST persist the authentication token across browser refreshes (local or session storage).
- **FR-009**: JWT tokens MUST have a defined expiration duration (default: 8 hours for this demo context).
- **FR-010**: System MUST support at least one pre-configured user account for demo purposes.

### Key Entities

- **User**: Represents an authenticated identity. Key attributes: `username` (unique), `hashed_password`, `is_active`.
- **JWT Token**: A signed token issued on login. Contains: `sub` (username), `exp` (expiration), issued by the backend.
- **Auth Session** (client-side): Ephemeral state holding the JWT token in the browser; cleared on logout or expiry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the login flow (enter credentials + access main page) in under 10 seconds.
- **SC-002**: 100% of protected pages redirect unauthenticated users to the login page.
- **SC-003**: Invalid login attempts are rejected with an error message within 2 seconds.
- **SC-004**: After logout, no protected page is accessible without re-authentication.
- **SC-005**: All existing application features remain functional for authenticated users (no regression).

## Assumptions

- A single admin user (or a small set of users) is sufficient for this demo — no user self-registration is required.
- User accounts are pre-seeded in the database or via environment variables (no admin UI needed).
- Token refresh (sliding expiry) is out of scope; users re-authenticate after token expiry.
- HTTPS is assumed in production; for local development, HTTP is acceptable.
- Role-based access control (RBAC) is out of scope — all authenticated users have equal access.

## Out of Scope

- User registration / self-service account creation.
- Password reset / forgot password flow.
- OAuth2 / SSO / third-party identity providers.
- Role-based permissions or access levels.
- Token refresh endpoint (refresh tokens).
- Account lockout after N failed attempts (nice-to-have, not required for demo).
