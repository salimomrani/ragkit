# Feature Specification: Response Feedback

**Feature Branch**: `011-response-feedback`
**Created**: 2026-03-02
**Status**: Draft
**Input**: User description: "Feedback utilisateur sur les réponses RAG : ajouter un mécanisme de rating par réponse (👍 / 👎 + commentaire optionnel) dans l'interface de chat. Le feedback est stocké en base de données et visible dans le tableau de logs existant (/logs). L'objectif est d'identifier les questions où le RAG échoue, pour améliorer le système."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rate a Response (Priority: P1)

After receiving an answer from the RAG system, the user sees thumbs-up and thumbs-down buttons beneath the response. They click one to rate the quality of the answer. The rating is immediately recorded and the buttons reflect the selection.

**Why this priority**: Core interaction — without it, no feedback data is captured.

**Independent Test**: Send a question, receive an answer, click 👍 or 👎 — verify the selection is visually confirmed and saved.

**Acceptance Scenarios**:

1. **Given** a user received a RAG answer, **When** they click 👍, **Then** the thumbs-up is highlighted, the rating is saved, and the thumbs-down is deselected.
2. **Given** a user received a RAG answer, **When** they click 👎, **Then** the thumbs-down is highlighted and the rating is saved.
3. **Given** a user already rated a response, **When** they click the opposite rating, **Then** the previous rating is replaced by the new one.

---

### User Story 2 - Add a Comment on Negative Feedback (Priority: P2)

When a user clicks 👎, an optional text field appears allowing them to describe what was wrong with the answer. The comment is submitted along with the rating and stored.

**Why this priority**: Comments are the primary signal for understanding RAG failures.

**Independent Test**: Click 👎, type a comment, submit — verify the comment is stored alongside the negative rating.

**Acceptance Scenarios**:

1. **Given** a user clicked 👎, **When** they type a comment and submit, **Then** the comment is saved with the rating.
2. **Given** a user clicked 👎, **When** they leave the comment blank and submit, **Then** the negative rating is saved without a comment (comment is optional).
3. **Given** a user clicked 👎 and the comment field is visible, **When** they click 👍 instead, **Then** the comment field disappears and the positive rating is saved.

---

### User Story 3 - View Feedback in Logs (Priority: P3)

An administrator viewing the query logs table can see the feedback rating (👍 / 👎 / none) and comment for each logged query, enabling identification of failing questions.

**Why this priority**: Closes the loop — raw data is only valuable when it can be acted upon.

**Independent Test**: Submit feedback on a query, open /logs — verify the rating and comment appear in the corresponding row.

**Acceptance Scenarios**:

1. **Given** a query log with a positive rating, **When** the admin views /logs, **Then** a 👍 icon appears in that row.
2. **Given** a query log with a negative rating and comment, **When** the admin views /logs, **Then** a 👎 icon and the comment text appear in that row.
3. **Given** a query log with no feedback, **When** the admin views /logs, **Then** no rating icon is shown (neutral state).

---

### Edge Cases

- What if the user submits feedback on a response whose log entry no longer exists (e.g., after a DB reset)? → Return a user-friendly error; do not crash.
- What if the user double-clicks a rating button rapidly? → Only one feedback record is created; subsequent clicks update the existing record.
- What if the comment text exceeds 500 characters? → Reject with a clear inline message.
- What if the network is unavailable when submitting feedback? → Show an error state on the button; allow retry.
- What if the RAG answer is blocked by a guardrail? → Feedback buttons are not displayed (no answer to rate).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display 👍 and 👎 buttons beneath every successful RAG answer in the chat interface.
- **FR-002**: System MUST record the rating (positive / negative) linked to the specific query log entry.
- **FR-003**: System MUST display an optional comment input when the user selects 👎.
- **FR-004**: System MUST allow submitting a negative rating without a comment (comment is optional).
- **FR-005**: System MUST store feedback (rating + optional comment + timestamp) persistently.
- **FR-006**: System MUST allow a user to change their rating on a given response (update, not duplicate).
- **FR-007**: System MUST show feedback data (rating icon + comment) in the existing query logs view.
- **FR-008**: System MUST NOT display feedback buttons for guardrail-blocked responses.
- **FR-009**: System MUST reject comments exceeding 500 characters with a clear inline error.

### Key Entities

- **ResponseFeedback**: Represents a user rating on a single RAG answer. Attributes: unique ID, reference to the query log entry, rating (positive/negative), optional comment text, submission timestamp.
- **QueryLog** *(existing)*: Extended to expose an associated feedback record when one exists.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit a rating (👍 or 👎) within 2 clicks after receiving an answer.
- **SC-002**: Negative feedback with a comment can be submitted in under 30 seconds.
- **SC-003**: 100% of submitted feedback entries are retrievable in the logs view.
- **SC-004**: Changing a rating replaces the previous one — zero duplicate feedback records per response.
- **SC-005**: Feedback data persists across page reloads and sessions.

## Assumptions

- One feedback entry per query log entry (single-user app — no multi-user distinction needed).
- Feedback buttons appear only after streaming completes and a full answer is displayed.
- The comment field accepts a maximum of 500 characters.
- The existing logs view requires only a new column addition, no structural redesign.
