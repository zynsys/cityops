# Feature Specification: Consistent Relative Timestamps

**Feature Branch**: `feature/consistent-relative-timestamps`  
**Created**: 2026-10-15  
**Status**: Draft  
**Input**: Present relative timestamps consistently across citizen, rewards, dashboard, and council report views.

## Scope Baseline

- **Discovery method**: Searched application source for relative-time formatting functions and usages.
- **Total items discovered**: 7 local formatters.
- **Items in scope**: All 7 formatters used by report headers, report comments, staff comments, staff report tables, staff report details, dashboard feeds, and rewards history.
- **Out of scope**: Absolute date formatting, timezone preferences, database changes, report workflow changes, and live client-side timestamp refresh.

## User Scenarios & Testing

### User Story 1 - Consistent timestamp wording (Priority: P1)

As a CityOps user, I want elapsed times to use the same wording everywhere so that report and reward activity is easy to understand.

**Why this priority**: Inconsistent timestamps make the same age appear different across screens and reduce confidence in activity history.

**Independent Test**: Compare the displayed age of equivalent timestamps across citizen and council views and verify that the wording matches.

**Acceptance Scenarios**:

1. **Given** an event less than one minute old, **when** it is displayed on any in-scope screen, **then** its age is shown as `just now`.
2. **Given** an event between one minute and eleven months old, **when** it is displayed on any in-scope screen, **then** it uses one consistent abbreviated unit: `m`, `h`, `d`, or `mo`.
3. **Given** an event at least twelve months old, **when** it is displayed on any in-scope screen, **then** it is shown in whole years using `y`.

### User Story 2 - Stable boundary behavior (Priority: P2)

As a user reviewing activity history, I want elapsed times near unit boundaries to remain predictable so that dates do not appear to jump inconsistently between screens.

**Why this priority**: Boundary errors are the most likely source of visible differences when timestamp logic is duplicated.

**Independent Test**: Verify values immediately below and at the minute, hour, day, month, and year boundaries.

**Acceptance Scenarios**:

1. **Given** an elapsed time exactly at a unit boundary, **when** it is displayed, **then** the larger unit is used.
2. **Given** an elapsed time between unit boundaries, **when** it is displayed, **then** the elapsed value is rounded down to a whole unit.

### Edge Cases

- Future timestamps caused by minor clock skew are displayed as `just now`.
- Month and year values retain the existing approximation of 30 days per month and 12 months per year.
- Invalid dates are outside this feature's scope because in-scope timestamps originate from validated application data.

## Requirements

### Functional Requirements

- **REQ-001**: Every in-scope view MUST use the same relative-time rules and wording.
- **REQ-002**: Elapsed times below 60 seconds MUST display as `just now`.
- **REQ-003**: Elapsed times MUST display in whole minutes below 60 minutes, whole hours below 24 hours, whole days below 30 days, whole months below 12 months, and whole years thereafter.
- **REQ-004**: Displayed values MUST use the abbreviations `m`, `h`, `d`, `mo`, and `y`.
- **REQ-005**: Elapsed numeric values MUST be rounded down.
- **REQ-006**: Future timestamps MUST display as `just now`.
- **REQ-007**: Existing absolute-date displays and report lifecycle behavior MUST remain unchanged.
- **REQ-008**: Automated tests MUST cover normal values and every unit boundary.

## Assumptions

- Relative timestamps are calculated when the containing view renders; automatic ticking or refresh is not required.
- The current compact English wording is intentional and remains unchanged.
- All in-scope callers provide valid dates.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Equivalent timestamps produce identical relative-time text on 100% of in-scope screens.
- **SC-002**: Automated checks cover values below and at all five unit boundaries with no failures.
- **SC-003**: Users continue to see the current compact timestamp wording with no changes to report status, permissions, or tenant data.
- **SC-004**: No in-scope screen maintains an independent set of relative-time rules after completion.
