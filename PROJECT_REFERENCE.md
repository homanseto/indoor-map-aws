# Node.js/Express Backend: Modern, Secure, and Maintainable Project Reference

## 1. Project Structure

```
project-root/
├── app.js                # Main Express app
├── package.json          # Project metadata and dependencies
├── bin/www               # App entry point (for Express)
├── public/               # Static files (images, JS, CSS)
│   ├── images/
│   ├── javascripts/
│   └── stylesheets/
├── routes/               # Express routers (modular)
│   ├── index.js
│   └── users.js
├── services/             # Business logic/service classes
│   └── JsonFileService.js
├── tests/                # Jest test files
│   └── JsonFileService.test.js
├── views/                # Templates (e.g., Jade/Pug)
│   ├── error.jade
│   ├── index.jade
│   └── layout.jade
├── .env                  # Environment variables (never commit)
└── Dockerfile, docker-compose.yml # Containerization (optional)
```

## 2. Security Best Practices

- **Environment Variables**: Store secrets (JWT keys, API keys, DB URIs) in `.env` and access via `process.env`.
- **JWT Authentication**: Use `jsonwebtoken` to sign/verify tokens. Store JWT in httpOnly, secure cookies. Rotate secrets regularly.
- **CSRF Protection**: Use `csurf` middleware. Store CSRF token in a cookie, require it in headers for state-changing requests.
- **API Key Middleware**: Protect sensitive/external endpoints with API key checks. Store key in `.env`.
- **Cookie Security**: Set `httpOnly`, `secure`, and `sameSite` flags on cookies. Never store sensitive data in plain cookies.
- **Static File Security**: Serve static files from a dedicated directory. Never expose server-side code or secrets.
- **Error Handling**: Never leak stack traces or sensitive info in production. Use generic error messages for users.
- **Dependencies**: Keep dependencies up to date. Use `npm audit` and `npm outdated` regularly.

## 3. Middleware Order (Express)

1. `helmet()` (optional, for HTTP headers)
2. `cookie-parser`
3. `express.json()` and `express.urlencoded()`
4. Session middleware (if used)
5. CSRF middleware (`csurf`)
6. Authentication middleware (JWT, etc.)
7. API key middleware (for protected routes)
8. Routers
9. Error handlers

## 4. Modular Business Logic

- Use service classes (e.g., `JsonFileService`) for business logic and file/database operations.
- Keep routers thin: only handle HTTP, delegate logic to services.
- Example service class:

```js
class JsonFileService {
  async readJson(filePath) {
    /* ... */
  }
  async writeJson(filePath, data) {
    /* ... */
  }
}
```

## 5. Testing (Jest)

- Place tests in `tests/` or alongside code as `*.test.js`.
- Use Jest for unit/integration tests.
- Example test:

```js
test('reads valid JSON file', async () => {
  const data = await JsonFileService.readJson('test.json');
  expect(data).toEqual({ ... });
});
```

- Add to `package.json`:

```json
"scripts": {
  "test": "jest"
}
```

## 6. CI/CD Best Practices

- Run `npm test` on every push/PR (GitHub Actions, GitLab CI, etc.).
- Lint code (e.g., with ESLint) before running tests.
- Build Docker images and run tests in containers for production parity.
- Example GitHub Actions workflow:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test
```

## 7. Documentation

- Maintain a `README.md` with setup, usage, and security notes.
- Document all environment variables and secrets in a `docs/env.md` (never commit actual secrets).
- Use inline comments for complex logic and security-critical code.

## 8. Additional Recommendations

- Use Docker Compose for local dev with DBs (MongoDB, PostgreSQL, etc.).
- Use `.dockerignore` and `.gitignore` to avoid leaking secrets.
- Regularly review and update dependencies and security policies.
- Plan for team growth: modular code, clear docs, and automated tests.

---

This file is a living reference for building and maintaining a modern, secure, and maintainable Node.js/Express backend. Update as your project evolves.
