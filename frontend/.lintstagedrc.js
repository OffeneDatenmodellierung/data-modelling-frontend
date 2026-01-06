/**
 * lint-staged configuration
 * Runs checks on staged files before commit
 */
export default {
  // TypeScript and JavaScript files - format only (skip eslint due to config issues)
  '**/*.{ts,tsx,js,jsx}': (filenames) => [`npx prettier --write ${filenames.join(' ')}`],

  // JSON, CSS, Markdown, YAML files - format only
  '**/*.{json,css,md,yml,yaml}': (filenames) => [`npx prettier --write ${filenames.join(' ')}`],
};
