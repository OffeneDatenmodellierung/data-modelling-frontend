# Major Dependency Upgrade Plan

This document outlines the planned major version upgrades for the Open Data Modelling application.

## Priority Order

Upgrades are ordered by risk level and dependency chain:

1. **DuckDB-WASM** (Low-Medium Risk)
2. **Electron** (Medium Risk)
3. **Tailwind CSS** (Medium Risk)
4. **React 19** (High Risk)
5. **lint-staged** (Low Risk)

---

## 1. DuckDB-WASM: 1.29.0 → 1.32.0

**Current**: 1.29.0 (DuckDB 1.4.3)
**Target**: 1.32.0 (DuckDB 1.x.x)

### Breaking Changes
- Review [DuckDB-WASM releases](https://github.com/duckdb/duckdb-wasm/releases) for API changes
- OPFS API changes may affect `opfsManager.ts`
- Query result format changes may affect `duckdbService.ts`

### Migration Steps
1. Review release notes for 1.30.0, 1.31.0, 1.32.0
2. Update `@duckdb/duckdb-wasm` package
3. Run DuckDB-specific tests: `npm test -- --run tests/unit/services/database/`
4. Test OPFS persistence in browser
5. Verify query builder compatibility

### Estimated Effort
- **Time**: 2-4 hours
- **Risk**: Low-Medium (isolated to database layer)

### Files Affected
- `src/services/database/duckdbService.ts`
- `src/services/database/opfsManager.ts`
- `src/services/database/schemaManager.ts`
- `src/services/database/syncEngine.ts`
- `src/services/database/queryBuilder.ts`

---

## 2. Electron: 39.2.7 → 40.x

**Current**: 39.2.7
**Target**: 40.1.0

### Breaking Changes
- Review [Electron 40 release notes](https://releases.electronjs.org/)
- Node.js version requirements may change
- Chromium version bump (security & feature updates)
- Potential deprecations in IPC, contextBridge, or preload APIs

### Migration Steps
1. Review Electron 40 breaking changes
2. Update `electron` and `electron-builder` packages
3. Check Node.js compatibility
4. Test all IPC handlers in `electron/main.ts`
5. Test preload scripts in `electron/preload.ts`
6. Build and test on all platforms (macOS, Windows, Linux)

### Estimated Effort
- **Time**: 4-8 hours
- **Risk**: Medium (affects desktop builds)

### Files Affected
- `electron/main.ts`
- `electron/preload.ts`
- `package.json` (electron-builder config)
- `vite.config.ts` (electron plugin config)

---

## 3. Tailwind CSS: 3.4.0 → 4.x

**Current**: 3.4.0
**Target**: 4.1.18

### Breaking Changes
- Major rewrite with new architecture
- Configuration file format changes (`tailwind.config.js` → CSS-based config)
- Some utility classes renamed or removed
- Plugin API changes
- PostCSS integration changes

### Migration Steps
1. Review [Tailwind CSS v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide)
2. Run official upgrade tool if available
3. Update configuration to new format
4. Audit all component files for deprecated classes
5. Update any custom Tailwind plugins
6. Test all UI components visually

### Estimated Effort
- **Time**: 8-16 hours
- **Risk**: Medium (affects all UI components)

### Files Affected
- `tailwind.config.js` (or new config format)
- `postcss.config.js`
- All `*.tsx` files with Tailwind classes
- `src/index.css`

---

## 4. React 19: 18.2.0 → 19.x

**Current**: 18.2.0
**Target**: 19.2.4

### Breaking Changes
- New React Compiler (opt-in)
- `use()` hook for promises and context
- `ref` as a prop (no more `forwardRef` needed)
- Stricter hydration error reporting
- Removal of deprecated APIs
- Document Metadata support
- Async script support
- Preloading APIs

### Dependencies Requiring Update
- `react-dom`: 18.2.0 → 19.x
- `@types/react`: Already on 19.x types
- `@types/react-dom`: Check compatibility
- Check compatibility: `react-router-dom`, `@tanstack/react-query`, `zustand`

### Migration Steps
1. Review [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
2. Run React 19 codemods if available
3. Remove deprecated API usage
4. Update `forwardRef` patterns to use `ref` prop
5. Test all components for hydration issues
6. Update dependencies that require React 19 peer deps
7. Consider enabling React Compiler (separate effort)

### Estimated Effort
- **Time**: 16-32 hours
- **Risk**: High (affects entire application)

### Files Affected
- All React components
- `package.json`
- `vite.config.ts`
- Test setup files

---

## 5. lint-staged: 15.5.2 → 16.x

**Current**: 15.5.2
**Target**: 16.2.7

### Breaking Changes
- Configuration format changes
- Node.js version requirements
- Git integration changes

### Migration Steps
1. Review lint-staged 16 release notes
2. Update configuration in `.lintstagedrc.js` or `package.json`
3. Test pre-commit hooks

### Estimated Effort
- **Time**: 1-2 hours
- **Risk**: Low (development tooling only)

### Files Affected
- `.lintstagedrc.js`
- `package.json`

---

## Recommended Upgrade Order

### Phase 1: Low Risk (Can do now)
1. lint-staged 16.x
2. DuckDB-WASM 1.32.0

### Phase 2: Medium Risk (Next sprint)
3. Electron 40.x
4. Tailwind CSS 4.x (may want to wait for ecosystem maturity)

### Phase 3: High Risk (Dedicated effort)
5. React 19 (requires thorough testing and potentially ecosystem updates)

---

## Pre-Upgrade Checklist

Before each major upgrade:
- [ ] Create a dedicated feature branch
- [ ] Review all release notes and breaking changes
- [ ] Check peer dependency compatibility
- [ ] Run full test suite before upgrade
- [ ] Run full test suite after upgrade
- [ ] Test in Electron app (not just browser)
- [ ] Test on multiple platforms if applicable
- [ ] Update documentation as needed

---

## Security Vulnerabilities

Current audit shows 15 vulnerabilities (6 moderate, 9 high). Some may be resolved by these upgrades. Run `npm audit` after each upgrade to track progress.
