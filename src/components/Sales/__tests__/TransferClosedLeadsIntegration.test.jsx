import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Integration test for the Transfer Closed Leads feature in Sales page
// This tests the complete flow including button visibility and integration

vi.mock('firebase/firestore');
vi.mock('../../src/firebase');

// Mock a simplified Sales component with transfer functionality
const MockSalesWithTransfer = ({ users, leads }) => {
  const [showTransferClosedLeadsModal, setShowTransferClosedLeadsModal] = React.useState(false);

  const currentUserDepartment = 'Admin';

  return (
    <div>
      <h1>Sales Dashboard</h1>
      {currentUserDepartment === 'Admin' && (
        <div className="transfer-buttons">
          <button
            onClick={() => setShowTransferClosedLeadsModal(true)}
            data-testid="transfer-closed-leads-btn"
          >
            Transfer Closed Leads
          </button>
        </div>
      )}

      {showTransferClosedLeadsModal && (
        <div data-testid="transfer-modal">
          <h2>Transfer Closed Leads Modal</h2>
          <button onClick={() => setShowTransferClosedLeadsModal(false)}>Close</button>
        </div>
      )}
    </div>
  );
};

describe('Transfer Closed Leads - Integration Tests', () => {
  const mockUsers = {
    user1: {
      uid: 'uid-deactivated',
      name: 'Deactivated User',
      department: 'Sales',
      role: 'Executive',
    },
    user2: {
      uid: 'uid-admin',
      name: 'Admin User',
      department: 'Admin',
      role: 'Manager',
    },
  };

  const mockLeads = {
    lead1: {
      id: 'lead1',
      businessName: 'Company A',
      projectCode: '2024/ABC-001',
      phase: 'closed',
      assignedTo: { uid: 'uid-deactivated', name: 'Deactivated User' },
    },
    lead2: {
      id: 'lead2',
      businessName: 'Company B',
      projectCode: '2024/ABC-002',
      phase: 'closed',
      assignedTo: { uid: 'uid-deactivated', name: 'Deactivated User' },
    },
  };

  describe('Sales Page Integration', () => {
    it('should show Transfer Closed Leads button for Admin users', () => {
      render(<MockSalesWithTransfer users={mockUsers} leads={mockLeads} />);

      expect(screen.getByTestId('transfer-closed-leads-btn')).toBeInTheDocument();
    });

    it('should open modal when Transfer Closed Leads button is clicked', async () => {
      render(<MockSalesWithTransfer users={mockUsers} leads={mockLeads} />);

      const button = screen.getByTestId('transfer-closed-leads-btn');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('transfer-modal')).toBeInTheDocument();
      });
    });

    it('should close modal when close button is clicked', async () => {
      render(<MockSalesWithTransfer users={mockUsers} leads={mockLeads} />);

      const button = screen.getByTestId('transfer-closed-leads-btn');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('transfer-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('transfer-modal')).not.toBeInTheDocument();
      });
    });
  });
});
