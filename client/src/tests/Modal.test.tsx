/**
 * Modal Component Tests
 * 
 * Tests the basic modal behavior:
 * 1. Renders when isOpen is true
 * 2. Does not render when isOpen is false
 * 3. Calls onClose when X button clicked
 * 4. Prevents background click from closing (when configured)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { ReactNode } from 'react';

// Simple Modal component for testing
// (This represents the pattern used in DevOrbit modals)
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeOnBackdropClick?: boolean;
}

function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  closeOnBackdropClick = false 
}: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-backdrop" 
      data-testid="modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="modal-content" data-testid="modal-content">
        <div className="modal-header">
          <h2 data-testid="modal-title">{title}</h2>
          <button 
            onClick={onClose} 
            aria-label="Close modal"
            data-testid="modal-close-button"
          >
            ✕
          </button>
        </div>
        <div className="modal-body" data-testid="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

describe('Modal', () => {
  describe('Visibility', () => {
    it('renders when isOpen is true', () => {
      const onClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      // Modal should be visible
      expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Test Modal');
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      const onClose = vi.fn();

      render(
        <Modal isOpen={false} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      // Modal should not be visible
      expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument();
      expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('toggles visibility when isOpen changes', () => {
      const onClose = vi.fn();

      const { rerender } = render(
        <Modal isOpen={false} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      // Initially not visible
      expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument();

      // Re-render with isOpen=true
      rerender(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      // Now visible
      expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();

      // Re-render with isOpen=false
      rerender(
        <Modal isOpen={false} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      // Hidden again
      expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('calls onClose when X button clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      // Click the close button
      const closeButton = screen.getByTestId('modal-close-button');
      await user.click(closeButton);

      // onClose should have been called
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('close button is accessible with aria-label', () => {
      const onClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Backdrop Click', () => {
    it('prevents background click from closing by default', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      // Click the backdrop
      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);

      // onClose should NOT have been called (default behavior)
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes on backdrop click when closeOnBackdropClick is true', async () => {
      const onClose = vi.fn();

      render(
        <Modal 
          isOpen={true} 
          onClose={onClose} 
          title="Test Modal"
          closeOnBackdropClick={true}
        >
          <p>Modal content</p>
        </Modal>
      );

      // Click the backdrop directly
      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);

      // onClose should have been called
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking modal content even with closeOnBackdropClick', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <Modal 
          isOpen={true} 
          onClose={onClose} 
          title="Test Modal"
          closeOnBackdropClick={true}
        >
          <p>Modal content</p>
        </Modal>
      );

      // Click the modal content (not the backdrop)
      const content = screen.getByTestId('modal-content');
      await user.click(content);

      // onClose should NOT have been called (click was on content, not backdrop)
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Content Rendering', () => {
    it('renders title correctly', () => {
      const onClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="My Custom Title">
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByTestId('modal-title')).toHaveTextContent('My Custom Title');
    });

    it('renders children correctly', () => {
      const onClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Test">
          <div data-testid="custom-content">
            <h3>Header</h3>
            <p>Paragraph</p>
            <button>Action</button>
          </div>
        </Modal>
      );

      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('renders complex form content', () => {
      const onClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Form Modal">
          <form data-testid="modal-form">
            <input type="text" placeholder="Name" />
            <input type="email" placeholder="Email" />
            <button type="submit">Submit</button>
          </form>
        </Modal>
      );

      expect(screen.getByTestId('modal-form')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });
  });

  describe('Multiple Modals', () => {
    it('can render multiple modals independently', () => {
      const onClose1 = vi.fn();
      const onClose2 = vi.fn();

      render(
        <>
          <Modal isOpen={true} onClose={onClose1} title="Modal 1">
            <p>Content 1</p>
          </Modal>
          <Modal isOpen={true} onClose={onClose2} title="Modal 2">
            <p>Content 2</p>
          </Modal>
        </>
      );

      expect(screen.getByText('Modal 1')).toBeInTheDocument();
      expect(screen.getByText('Modal 2')).toBeInTheDocument();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });
});
