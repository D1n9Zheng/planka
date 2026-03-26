# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Planka is a collaborative Kanban board application (self-hostable, like Trello) built with:
- **Server**: Sails.js (Node.js framework) with Waterline ORM and PostgreSQL
- **Client**: React 18 + Redux + Redux-Saga + Vite
- **Real-time**: Socket.io for live updates
- **i18n**: i18next (server) and react-i18next (client)

## Commands

### Development
```bash
# Install all dependencies (runs npm i in both server and client)
npm run postinstall

# Run both server and client concurrently (dev mode)
npm start

# Run server only
npm run server:start

# Run client only (needs PROXY_TARGET env var pointing to server)
npm run client:start

# Docker Compose dev environment (server on :1337, client on :3000)
docker-compose -f docker-compose-dev.yml up
```

### Database
```bash
npm run server:db:init      # Initialize database and create admin user
npm run server:db:migrate    # Run migrations
npm run server:db:seed       # Run seeds
npm run server:db:upgrade    # Run upgrade script
npm run server:db:create-admin-user  # Create additional admin user
```

### Building & Testing
```bash
# Build Docker image
npm run docker:build

# Lint both server and client
npm run lint

# Lint individual parts
npm run server:lint
npm run client:lint

# Run all tests
npm test

# Run server tests (mocha)
npm run server:test

# Run client tests (jest)
npm run client:test

# Run client acceptance tests (cucumber)
npm run client:test:acceptance
```

### Other
```bash
# Generate version files
npm run gv

# Generate Swagger spec
npm run server:swagger:generate
```

## Architecture

### Server (`/server`)

Built on **Sails.js** with the following key directories:
- `api/controllers/` - Request handlers
- `api/models/` - Waterline ORM models
- `api/helpers/` - Business logic (similar to services)
- `api/policies/` - Authentication/authorization middleware
- `config/` - Sails configuration (routes, models, sockets, etc.)
- `db/migrations/` - Knex database migrations
- `db/seeds/` - Database seed data

**Key patterns:**
- Controllers delegate to helpers for business logic
- Models use `.qm` methods (qm = query manager) for custom queries
- JWT tokens are verified via `sails.helpers.utils.verifyJwtToken()`
- Real-time events published via `sails.sockets.*`

### Client (`/client`)

React 18 app with Redux-ORM for normalized state:
- `src/actions/` - Redux action creators
- `src/api/` - API client modules (http + socket)
- `src/components/` - React components
- `src/models/` - Redux-ORM model definitions
- `src/reducers/` - Redux reducers
- `src/sagas/` - Redux-Saga middleware (side effects)
- `src/selectors/` - Reselect memoized selectors
- `src/entry-actions/` - Actions that trigger on app bootstrap

**State management:** Redux + Redux-ORM for normalized data, Redux-Saga for async operations (API calls, socket events).

**API layer:** Two clients - `http.js` for REST and `socket.js` for real-time communication. Most operations use socket client which auto-subscribes to related data.

### Shared Types
The server and client share model type constants in `client/src/constants/Models.js`.

## Environment Variables

Required for server:
- `BASE_URL` - Public URL of the application
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT signing secret

Defaults for development are in `docker-compose-dev.yml`.

## Git Conventions

Follow [Conventional Commits](https://conventionalcommits.org) for commit messages. The pre-commit hook runs linting via husky + lint-staged.
