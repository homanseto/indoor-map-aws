# CI/CD Reference for Node.js/Express Projects

## 1. Standard CI/CD Workflow

A typical CI/CD (Continuous Integration/Continuous Deployment) workflow includes:

1. **Code Commit & Push**
   - Developer pushes code to a shared repository (e.g., GitHub).
2. **Continuous Integration (CI)**
   - **Install Dependencies:** `npm ci`
   - **Linting:** Run code linters (e.g., ESLint).
   - **Run Tests:** Execute all automated tests (`npm test`).
   - **Build:** Compile or bundle code if needed.
   - **Security Checks:** Run `npm audit` or similar tools.
   - **Artifacts:** Optionally build and store deployable artifacts (e.g., Docker images).
3. **Continuous Deployment (CD)**
   - **Staging Deployment:** Deploy to a staging environment if all CI steps pass.
   - **Approval (optional):** Wait for manual approval or additional checks.
   - **Production Deployment:** Deploy to production automatically or after approval.
4. **Post-Deployment**
   - **Smoke Tests/Health Checks:** Ensure the app is running correctly in production.
   - **Monitoring & Alerts:** Monitor logs, errors, and performance.

---

## 2. Applying CI/CD with GitHub Actions

Create a workflow file at `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test
```

- This workflow runs on every push and pull request to `main` or `master`.
- It installs dependencies and runs your tests automatically.

---

## 3. package.json Configuration for Testing

- Your `package.json` should have a test script compatible with your code style (ESM):

```json
"scripts": {
  "test": "node --experimental-vm-modules node_modules/.bin/jest"
}
```

- You should also have a `jest.config.js` file for ESM support:

```js
export default {
  testEnvironment: "node",
  transform: {},
};
```

**Why did `npm test` fail before?**

- Jest does not support ES module (`import/export`) syntax out of the box.
- You had both a `jest` key in `package.json` and a `jest.config.js` file, causing a config conflict.
- The test script was not using the `--experimental-vm-modules` flag, which is required for ESM support.
- After fixing these, tests run as expected.

---

## 4. Considerations for Setting Up Testing

- **Single Jest Config:** Only use one Jest config file (prefer `jest.config.js` for ESM projects).
- **ESM Support:** If using ES modules, always use the `--experimental-vm-modules` flag and proper config.
- **Test Data Isolation:** Use setup/teardown hooks (`beforeAll`, `afterAll`) to create and clean up test data.
- **Environment Variables:** Use `.env.test` or set `NODE_ENV` to `test` for test-specific configs.
- **CI Compatibility:** Ensure your tests run the same locally and in CI (no hardcoded paths, ports, or secrets).
- **Debugging:** Add a VS Code debug configuration for Jest to make test debugging easier.
- **Coverage:** Consider adding code coverage reporting (`jest --coverage`).
- **Artifacts:** Store test results as artifacts in CI for later review.

---

## 5. Troubleshooting

- If tests fail to run, check for:
  - Multiple Jest configs (remove duplicates)
  - Missing ESM flags or config
  - Syntax errors or unsupported features
  - Environment variable issues

---

This file is a reference for setting up, running, and troubleshooting CI/CD and testing in your Node.js/Express project. Update as your workflow evolves.
