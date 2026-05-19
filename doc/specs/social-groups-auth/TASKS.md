# TASKS: Social Groups and Email Auth

**Date:** 2026-05-18  
**Related to:** `SPEC.md` and `PLAN.md`

## Completed

- [x] Add SQL migration for profiles, groups, memberships, group chat, and group results.
- [x] Add frontend auth service and email magic-link login entry point.
- [x] Add groups service with Supabase/local fallback.
- [x] Add group UI, selected group state, and group chat.
- [x] Save results with user/group/tie-break metadata.
- [x] Update README and `.gitignore` for secrets policy.

## Pending

- [ ] Enable Email provider and magic-link login in Supabase Auth.
- [ ] Add `VITE_SUPABASE_ANON_KEY` in local `.env.local` and Vercel env vars.
- [ ] Run both SQL migrations in the Supabase project.
- [ ] Push to the chosen Git remote after authenticating an account with repository access.
- [ ] Add TV remote focus testing before Stick TV wrapper.
- [ ] Add Android/iOS wrappers after web responsive QA.
