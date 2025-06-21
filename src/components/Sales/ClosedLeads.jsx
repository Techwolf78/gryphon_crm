import React, { useState } from 'react';
import { FiFilter, FiDollarSign, FiCalendar, FiMapPin, FiUser, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const ClosedLeads = ({ leads, users }) => {
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // Filter leads based on selection
  const filteredLeads = Object.entries(leads).filter(([, lead]) => {
    if (lead.phase !== 'closed') return false;
    if (filterType === 'all') return true;
    return lead.closureType === filterType;
  });

  // Pagination calculations
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredLeads.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      {/* Header with filter controls */}
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Closed Deals</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filterType === 'all' ? 'All closed deals' : 
             filterType === 'new' ? 'New customer acquisitions' : 'Renewal contracts'}
          </p>
        </div>
        
        <div className="flex items-center bg-gray-50 rounded-lg p-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              filterType === 'all' 
                ? 'bg-white shadow-sm text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('new')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              filterType === 'new' 
                ? 'bg-white shadow-sm text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            New
          </button>
          <button
            onClick={() => setFilterType('renewal')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              filterType === 'renewal' 
                ? 'bg-white shadow-sm text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Renewals
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-5 bg-gray-50 border-b border-gray-100">
        <div className="bg-white p-4 rounded-lg shadow-xs border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-50 text-blue-600">
              <FiDollarSign size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-xl font-semibold text-gray-900">
                ₹{filteredLeads.reduce((sum, [, lead]) => sum + (lead.amount || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-xs border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-50 text-green-600">
              <FiCalendar size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Deals</p>
              <p className="text-xl font-semibold text-gray-900">
                {filteredLeads.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-xs border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-50 text-purple-600">
              <FiUser size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Clients</p>
              <p className="text-xl font-semibold text-gray-900">
                {new Set(filteredLeads.map(([, lead]) => lead.businessName)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <FiUser className="mr-2" size={14} />
                  Institution
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <FiMapPin className="mr-2" size={14} />
                  Location
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <FiCalendar className="mr-2" size={14} />
                  Closed Date
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <FiDollarSign className="mr-2" size={14} />
                  Amount
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentRows.length > 0 ? (
              currentRows.map(([id, lead]) => (
                <tr key={id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                        {lead.businessName?.charAt(0) || '?'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {lead.businessName || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {lead.closureType === 'new' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              New
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Renewal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lead.city || '-'}</div>
                    <div className="text-xs text-gray-500">{lead.state || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {lead.closedDate ? new Date(lead.closedDate).toLocaleDateString() : '-'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {lead.closedDate ? new Date(lead.closedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {lead.amount ? `₹${lead.amount.toLocaleString()}` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium">
                        {lead.assignedTo?.name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {lead.assignedTo?.name || '-'}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <FiFilter className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No closed deals found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {filterType === 'all' 
                        ? 'There are currently no closed deals in the system.' 
                        : `No ${filterType} closed deals found.`}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredLeads.length > rowsPerPage && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{indexOfFirstRow + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(indexOfLastRow, filteredLeads.length)}
            </span> of{' '}
            <span className="font-medium">{filteredLeads.length}</span> results
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md border text-sm font-medium flex items-center ${
                currentPage === 1 
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiChevronLeft className="mr-1" size={16} />
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md border text-sm font-medium flex items-center ${
                currentPage === totalPages
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
              <FiChevronRight className="ml-1" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClosedLeads;