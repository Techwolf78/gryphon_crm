import React, { useState } from 'react';
import { FaToggleOn, FaToggleOff } from 'react-icons/fa';

const ClosedLeads = ({ leads, users }) => {
  const [showRenewal, setShowRenewal] = useState(true);
  
  // Filter leads based on closure type
  const filteredLeads = Object.entries(leads).filter(([, lead]) => {
    if (showRenewal) {
      return lead.phase === 'closed' && lead.closureType === 'renewal';
    }
    return lead.phase === 'closed' && lead.closureType === 'new';
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Closed Leads</h2>
        <div className="flex items-center space-x-4">
          <span className={`font-medium ${showRenewal ? 'text-gray-600' : 'text-gray-400'}`}>
            New
          </span>
          <button 
            onClick={() => setShowRenewal(!showRenewal)}
            className="text-gray-600 focus:outline-none"
          >
            {showRenewal ? (
              <FaToggleOn className="text-green-500 text-2xl" />
            ) : (
              <FaToggleOff className="text-gray-400 text-2xl" />
            )}
          </button>
          <span className={`font-medium ${showRenewal ? 'text-green-600' : 'text-gray-600'}`}>
            Renewal
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                College Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                City
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Closed Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLeads.length > 0 ? (
              filteredLeads.map(([id, lead]) => (
                <tr key={id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lead.businessName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.city || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.closedDate || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.amount ? `₹${lead.amount}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.assignedTo?.name || '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                  No {showRenewal ? 'renewal' : 'new'} closed leads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClosedLeads;