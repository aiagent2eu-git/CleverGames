# SPEC: Social Groups and Email Auth

**Author:** AI Agent  
**Date:** 2026-05-18  
**Status:** Implemented  
**Version:** 1.0

## 1. Context and Motivation

CleverGames needs user identity and private competition spaces. Players should sign in with email OTP through Supabase Auth, create groups, invite other users, chat, and compare daily results by group and day.

## 2. Objective

Add Supabase Auth profiles, private groups, group membership, group chat, and group-scoped daily results. Keep all credentials out of Git while committing SQL schema files so anyone can clone and provision their own database.

## 3. Non-Objectives

- Native Android, iOS, and Stick TV builds are documented but not built in this slice.
- Push notifications, moderation tools, and file attachments are deferred.
- Full dictionary-backed Letras validation remains future work.

## 4. Functional Requirements

### RF-01: Email User Account

Players authenticate with email OTP through Supabase Auth. A profile is mirrored into `profiles` with display name and email.

### RF-02: Groups

Authenticated users can create groups, receive an invite code, select the active group, and join groups by invite code.

### RF-03: Group Chat

Members of a group can read and write text chat messages. Messages are visible only to members of that group.

### RF-04: Group Daily Results

Daily game results can be personal or attached to the active group. Group rankings show results for the selected day, game, and Sudoku difficulty where applicable.

### RF-05: Tie Breakers

Rankings sort by score first. Tie breakers use lower time, lower operation count for Cifras, and longer word length for Letras.

## 5. Acceptance Criteria

- [x] SQL migration creates profiles, groups, group members, group messages, and group-linked daily results.
- [x] RLS restricts groups, messages, and group results to group members.
- [x] Frontend has email login entry point and local fallback.
- [x] Frontend can create/select groups, join by code, send chat messages, and save group results.
- [x] `.gitignore` excludes environment files and credential-like artifacts.
- [x] README documents migrations, email auth setup, secrets policy, and app roadmap.

## 6. Technical Design

```text
Supabase Auth Email OTP
  -> profiles
React App
  -> AuthPanel
  -> GroupsPanel
  -> GroupChat
  -> DailyLeaderboard(group scope)
  -> Game components save daily_results with user_id/group_id
Supabase RLS
  -> members can see group data
  -> users can insert own results
```

## 7. Data and RLS Impact

Migration: `sql/20260518-002_create_social_groups_auth.sql`

New tables:

- `profiles`
- `groups`
- `group_members`
- `group_messages`

Modified table:

- `daily_results`: adds `user_id`, `group_id`, `operations_count`, `word_length`.

RLS:

- Profiles visible to self and group peers.
- Groups visible only to members.
- Group chat visible only to members.
- Results visible to submitter or group members.
- Results and chat are immutable in the first version.

## 8. Platform Roadmap

Android, iOS, and Stick TV should reuse the web app as the primary surface. The web UI must remain responsive and usable with touch, mouse, keyboard, and later TV remote focus navigation.

## 9. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Auth redirect misconfiguration | Low | Medium | Document local and production redirect URLs |
| Public anon key committed accidentally | Medium | High | `.gitignore`, `.env.example`, README policy |
| Group RLS too permissive | Low | High | Deny by default and member checks |
| TV usability differs from mobile web | Medium | Medium | Add focus-visible and remote-control testing before wrapper |

## 10. Rollback Strategy

Run the rollback section in migration 002, then redeploy the previous frontend. Migration 001 remains the base daily results table.
