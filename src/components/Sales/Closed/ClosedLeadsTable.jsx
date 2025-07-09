import React, { useState } from "react";
import { FiFilter } from "react-icons/fi";
import PropTypes from "prop-types";



const ClosedLeadsTable = ({
  leads,
  formatDate,
  formatCurrency,
  viewMyLeadsOnly,
  onReupload,
}) => {
  const [studentFileName, setStudentFileName] = useState("");
  const [mouFileName, setMouFileName] = useState("");
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[
              "Institution",
              "Location",
              "Closed Date",
              "Actual TCV",
              "Projected TCV",
              "Owner",
              "Upload Files",
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
                {/* Institution */}
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

                {/* Location */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{lead.city || "-"}</div>
                  <div className="text-xs text-gray-500">{lead.state || ""}</div>
                </td>

                {/* Closed Date */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(lead.closedDate)}
                </td>

                {/* Actual TCV */}
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {formatCurrency(lead.totalCost)}
                </td>

                {/* Projected TCV */}
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {formatCurrency(lead.tcv)}
                </td>

                {/* Owner */}
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

                {/* Upload Files */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {/* Upload Student File */}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setStudentFileName(file.name); // ✅ Show in UI
                        onReupload(file, "student", id);
                      }
                    }}
                    className="block w-full text-xs mt-1 mb-1"
                  />
                  {studentFileName && (
                    <p className="text-xs text-gray-600 truncate">📎 {studentFileName}</p>
                  )}


                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setMouFileName(file.name); // ✅ Show in UI
                        onReupload(file, "mou", lead.projectCode || id);
                      }
                    }}
                    className="block w-full text-xs"
                  />
                  {mouFileName && (
                    <p className="text-xs text-gray-600 truncate">📎 {mouFileName}</p>
                  )}

                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="py-12 text-center">
                <FiFilter className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 font-medium text-gray-900">
                  No closed deals found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {`There are currently no ${viewMyLeadsOnly ? "your" : "team"} closed deals.`}
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
  onReupload: PropTypes.func.isRequired,
};

export default ClosedLeadsTable;
