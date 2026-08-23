# Stride Tribe — Product Requirements Document

## Original Problem Statement
Build a mobile-first social running community app "Stride Tribe" enabling runners to discover, create, and manage local running groups, coordinate weekly workouts, manage member approvals, and track attendance (RSVP).

## Architecture
- **Frontend**: Expo React Native (expo-router, file-based routing), dark "Dark-First Utility" theme (obsidian #101115 + signal orange #FF4D00), Barlow Condensed + IBM Plex Sans fonts.
- **Backend**: FastAPI + MongoDB (Motor), uuid string IDs, all routes `/api`-prefixed.
- **Auth**: Email/Password JWT (bcrypt hashing, 30-day tokens), token in SecureStore.
- **Storage**: Emergent Managed Object Storage for avatars & group covers.
- **Maps**: react-native-maps with pin-drop (native) + image fallback on web.
- **State**: React Context (AuthContext) + per-screen fetch on focus.

## User Personas
- **Runner**: discovers groups, joins, RSVPs to sessions, tracks weekly calendar.
- **Group Leader (Admin)**: creates groups, schedules workouts, approves/rejects members, cancels sessions.

## Core Requirements (static)
- Auth & profiles (name, avatar, bio, location, target pace, joined groups).
- Group discovery with City / Category / Day filters.
- Group details: cover, leader, member count, upcoming sessions.
- Membership: public instant join; private request→pending→admin approval; leave.
- Workout coordinator: admin creates sessions (title, date/time, map meeting point, distance, pace); members RSVP Going/Not Going; live attendee count + runner list.
- Weekly calendar of committed runs.

## Implemented (2026-06)- [x] Email/password register + login + JWT session + profile edit
- [x] Avatar & group cover image upload (Object Storage)
- [x] Discovery feed with horizontal filter chips (Category, City, Day) + FAB
- [x] Group details with hero, stats, sticky membership CTA, sessions list
- [x] Membership workflow (public/private), leave, admin approve/reject members
- [x] Create group modal (cover, category, meeting days, private toggle)
- [x] Create workout modal (day strip, time chips, map pin-drop, distance, pace)
- [x] Workout coordinator: full-bleed map + details panel + state-aware RSVP + attendee stack + admin cancel
- [x] Weekly calendar (14-day strip) with per-day session cards
- [x] My Groups (Lead / Member / Pending sections)
- [x] Profile with stats, bio, my-groups shelf, sign out
- [x] Seeded demo admin + 5 sample groups with workouts
- [x] Backend 26/26 tests pass, frontend 8/8 flows pass

## Implemented — Iteration 2 (2026-06)
- [x] Group Search by name (`?search=` regex-escaped) wired into Discover feed
- [x] Run Stats: `/api/my/stats` (total_km, total_runs, streak_weeks, upcoming) + Profile stat tiles
- [x] Session Reminders via Emergent-managed push: `/api/register-push` (auth-gated), `send_push` relay, background `reminder_scheduler` (~60min before), new-session push on workout create
- [x] Push wiring in `_layout.tsx` (handler + channel at module scope, tap/cold-start listeners, denied nudge); `registerForPush` on login; `expo-notifications` plugin in app.json
- [x] 37/37 backend tests pass; hardening applied (regex escape, auth-gate push, reminder flag ordering)
- NOTE: Push delivery requires deploy + native build + Firebase `google-services.json` (not testable in Expo Go/preview)

## Implemented — Iteration 3 (2026-06)
- [x] Search By Vibe: `/api/groups?search=` matches name, city, category, and description
- [x] Reminder Timing: per-runner `reminder_prefs` (day-before `1d` / hour-before `1h`); scheduler honors prefs with two lead windows + `reminders_sent` dedupe collection; Profile toggles persist
- [x] Personal Bests: `/api/my/stats` returns `longest_km` + `best_pace`; Profile "Personal Bests" tiles
- [x] Hardening: reminder_prefs whitelist validation, unique index on reminders_sent
- [x] 51/52 backend tests pass (1 stale iter-2 push test needs auth header — not a regression)

## Backlog
### P1
- Push notifications for session reminders & join approvals (native build only)
- GPX route upload for workouts (deferred from MVP)
- In-app group chat / announcements
- Search groups by name
### P2
- Google/Apple social login
- Post-run stats & streaks, leaderboards
- Google Maps API key for Android map provider
- Membership row validation on approve/reject (currently silent 200)
- Upload size/magic-byte validation

## Test Credentials
See `/app/memory/test_credentials.md` — demo@stridetribe.com / Password123

## Next Tasks
- Session reminders, group chat, run stats/streaks.
