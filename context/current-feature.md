# Current Feature: Consistent Relative Timestamps

## Status

Not Started

## Goals

- Replace all seven in-scope relative-time formatters with one shared implementation.
- Preserve the existing `just now`, `m`, `h`, `d`, `mo`, and `y` wording and floor-based rounding.
- Use predictable behavior at minute, hour, day, month, and year boundaries.
- Display future timestamps caused by clock skew as `just now`.
- Add automated tests for normal values and every unit boundary.
- Leave absolute dates, tenant isolation, authorization, and report lifecycle behavior unchanged.

## Notes

- In-scope views are report headers, report comments, staff comments, staff report tables, staff report details, dashboard feeds, and rewards history.
- Relative timestamps are calculated when each view renders; live client-side refresh is out of scope.
- Month and year calculations retain the existing approximation of 30 days per month and 12 months per year.
- All callers are expected to provide valid dates.

## References

- [Feature specification](./specs/consistent-relative-timestamps.md)

## Plan

<!-- Run /feature plan to generate an ordered implementation plan. -->
