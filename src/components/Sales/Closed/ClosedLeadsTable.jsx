
import React, { useState, useEffect } from "react";
import { FiFilter, FiMoreVertical } from "react-icons/fi";
import PropTypes from "prop-types";
import TrainingForm from "../ClosureForm/TrainingForm";
import { db } from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";

const displayProjectCode = (code) => code.replace(/-/g, "/");

const ClosedLeadsTable = ({
  leads,
  formatDate,
  formatCurrency,
  viewMyLeadsOnly,
  users,
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [existingFormData, setExistingFormData] = useState(null);
  const [loadingFormData, setLoadingFormData] = useState(false);

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const fetchExistingFormData = async (projectCode) => {
    if (!projectCode) return null;
    
    try {
      setLoadingFormData(true);
      const docId = projectCode.replace(/\//g, "-");
      const docRef = doc(db, "trainingForms", docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching existing form data:", error);
      return null;
    } finally {
      setLoadingFormData(false);
    }
  };

  const handleReuploadClosure = async (lead) => {
    if (!lead.projectCode) {
      console.error("Lead has no project code");
      return;
    }

    const formData = await fetchExistingFormData(lead.projectCode);
    setExistingFormData(formData);
    setSelectedLead(lead);
    setShowTrainingForm(true);
    setOpenDropdown(null);
  };

  const handleCloseTrainingForm = () => {
    setShowTrainingForm(false);
    setSelectedLead(null);
    setExistingFormData(null);
  };

  return (
    <div className="overflow-x-auto">
      {/* Training Form Modal */}
      {showTrainingForm && selectedLead && (
        <TrainingForm
          show={showTrainingForm}
          onClose={handleCloseTrainingForm}
          lead={selectedLead}
          users={users}
          existingFormData={existingFormData} // Pass the fetched data
          isLoading={loadingFormData}
        />
      )}

      {/* Table */}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[
              "Project Code",
              "Institution",
              "Location",
              "Closed Date",
              "Actual TCV",
              "Projected TCV",
              "Owner",
              "Actions",
            ].map((h) => (
              <th
                key={h}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.length > 0 ? (
            leads.map(([id, lead]) => (
              <tr key={id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {displayProjectCode(lead.projectCode) || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                      {lead.businessName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900 truncate max-w-xs">
                        {lead.businessName || "-"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {lead.closureType === "new" ? (
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
                  <div className="text-sm text-gray-900">
                    {lead.city || "-"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {lead.state || ""}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(lead.closedDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {formatCurrency(lead.totalCost)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {formatCurrency(lead.tcv)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium flex-shrink-0">
                      {lead.assignedTo?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </div>
                    <div className="ml-3 text-sm font-medium text-gray-900 truncate max-w-xs">
                      {lead.assignedTo?.name || "-"}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                  <button
                    onClick={() => toggleDropdown(id)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <FiMoreVertical className="h-5 w-5" />
                  </button>
                  {openDropdown === id && (
                    <div className="origin-top-right absolute right-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div
                        className="py-1"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="options-menu"
                      >
                        <button
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                          role="menuitem"
                          onClick={() => handleReuploadClosure(lead)}
                        >
                          Reupload the Closure Form
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="py-12 text-center">
                <FiFilter className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 font-medium text-gray-900">
                  No closed deals found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {`There are currently no ${
                    viewMyLeadsOnly ? "your" : "team"
                  } closed deals.`}
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

ClosedLeadsTable.propTypes = {
  leads: PropTypes.array.isRequired,
  formatDate: PropTypes.func.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
  users: PropTypes.object, // Add users to propTypes
};

export default ClosedLeadsTable;