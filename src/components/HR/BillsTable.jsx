import React, { useState } from "react";
import { FiSearch, FiEdit, FiEye, FiCheckCircle, FiXCircle, FiClock, FiX } from "react-icons/fi";

const BillsTable = ({
  bills,
  onViewDetails,
  onAction
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedBillForRejection, setSelectedBillForRejection] = useState(null);
  const [rejectionRemarks, setRejectionRemarks] = useState("");

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: "bg-amber-50 text-amber-700 border border-amber-200",
      approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      rejected: "bg-rose-50 text-rose-700 border border-rose-200"
    };
    
    const statusIcons = {
      pending: <FiClock className="mr-1 h-3 w-3" />,
      approved: <FiCheckCircle className="mr-1 h-3 w-3" />,
      rejected: <FiXCircle className="mr-1 h-3 w-3" />
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusClasses[status]}`}>
        {statusIcons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleRejectClick = (bill) => {
    setSelectedBillForRejection(bill);
    setRejectionRemarks("");
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    if (selectedBillForRejection && rejectionRemarks.trim()) {
      onAction(selectedBillForRejection, 'rejected', rejectionRemarks.trim());
      setShowRejectModal(false);
      setSelectedBillForRejection(null);
      setRejectionRemarks("");
    }
  };

  const handleRejectCancel = () => {
    setShowRejectModal(false);
    setSelectedBillForRejection(null);
    setRejectionRemarks("");
  };
  return (
    <div className="py-2">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
      <div className="overflow-visible">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trainer & Course
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                College
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours & Rate
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bills.map((bill) => (
              <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{bill.trainerName}</div>
                  <div className="text-sm text-gray-600">{bill.course}</div>
                  <div className="text-xs text-gray-400">{bill.batch}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{bill.collegeName}</div>
                  <div className="text-xs text-gray-500">ID: {bill.trainerId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{bill.hours} hours</div>
                  <div className="text-sm text-gray-500">₹{bill.rate}/hour</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">₹{bill.totalAmount.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(bill.submittedDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(bill.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onViewDetails(bill)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      title="View Details"
                      data-tour="view-details"
                    >
                      <FiEye className="mr-1 h-3 w-3" />
                      View
                    </button>
                    <button
                      onClick={() => onAction(bill, 'approved')}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                      title="Approve Bill"
                      data-tour="approve-bill"
                    >
                      <FiCheckCircle className="mr-1 h-3 w-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectClick(bill)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                      title="Reject Bill"
                      data-tour="reject-bill"
                    >
                      <FiXCircle className="mr-1 h-3 w-3" />
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bills.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <FiSearch className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-500 text-lg font-medium">No bills found</p>
          <p className="text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-2">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto border border-gray-200 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <FiXCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Reject Bill</h3>
                  <p className="text-xs text-gray-600">Please provide a reason for rejection</p>
                </div>
              </div>
              <button
                onClick={handleRejectCancel}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors flex-shrink-0"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
            
            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3">
              {/* Bill Info */}
              {selectedBillForRejection && (
                <div className="bg-gray-50 rounded p-2 mb-3">
                  <div className="text-xs text-gray-600 mb-1">Bill Details</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-900">Trainer:</span>
                      <div className="text-gray-700">{selectedBillForRejection.trainerName}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Amount:</span>
                      <div className="text-gray-700">₹{selectedBillForRejection.totalAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">College:</span>
                      <div className="text-gray-700">{selectedBillForRejection.collegeName}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Remarks Input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rejection Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  placeholder="Please provide a detailed reason for rejecting this bill..."
                  className="w-full px-2 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none transition-colors text-sm"
                  rows={3}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be recorded and may be visible to the trainer.
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end space-x-2 p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
              <button
                onClick={handleRejectCancel}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectionRemarks.trim()}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed rounded transition-colors flex items-center space-x-1"
              >
                <FiXCircle className="w-3 h-3" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default BillsTable;
