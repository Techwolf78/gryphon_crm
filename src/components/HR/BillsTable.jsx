import React from "react";
import { FiSearch, FiEdit, FiEye } from "react-icons/fi";

const BillsTable = ({
  filteredBills,
  getStatusBadge,
  openModal,
  openTrainerDetails
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
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
            {filteredBills.map((bill) => (
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
                  <button
                    onClick={() => openModal(bill)}
                    className="text-blue-600 hover:text-blue-800 mr-4 transition-colors"
                    aria-label="Review bill"
                  >
                    <FiEdit className="inline mr-1 h-4 w-4" /> Review
                  </button>
                  <button
                    onClick={() => openTrainerDetails(bill)}
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                    aria-label="View bill details"
                  >
                    <FiEye className="inline mr-1 h-4 w-4" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredBills.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <FiSearch className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-500 text-lg font-medium">No bills found</p>
          <p className="text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default BillsTable;
