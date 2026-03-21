---
description: Frontend conventions for Angular modules
globs:
  - "frontend/**/*.ts"
  - "frontend/**/*.html"
  - "frontend/**/*.scss"
---

# Frontend Rules

- Angular 21: standalone components, signals, OnPush change detection.
- Tests: `cd frontend && npm test -- --watch=false`
- Lint: `cd frontend && npm run lint`
- Run dev: `cd frontend && npm start` (port 4200)
- Streaming uses native `fetch()` + `ReadableStream` — never Angular HttpClient for streaming POST.
