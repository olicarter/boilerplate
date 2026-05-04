# Ripple Project - Agent Context

## Current State
- Dev server is running (user confirmed)
- DO NOT start dev server - it's already running

## Tech Stack
- Backend: NestJS, TypeORM, PostgreSQL, ElectricSQL
- Frontend: React v19, TanStack Router, TanStack React-DB
- Auth: WebAuthn (passkey)

## Focus
Simple policy voting platform. Documents, teams, and Yjs collaboration have been removed.

## Database Tables
- users, topics, proposals, votes, delegations, credentials

## API Routes
- /users/* - CRUD
- /topics/* - CRUD
- /proposals/* - CRUD, /proposals/:id/tally
- /votes/* - CRUD
- /delegations/* - CRUD
- /auth/* - WebAuthn passkey registration/login/logout

## Frontend Pages
- ProposalsPage - list of proposals by topic
- ProposalDetailPage - vote on a proposal, view tally
- DelegationsPage - manage vote delegations
- UserProfilePage - user profile
