# Pre-commit Hooks Setup

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to run quality checks before commits.

## What Gets Checked

Before each commit, the following checks are automatically run:

1. **Linting** (`eslint`) - Checks code quality and auto-fixes issues
2. **Formatting** (`prettier`) - Ensures consistent code formatting
3. **Type Checking** (`tsc`) - Validates TypeScript types
4. **Tests** (`vitest`) - Runs unit and integration tests
5. **Security Audit** (`npm audit`) - Checks for known vulnerabilities (non-blocking)

## Installation

After cloning the repository, run:

```bash
cd frontend
npm install
```

The `prepare` script in `package.json` will automatically configure Git to use the `.husky` hooks directory.

If hooks don't work, manually configure:

```bash
# From repository root
git config core.hooksPath .husky
```

**Note**: Husky v9+ no longer requires `husky install`. Git hooks are configured directly via `git config core.hooksPath`.

## How It Works

### Pre-commit Hook

When you run `git commit`, the `.husky/pre-commit` hook automatically:

1. Runs `lint-staged` on staged files:
   - Lints TypeScript/JavaScript files with ESLint (auto-fixes issues)
   - Formats all staged files with Prettier
   
2. Runs type checking on the entire codebase

3. Runs tests (if test files or source files changed)

4. Runs security audit (shows warnings but doesn't block commit)

### Bypassing Hooks

If you need to bypass pre-commit hooks (not recommended):

```bash
git commit --no-verify -m "your message"
```

**Warning**: Only bypass hooks for emergency fixes. Always run checks manually before pushing.

## Manual Checks

You can run the same checks manually:

```bash
cd frontend

# Lint
npm run lint

# Format check
npm run format:check

# Type check
npm run type-check

# Tests
npm test -- --run

# Security audit
npm run security:audit
```

## Configuration Files

- **`.husky/pre-commit`** - Pre-commit hook script
- **`.lintstagedrc.js`** - lint-staged configuration (what runs on staged files)
- **`package.json`** - Scripts and dependencies

## Troubleshooting

### Hooks Not Running

1. Ensure Git hooks path is configured: `git config core.hooksPath` (should be `.husky`)
2. If not set, run: `git config core.hooksPath .husky` (from repository root)
3. Check hook permissions: `ls -la .husky/pre-commit` (should be executable)
4. Verify hook exists: `test -f .husky/pre-commit && echo "Hook exists"`
5. Test hook manually: `bash .husky/pre-commit` (will fail if not in a git commit context, but syntax should be valid)

### Tests Taking Too Long

The pre-commit hook runs all tests. If this is too slow:

1. Run tests manually before committing: `npm test -- --run`
2. Use `--no-verify` only if absolutely necessary
3. Consider optimizing test suite or using test filtering

### Security Audit Blocking Commits

Security audit is non-blocking by default. If you see warnings:

1. Review the vulnerabilities: `npm audit`
2. Fix critical issues: `npm audit fix`
3. For non-critical issues, document why they're acceptable

## CI/CD Integration

The same checks run in CI/CD pipelines:
- `.github/workflows/ci.yml` - Runs lint, test, and type-check
- `.github/workflows/build-release.yml` - Full build pipeline with all checks

Pre-commit hooks ensure code quality before it reaches CI, saving time and resources.

