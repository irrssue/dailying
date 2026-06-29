# dailying

A morning-briefing app: a SwiftUI iOS client backed by a Node/TypeScript service.

## Structure

- `dailying/` — SwiftUI iOS app (App, DesignSystem, Models, ViewModels, Views).
- `dailying.xcodeproj/` — Xcode project for the iOS app.
- `backend/` — Fastify + Prisma + Redis service that builds the briefing the app consumes.

## Workflow: always commit & push

**Every time something in this project changes, commit and push to GitHub.**

1. Stage the change.
2. Commit with a clear, readable message that describes *what* changed and *why* (not just "update").
   - Use a conventional prefix when it fits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
   - Example: `fix: correct timezone offset in briefing scheduler`.
3. Push to `origin main` (https://github.com/irrssue/dailying — private).

Do not leave changes uncommitted at the end of a task. If multiple unrelated things changed, prefer separate commits over one mixed commit.

## Notes

- Never commit secrets. `backend/.env` is gitignored; only `backend/.env.example` is tracked.
- Xcode user state (`xcuserdata/`, `*.xcuserstate`) and `.DS_Store` are gitignored — keep them out of commits.
