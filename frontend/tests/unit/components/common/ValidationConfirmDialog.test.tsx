/**
 * Unit tests for ValidationConfirmDialog Component
 * Tests the confirmation dialog shown when validation errors exist
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationConfirmDialog } from '@/components/common/ValidationConfirmDialog';

describe('ValidationConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    onViewIssues: vi.fn(),
    errorCount: 0,
    warningCount: 0,
    title: 'Validation Issues',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<ValidationConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<ValidationConfirmDialog {...defaultProps} />);

      // There are two elements with role="dialog" - the outer container and inner dialog
      expect(screen.getAllByRole('dialog').length).toBeGreaterThanOrEqual(1);
    });

    it('should render the title', () => {
      render(<ValidationConfirmDialog {...defaultProps} title="Commit Blocked" />);

      expect(screen.getByText('Commit Blocked')).toBeInTheDocument();
    });

    it('should render custom message when provided', () => {
      render(
        <ValidationConfirmDialog {...defaultProps} message="Custom validation message here" />
      );

      expect(screen.getByText('Custom validation message here')).toBeInTheDocument();
    });

    it('should render default message for errors', () => {
      render(<ValidationConfirmDialog {...defaultProps} errorCount={3} />);

      expect(screen.getByText(/There are 3 validation errors/)).toBeInTheDocument();
    });

    it('should render singular form for 1 error', () => {
      render(<ValidationConfirmDialog {...defaultProps} errorCount={1} />);

      expect(screen.getByText(/There is 1 validation error/)).toBeInTheDocument();
    });

    it('should render default message for warnings only', () => {
      render(<ValidationConfirmDialog {...defaultProps} warningCount={2} />);

      expect(screen.getByText(/There are 2 validation warnings/)).toBeInTheDocument();
    });

    it('should render singular form for 1 warning', () => {
      render(<ValidationConfirmDialog {...defaultProps} warningCount={1} />);

      expect(screen.getByText(/There is 1 validation warning/)).toBeInTheDocument();
    });

    it('should render combined message for errors and warnings', () => {
      render(<ValidationConfirmDialog {...defaultProps} errorCount={2} warningCount={3} />);

      expect(screen.getByText(/There are 2 validation errors/)).toBeInTheDocument();
      // The warning text appears both in the message and badge, use getAllByText
      expect(screen.getAllByText(/3 warning/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('error/warning badges', () => {
    it('should display error count badge when there are errors', () => {
      render(<ValidationConfirmDialog {...defaultProps} errorCount={5} />);

      expect(screen.getByText('5 errors')).toBeInTheDocument();
    });

    it('should display warning count badge when there are warnings', () => {
      render(<ValidationConfirmDialog {...defaultProps} warningCount={3} />);

      expect(screen.getByText('3 warnings')).toBeInTheDocument();
    });

    it('should display both badges when there are errors and warnings', () => {
      render(<ValidationConfirmDialog {...defaultProps} errorCount={2} warningCount={4} />);

      expect(screen.getByText('2 errors')).toBeInTheDocument();
      expect(screen.getByText('4 warnings')).toBeInTheDocument();
    });

    it('should use singular form for 1 error', () => {
      render(<ValidationConfirmDialog {...defaultProps} errorCount={1} />);

      expect(screen.getByText('1 error')).toBeInTheDocument();
    });

    it('should use singular form for 1 warning', () => {
      render(<ValidationConfirmDialog {...defaultProps} warningCount={1} />);

      expect(screen.getByText('1 warning')).toBeInTheDocument();
    });
  });

  describe('buttons', () => {
    it('should render Cancel button', () => {
      render(<ValidationConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should render View Issues button', () => {
      render(<ValidationConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'View Issues' })).toBeInTheDocument();
    });

    it('should render confirm button with default label', () => {
      render(<ValidationConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Proceed Anyway' })).toBeInTheDocument();
    });

    it('should render confirm button with custom label', () => {
      render(<ValidationConfirmDialog {...defaultProps} confirmLabel="Commit" />);

      expect(screen.getByRole('button', { name: 'Commit Anyway' })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when Cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<ValidationConfirmDialog {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onViewIssues when View Issues button is clicked', () => {
      const onViewIssues = vi.fn();
      render(<ValidationConfirmDialog {...defaultProps} onViewIssues={onViewIssues} />);

      fireEvent.click(screen.getByRole('button', { name: 'View Issues' }));

      expect(onViewIssues).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn();
      render(<ValidationConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: 'Proceed Anyway' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking backdrop', () => {
      const onClose = vi.fn();
      render(<ValidationConfirmDialog {...defaultProps} onClose={onClose} />);

      // The backdrop is the element with bg-black class
      const backdrop = document.querySelector('.bg-black');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when pressing Escape key', () => {
      const onClose = vi.fn();
      render(<ValidationConfirmDialog {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have role="dialog"', () => {
      render(<ValidationConfirmDialog {...defaultProps} />);

      // There are two elements with role="dialog" - the outer container and inner dialog
      expect(screen.getAllByRole('dialog').length).toBeGreaterThanOrEqual(1);
    });

    it('should have aria-modal="true"', () => {
      render(<ValidationConfirmDialog {...defaultProps} />);

      // The outer container has the aria-labelledby attribute
      const dialogs = screen.getAllByRole('dialog');
      const outerDialog = dialogs.find((d) => d.getAttribute('aria-labelledby'));
      expect(outerDialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      render(<ValidationConfirmDialog {...defaultProps} title="Test Title" />);

      // Find the dialog with aria-labelledby (outer container)
      const dialogs = screen.getAllByRole('dialog');
      const dialogWithLabel = dialogs.find((d) => d.getAttribute('aria-labelledby'));
      expect(dialogWithLabel).toBeTruthy();

      const labelId = dialogWithLabel!.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();

      const titleElement = document.getElementById(labelId!);
      expect(titleElement).toHaveTextContent('Test Title');
    });

    it('should have aria-describedby pointing to description', () => {
      render(<ValidationConfirmDialog {...defaultProps} errorCount={1} />);

      // Find the dialog with aria-describedby (outer container)
      const dialogs = screen.getAllByRole('dialog');
      const dialogWithDesc = dialogs.find((d) => d.getAttribute('aria-describedby'));
      expect(dialogWithDesc).toBeTruthy();

      const descId = dialogWithDesc!.getAttribute('aria-describedby');
      expect(descId).toBeTruthy();

      const descElement = document.getElementById(descId!);
      expect(descElement).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('should use red styling when there are errors', () => {
      render(<ValidationConfirmDialog {...defaultProps} errorCount={1} />);

      const confirmButton = screen.getByRole('button', { name: 'Proceed Anyway' });
      expect(confirmButton).toHaveClass('bg-red-600');
    });

    it('should use yellow styling when there are only warnings', () => {
      render(<ValidationConfirmDialog {...defaultProps} warningCount={1} />);

      const confirmButton = screen.getByRole('button', { name: 'Proceed Anyway' });
      expect(confirmButton).toHaveClass('bg-yellow-600');
    });
  });
});
