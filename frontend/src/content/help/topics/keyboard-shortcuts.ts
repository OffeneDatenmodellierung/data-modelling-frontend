/**
 * Keyboard Shortcuts Help Topics
 */

import { HelpCategory, type HelpTopic } from '@/types/help';

export const keyboardShortcutsTopics: HelpTopic[] = [
  {
    id: 'keyboard-shortcuts-reference',
    title: 'Keyboard Shortcuts Reference',
    category: HelpCategory.KeyboardShortcuts,
    keywords: [
      'keyboard',
      'shortcut',
      'shortcuts',
      'hotkey',
      'hotkeys',
      'key',
      'keys',
      'quick',
      'reference',
    ],
    order: 1,
    content: `
# Keyboard Shortcuts Reference

Quick reference for all keyboard shortcuts in the application.

## General

| Shortcut | Action |
|----------|--------|
| \`F1\` | Open Help |
| \`Ctrl/Cmd + ?\` | Open Help |
| \`Ctrl/Cmd + S\` | Save workspace |
| \`Ctrl/Cmd + Z\` | Undo |
| \`Ctrl/Cmd + Shift + Z\` | Redo |
| \`Ctrl/Cmd + Y\` | Redo (alternative) |
| \`Escape\` | Close dialog / Deselect |

## Canvas Navigation

| Shortcut | Action |
|----------|--------|
| \`Space + Drag\` | Pan canvas |
| \`Scroll\` | Zoom in/out |
| \`Ctrl/Cmd + 0\` | Reset zoom to 100% |
| \`Ctrl/Cmd + +\` | Zoom in |
| \`Ctrl/Cmd + -\` | Zoom out |
| \`Ctrl/Cmd + F\` | Fit all to view |

## Selection

| Shortcut | Action |
|----------|--------|
| \`Click\` | Select item |
| \`Ctrl/Cmd + Click\` | Add to selection |
| \`Shift + Click\` | Range select |
| \`Ctrl/Cmd + A\` | Select all |
| \`Escape\` | Deselect all |

## Editing

| Shortcut | Action |
|----------|--------|
| \`Delete\` | Delete selected |
| \`Backspace\` | Delete selected |
| \`Ctrl/Cmd + D\` | Duplicate selected |
| \`Ctrl/Cmd + C\` | Copy |
| \`Ctrl/Cmd + V\` | Paste |
| \`Ctrl/Cmd + X\` | Cut |
| \`Enter\` | Open editor for selected |
| \`Double-click\` | Open editor |

## Tables

| Shortcut | Action |
|----------|--------|
| \`T\` | Create new table (when canvas focused) |
| \`Enter\` | Edit selected table |
| \`Tab\` | Next column (in editor) |
| \`Shift + Tab\` | Previous column (in editor) |

## Views

| Shortcut | Action |
|----------|--------|
| \`1\` | Systems view |
| \`2\` | Process view |
| \`3\` | Operational view |
| \`4\` | Analytical view |
| \`5\` | Products view |

## Git (Desktop App)

| Shortcut | Action |
|----------|--------|
| \`Ctrl/Cmd + Shift + G\` | Open Git panel |
| \`Ctrl/Cmd + Enter\` | Commit (when in commit message) |

## Dialog Navigation

| Shortcut | Action |
|----------|--------|
| \`Tab\` | Next field |
| \`Shift + Tab\` | Previous field |
| \`Enter\` | Confirm / Submit |
| \`Escape\` | Cancel / Close |

## Tips

- On **Mac**, use \`Cmd\` instead of \`Ctrl\`
- On **Windows/Linux**, use \`Ctrl\`
- Some shortcuts require the canvas to be focused
- In text fields, standard text editing shortcuts apply
`,
    relatedTopics: ['getting-started-overview', 'canvas-basics'],
  },
];
