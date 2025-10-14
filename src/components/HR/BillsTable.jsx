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
    const statusConfig = {
      pending: {
        bg: "bg-gradient-to-r from-amber-50 to-amber-100",
        text: "text-amber-800",
        border: "border-amber-200",
        icon: FiClock,
        label: "Pending"
      },
      generated: {
        bg: "bg-gradient-to-r from-amber-50 to-amber-100",
        text: "text-amber-800",
        border: "border-amber-200",
        icon: FiClock,
        label: "Pending"
      },
      approved: {
        bg: "bg-gradient-to-r from-emerald-50 to-emerald-100",
        text: "text-emerald-800",
        border: "border-emerald-200",
        icon: FiCheckCircle,
        label: "Approved"
      },
      rejected: {
        bg: "bg-gradient-to-r from-red-50 to-red-100",
        text: "text-red-800",
        border: "border-red-200",
        icon: FiXCircle,
        label: "Rejected"
      },
      onHold: {
        bg: "bg-gradient-to-r from-slate-50 to-slate-100",
        text: "text-slate-800",
        border: "border-slate-200",
        icon: FiClock,
        label: "On Hold"
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border} shadow-sm`}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const handleRejectClick = (bill) => {
    setSelectedBillForRejection(bill);
    setRejectionRemarks("");
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    if (selectedBillForRejection) {
      const remarks = rejectionRemarks.trim();
      const finalRemarks = remarks || 'No remarks provided';
      console.log('Rejecting bill with remarks:', finalRemarks);
      onAction(selectedBillForRejection, 'rejected', finalRemarks);
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
    <div className="min-h-screen bg-gray-50/50">
      <div className="w-full space-y-3">
        {/* Bills Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
          {/* Responsive Table View */}
          <div className="overflow-x-auto rounded-xl border border-slate-200/60 shadow-sm">
            <table className="min-w-full divide-y divide-slate-200/60">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200/60">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[100px]">
                    Trainer
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[110px]">
                    College
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[120px]">
                    Invoice No.
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-auto">
                    Hours & Rate
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-auto">
                    Amount
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[80px]">
                    Submitted
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[160px]">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[140px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/50 transition-all duration-200 group">
                    <td className="px-2 py-3">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg flex items-center justify-center mr-2">
                          <span className="text-xs font-semibold text-white">
                            {bill.trainerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="max-w-[120px]">
                          <div className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors" title={bill.trainerName}>
                            {bill.trainerName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="max-w-[140px] overflow-hidden">
                        <div className="text-sm text-slate-900 font-medium truncate group-hover:text-slate-700 transition-colors" title={bill.collegeName}>
                          {bill.collegeName}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">ID: {bill.trainerId}</div>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="text-xs font-semibold text-slate-900 tabular-nums min-w-[100px] max-w-[120px] truncate" title={bill.billNumber}>
                        {bill.billNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="text-sm text-slate-900 font-medium min-w-[80px] max-w-[100px] truncate">{bill.hours} hours</div>
                      <div className="text-xs text-slate-500 truncate">₹{bill.rate}/hr</div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="text-sm font-bold text-slate-900 tabular-nums min-w-[80px] max-w-[100px] truncate">₹{bill.amount.toLocaleString()}</div>
                    </td>
                    <td className="px-2 py-3 text-sm text-slate-600 font-medium">
                      <div className="flex flex-col min-w-[70px] max-w-[80px]">
                        <span className="truncate">{new Date(bill.submittedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span className="text-xs text-slate-400 truncate">{new Date(bill.submittedDate).getFullYear()}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      {getStatusBadge(bill.status)}
                    </td>
                    <td className="px-2 py-3 text-sm font-medium text-right">
                      <div className="flex items-center justify-end space-x-1 min-w-[140px] max-w-[160px]">
                        <button
                          onClick={() => onViewDetails(bill)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-all duration-200 hover:shadow-sm"
                          title="View Details"
                        >
                          <FiEye className="mr-1 h-3 w-3" />
                          View
                        </button>
                        {bill.status === 'approved' && (
                          <button
                            disabled
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-emerald-800 bg-emerald-100 rounded cursor-not-allowed"
                            title="Bill Already Approved"
                          >
                            <FiCheckCircle className="mr-1 h-3 w-3" />
                            Approved
                          </button>
                        )}
                        {bill.status === 'rejected' && (
                          <button
                            disabled
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded cursor-not-allowed"
                            title="Bill Already Rejected"
                          >
                            <FiXCircle className="mr-1 h-3 w-3" />
                            Rejected
                          </button>
                        )}
                        {(bill.status === 'pending' || bill.status === 'generated') && (
                          <>
                            <button
                              onClick={() => onAction(bill, 'approved')}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Approve Bill"
                            >
                              <FiCheckCircle className="mr-1 h-3 w-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectClick(bill)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Reject Bill"
                            >
                              <FiXCircle className="mr-1 h-3 w-3" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {bills.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <FiSearch className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                No bills found
              </h3>
              <p className="text-gray-500 text-xs">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}

          {/* Table Footer with Summary */}
          {bills.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50/50 px-2 py-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">
                    Total Bills: <span className="font-semibold text-gray-900">{bills.length}</span>
                  </span>
                  <span className="text-gray-600">
                    Pending: <span className="font-semibold text-amber-600">{bills.filter(b => b.status === 'generated' || b.status === 'pending').length}</span>
                  </span>
                  <span className="text-gray-600">
                    Approved: <span className="font-semibold text-emerald-600">{bills.filter(b => b.status === 'approved').length}</span>
                  </span>
                  <span className="text-gray-600">
                    Rejected: <span className="font-semibold text-rose-600">{bills.filter(b => b.status === 'rejected').length}</span>
                  </span>
                </div>
                <div className="text-gray-600">
                  Total Amount: <span className="font-bold text-gray-900">₹{bills.reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rejection Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2" style={{ zIndex: 9999 }}>
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
                        <div className="text-gray-700">₹{selectedBillForRejection.amount.toLocaleString()}</div>
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
                    Rejection Remarks (Optional)
                  </label>
                  <textarea
                    value={rejectionRemarks}
                    onChange={(e) => setRejectionRemarks(e.target.value)}
                    placeholder="Please provide a detailed reason for rejecting this bill..."
                    className="w-full px-2 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none transition-colors text-sm"
                    rows={3}
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
                  disabled={!selectedBillForRejection}
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
