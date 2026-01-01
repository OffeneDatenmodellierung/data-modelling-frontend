# Accessibility Guide

## Overview

This application is designed to meet **WCAG 2.1 Level AA** accessibility standards, ensuring that users with disabilities can effectively use the data modelling application.

## Keyboard Navigation

### Canvas Navigation
- **Arrow Keys**: Navigate between tables and relationships
- **Tab**: Move focus between interactive elements
- **Enter/Space**: Activate selected element
- **Escape**: Close dialogs and cancel operations

### Table Operations
- **N**: Create new table
- **R**: Create new relationship
- **Delete**: Delete selected element
- **Ctrl+S / Cmd+S**: Save workspace
- **Ctrl+Z / Cmd+Z**: Undo
- **Ctrl+Y / Cmd+Y**: Redo

### Dialog Navigation
- **Tab**: Move between form fields
- **Shift+Tab**: Move backwards
- **Enter**: Submit form
- **Escape**: Close dialog

## Screen Reader Support

### ARIA Labels
All interactive elements include descriptive ARIA labels:
- Tables: "Table name, table with X columns"
- Relationships: "Relationship from TableA to TableB, type one-to-many"
- Buttons: Descriptive labels indicating action
- Form fields: Associated labels and descriptions

### Roles
- `role="tablist"` and `role="tab"` for domain tabs
- `role="group"` for table nodes
- `role="dialog"` for modal dialogs
- `role="alert"` for error messages
- `role="status"` for success notifications

### Live Regions
- Toast notifications use `aria-live="polite"` for non-critical updates
- Error messages use `aria-live="assertive"` for critical errors

## Color Contrast

All text meets WCAG 2.1 Level AA contrast requirements:
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **Interactive elements**: Clear focus indicators with 3:1 contrast

### Color Usage
- Colors are not the sole means of conveying information
- Status indicators include icons and text labels
- Error states include both color and text

## Focus Management

### Visible Focus Indicators
- All focusable elements have visible focus rings
- Focus indicators use 2px solid outline with sufficient contrast
- Focus state is clearly distinguishable from hover state

### Focus Trapping
- Modal dialogs trap focus within the dialog
- Focus returns to trigger element when dialog closes
- First focusable element receives focus when dialog opens

## Responsive Design

### Viewport Support
- **Tablet**: 768px and above
- **Desktop**: 1024px and above
- **Mobile**: Not supported (application requires larger screen)

### Layout Adaptations
- Canvas scales appropriately for different screen sizes
- Sidebars collapse on smaller screens
- Toolbars adapt to available space

## Testing

### Automated Testing
- Accessibility testing integrated with Vitest
- axe-core used for automated accessibility checks
- Lighthouse CI for accessibility audits

### Manual Testing
- Keyboard-only navigation testing
- Screen reader testing (NVDA, JAWS, VoiceOver)
- High contrast mode testing
- Zoom testing (up to 200%)

## Best Practices

### For Developers
1. Always include ARIA labels for interactive elements
2. Ensure keyboard navigation works for all features
3. Test with screen readers during development
4. Maintain color contrast ratios
5. Use semantic HTML elements

### For Users
1. Use keyboard shortcuts for faster navigation
2. Enable screen reader if needed
3. Adjust browser zoom for better visibility
4. Use high contrast mode if available

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

