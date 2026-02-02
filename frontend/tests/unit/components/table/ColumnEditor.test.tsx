/**
 * Unit tests for ColumnEditor Component
 * Tests column editing functionality and required field validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColumnEditor } from '@/components/table/ColumnEditor';
import type { Column } from '@/types/table';

describe('ColumnEditor', () => {
  const defaultColumn: Column = {
    id: 'col-1',
    table_id: 'table-1',
    name: 'user_id',
    data_type: 'UUID',
    nullable: false,
    is_primary_key: true,
    is_foreign_key: false,
    ordinal_position: 1,
    created_at: '2025-01-01T00:00:00Z',
    last_modified_at: '2025-01-01T00:00:00Z',
  };

  const defaultProps = {
    column: defaultColumn,
    onChange: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render column name input', () => {
      render(<ColumnEditor {...defaultProps} />);

      expect(screen.getByDisplayValue('user_id')).toBeInTheDocument();
    });

    it('should render data type display', () => {
      render(<ColumnEditor {...defaultProps} />);

      expect(screen.getByText('UUID')).toBeInTheDocument();
    });

    it('should render nullable checkbox', () => {
      render(<ColumnEditor {...defaultProps} />);

      expect(screen.getByLabelText('Nullable')).toBeInTheDocument();
    });

    it('should render primary key checkbox', () => {
      render(<ColumnEditor {...defaultProps} />);

      expect(screen.getByLabelText('Primary key')).toBeInTheDocument();
    });

    it('should render foreign key checkbox', () => {
      render(<ColumnEditor {...defaultProps} />);

      expect(screen.getByLabelText('Foreign key')).toBeInTheDocument();
    });

    it('should render unique index checkbox', () => {
      render(<ColumnEditor {...defaultProps} />);

      expect(screen.getByLabelText('Unique index')).toBeInTheDocument();
    });

    it('should render delete button when onDelete is provided', () => {
      render(<ColumnEditor {...defaultProps} />);

      expect(screen.getByLabelText('Delete column')).toBeInTheDocument();
    });

    it('should not render delete button when onDelete is not provided', () => {
      render(<ColumnEditor {...defaultProps} onDelete={undefined} />);

      expect(screen.queryByLabelText('Delete column')).not.toBeInTheDocument();
    });
  });

  describe('name validation', () => {
    it('should show error when name is empty', () => {
      render(<ColumnEditor {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('user_id');
      fireEvent.change(nameInput, { target: { value: '' } });

      expect(screen.getByText('Column name is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Column name is required');
    });

    it('should show error when name contains only whitespace', () => {
      render(<ColumnEditor {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('user_id');
      fireEvent.change(nameInput, { target: { value: '   ' } });

      expect(screen.getByText('Column name is required')).toBeInTheDocument();
    });

    it('should show error for invalid column name format', () => {
      render(<ColumnEditor {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('user_id');
      fireEvent.change(nameInput, { target: { value: 'Invalid Name!' } });

      expect(
        screen.getByText('Column name must be alphanumeric with underscores only')
      ).toBeInTheDocument();
    });

    it('should show error for column name with spaces', () => {
      render(<ColumnEditor {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('user_id');
      fireEvent.change(nameInput, { target: { value: 'user name' } });

      expect(
        screen.getByText('Column name must be alphanumeric with underscores only')
      ).toBeInTheDocument();
    });

    it('should not show error for valid column name', () => {
      render(<ColumnEditor {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('user_id');
      fireEvent.change(nameInput, { target: { value: 'valid_column_name' } });

      expect(screen.queryByText('Column name is required')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Column name must be alphanumeric with underscores only')
      ).not.toBeInTheDocument();
    });

    it('should not call onChange when name is invalid', () => {
      const onChange = vi.fn();
      render(<ColumnEditor {...defaultProps} onChange={onChange} />);

      const nameInput = screen.getByDisplayValue('user_id');
      fireEvent.change(nameInput, { target: { value: '' } });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should call onChange with valid name', () => {
      const onChange = vi.fn();
      render(<ColumnEditor {...defaultProps} onChange={onChange} />);

      const nameInput = screen.getByDisplayValue('user_id');
      fireEvent.change(nameInput, { target: { value: 'new_column_name' } });

      expect(onChange).toHaveBeenCalledWith({ name: 'new_column_name' });
    });

    it('should set aria-invalid when name is invalid', () => {
      render(<ColumnEditor {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('user_id');
      fireEvent.change(nameInput, { target: { value: '' } });

      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('should have aria-describedby pointing to error message', () => {
      render(<ColumnEditor {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('user_id');
      fireEvent.change(nameInput, { target: { value: '' } });

      const ariaDescribedBy = nameInput.getAttribute('aria-describedby');
      expect(ariaDescribedBy).toBeTruthy();

      const errorElement = document.getElementById(ariaDescribedBy!);
      expect(errorElement).toHaveTextContent('Column name is required');
    });

    it('should apply error styling to input when name is invalid', () => {
      render(<ColumnEditor {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('user_id');
      fireEvent.change(nameInput, { target: { value: '' } });

      expect(nameInput).toHaveClass('border-red-500');
    });
  });

  describe('checkbox interactions', () => {
    it('should call onChange when nullable is toggled', () => {
      const onChange = vi.fn();
      render(<ColumnEditor {...defaultProps} onChange={onChange} />);

      const nullableCheckbox = screen.getByLabelText('Nullable');
      fireEvent.click(nullableCheckbox);

      expect(onChange).toHaveBeenCalledWith({ nullable: true });
    });

    it('should call onChange when primary key is toggled', () => {
      const onChange = vi.fn();
      render(
        <ColumnEditor
          {...defaultProps}
          onChange={onChange}
          column={{ ...defaultColumn, is_primary_key: false }}
        />
      );

      const pkCheckbox = screen.getByLabelText('Primary key');
      fireEvent.click(pkCheckbox);

      expect(onChange).toHaveBeenCalledWith({ is_primary_key: true });
    });

    it('should call onChange when foreign key is toggled', () => {
      const onChange = vi.fn();
      render(<ColumnEditor {...defaultProps} onChange={onChange} />);

      const fkCheckbox = screen.getByLabelText('Foreign key');
      fireEvent.click(fkCheckbox);

      expect(onChange).toHaveBeenCalledWith({ is_foreign_key: true });
    });

    it('should call onChange when unique index is toggled', () => {
      const onChange = vi.fn();
      render(<ColumnEditor {...defaultProps} onChange={onChange} />);

      const uniqueCheckbox = screen.getByLabelText('Unique index');
      fireEvent.click(uniqueCheckbox);

      expect(onChange).toHaveBeenCalledWith({ is_unique: true });
    });
  });

  describe('delete', () => {
    it('should call onDelete when delete button is clicked', () => {
      const onDelete = vi.fn();
      render(<ColumnEditor {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByLabelText('Delete column');
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncing with prop changes', () => {
    it('should update local state when column prop changes', () => {
      const { rerender } = render(<ColumnEditor {...defaultProps} />);

      expect(screen.getByDisplayValue('user_id')).toBeInTheDocument();

      rerender(
        <ColumnEditor {...defaultProps} column={{ ...defaultColumn, name: 'updated_name' }} />
      );

      expect(screen.getByDisplayValue('updated_name')).toBeInTheDocument();
    });
  });
});
