# Contributing

Thanks for your interest in contributing. This project is being prepped for sale and accepts limited contributions.

- For small fixes (typos, docs), open a PR describing the change and its scope.
- For bugs, open an issue with exact steps to reproduce and expected behavior.
- For larger features, please open an issue first to discuss scope before implementing.

Development quickstart:
- Install: `npm install`
- Env: copy `.env.example` to `.env` and fill required values
- DB: run `npm run db:push`
- Start: `npm run dev`

Coding standards:
- TypeScript for both client and server
- Keep functions small and focused; avoid inline comments where obvious
- Prefer existing patterns and utilities in `server/middleware`, `server/services`, and `client/src/lib`

Security & privacy:
- Do not commit secrets, keys, or logs
- Use environment variables and `.env.example` for configuration

License:
- By contributing, you agree your contributions are licensed under the repository’s MIT license

