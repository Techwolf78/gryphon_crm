import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TransferClosedLeadsModal from '../TransferClosedLeadsModal';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  writeBatch: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

vi.mock('../../../firebase', () => ({
  db: {},
}));

// Mock data
const mockUsers = {
  user1: {
    uid: 'uid-deactivated',
    name: 'John Deactivated',
    department: 'Sales',
    role: 'Executive',
  },
  user2: {
    uid: 'uid-admin',
    name: 'Admin User',
    department: 'Admin',
    role: 'Manager',
  },
  user3: {
    uid: 'uid-sales',
    name: 'Sales Person',
    department: 'Sales',
    role: 'Executive',
  },
};

const mockLeads = {
  lead1: {
    id: 'lead1',
    businessName: 'Company A',
    phase: 'closed',
    assignedTo: { uid: 'uid-deactivated', name: 'John Deactivated', role: 'Executive' },
  },
  lead2: {
    id: 'lead2',
    businessName: 'Company B',
    phase: 'closed',
    assignedTo: { uid: 'uid-deactivated', name: 'John Deactivated', role: 'Executive' },
  },
  lead3: {
    id: 'lead3',
    businessName: 'Company C',
    phase: 'hot',
    assignedTo: { uid: 'uid-deactivated', name: 'John Deactivated', role: 'Executive' },
  },
};

describe('TransferClosedLeadsModal Component', () => {
  let mockOnClose;

  beforeEach(() => {
    mockOnClose = vi.fn();
    vi.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('should render PIN input when modal is open', () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      expect(screen.getByText('🔐 Enter Security PIN')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••')).toBeInTheDocument();
    });

    it('should not render when show is false', () => {
      const { container } = render(
        <TransferClosedLeadsModal
          show={false}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should close modal when X button is clicked', async () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when cancel button is clicked', async () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('PIN Input Handling', () => {
    it('should accept numeric input for PIN', async () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const pinInput = screen.getByPlaceholderText('••••');
      await userEvent.type(pinInput, '5878');

      expect(pinInput.value).toBe('5878');
    });

    it('should limit PIN to 4 digits', async () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const pinInput = screen.getByPlaceholderText('••••');
      await userEvent.type(pinInput, '587899');

      expect(pinInput.value).toBe('5878');
    });

    it('should mask PIN input with password type', () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const pinInput = screen.getByPlaceholderText('••••');
      expect(pinInput.type).toBe('password');
    });

    it('should disable verify button when PIN is empty', () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const verifyButton = screen.getByText('Verify PIN');
      expect(verifyButton).toBeDisabled();
    });

    it('should enable verify button when 4 digits entered', async () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const pinInput = screen.getByPlaceholderText('••••');
      const verifyButton = screen.getByText('Verify PIN');

      await userEvent.type(pinInput, '5878');
      expect(verifyButton).not.toBeDisabled();
    });
  });

  describe('PIN Verification', () => {
    it('should show error on wrong PIN', async () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const pinInput = screen.getByPlaceholderText('••••');
      const verifyButton = screen.getByText('Verify PIN');

      await userEvent.type(pinInput, '1234');
      fireEvent.click(verifyButton);

      await waitFor(
        () => {
          expect(screen.getByText('❌ Incorrect PIN. Access denied.')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should accept PIN 5878 as correct', async () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const pinInput = screen.getByPlaceholderText('••••');
      const verifyButton = screen.getByText('Verify PIN');

      await userEvent.type(pinInput, '5878');
      fireEvent.click(verifyButton);

      await waitFor(
        () => {
          expect(screen.getByText('👤 From (Deactivated/Source User)')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('UI Elements & Content', () => {
    it('should display security warning message', () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      expect(screen.getByText(/This action is restricted/i)).toBeInTheDocument();
    });

    it('should display correct button labels', () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      expect(screen.getByText('Verify PIN')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should have styled header element', () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      // Check that header title is rendered
      expect(screen.getByText('🔐 Enter Security PIN')).toBeInTheDocument();
      // Check that close button is present in header  
      expect(screen.getByText('✕')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('should accept and use show prop', () => {
      const { rerender } = render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      expect(screen.getByText('🔐 Enter Security PIN')).toBeInTheDocument();

      rerender(
        <TransferClosedLeadsModal
          show={false}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      expect(screen.queryByText('🔐 Enter Security PIN')).not.toBeInTheDocument();
    });

    it('should handle users prop correctly', () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      expect(screen.getByText('🔐 Enter Security PIN')).toBeInTheDocument();
    });

    it('should handle leads prop correctly', () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      expect(screen.getByText('🔐 Enter Security PIN')).toBeInTheDocument();
    });

    it('should call onClose prop when close is triggered', () => {
      const onCloseSpy = vi.fn();
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={onCloseSpy}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(onCloseSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty users object', () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={{}}
          leads={mockLeads}
        />
      );

      expect(screen.getByText('🔐 Enter Security PIN')).toBeInTheDocument();
    });

    it('should handle empty leads object', () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={{}}
        />
      );

      expect(screen.getByText('🔐 Enter Security PIN')).toBeInTheDocument();
    });

    it('should render without error when users and leads are provided', () => {
      const { container } = render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      expect(container).toBeInTheDocument();
      expect(screen.getByText('🔐 Enter Security PIN')).toBeInTheDocument();
    });
  });

  describe('Security Features', () => {
    it('should require PIN 5878 for access', async () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const pinInput = screen.getByPlaceholderText('••••');
      const verifyButton = screen.getByText('Verify PIN');

      // Wrong PIN should fail
      await userEvent.type(pinInput, '0000');
      fireEvent.click(verifyButton);

      await waitFor(
        () => {
          expect(screen.getByText('❌ Incorrect PIN. Access denied.')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should mask PIN in password field', () => {
      render(
        <TransferClosedLeadsModal
          show={true}
          onClose={mockOnClose}
          users={mockUsers}
          leads={mockLeads}
        />
      );

      const pinInput = screen.getByPlaceholderText('••••');
      expect(pinInput).toHaveAttribute('type', 'password');
    });
  });
});
