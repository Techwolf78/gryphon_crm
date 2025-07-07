import React from "react";
import PropTypes from "prop-types";
import { FiFilter, FiTrendingUp, FiRefreshCw, FiUser } from "react-icons/fi";

const ClosedLeadsTable = ({
  leads,
  formatDate,
  formatCurrency,
  viewMyLeadsOnly,
}) => {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                { label: "Institution", width: "w-3/12" },
                { label: "Location", width: "w-2/12" },
                { label: "Closed Date", width: "w-2/12" },
                { label: "Actual TCV", width: "w-2/12", align: "text-right" },
                { label: "Projected TCV", width: "w-2/12", align: "text-right" },
                { label: "Owner", width: "w-3/12" },
              ].map((header) => (
                <th
                  key={header.label}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${header.width} ${header.align || "text-left"}`}
                >
                  <div className={`flex items-center ${header.align === "text-right" ? "justify-end" : "justify-start"}`}>
                    {header.label}
                    {header.label.includes("TCV") && (
                      <FiTrendingUp className="ml-1 text-gray-400" size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.length > 0 ? (
              leads.map(([id, lead]) => (
                <tr 
                  key={id} 
                  className="hover:bg-gray-50 transition-colors duration-150"
                  aria-label={`Deal with ${lead.businessName}`}
                >
                  {/* Institution */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-medium">
                        {lead.businessName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="ml-4 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                          {lead.businessName || "-"}
                        </div>
                        <div className="mt-1">
                          {lead.closureType === "new" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              New Customer
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Renewal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">
                      {lead.city || "-"}
                    </div>
                    <div className="text-xs text-gray-500">{lead.state || ""}</div>
                  </td>

                  {/* Closed Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(lead.closedDate)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {lead.closedDate && new Date(lead.closedDate).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  </td>

                  {/* Actual TCV */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(lead.totalCost)}
                    </div>
                    {lead.tcv && lead.totalCost && (
                      <div className={`text-xs ${lead.totalCost >= lead.tcv ? 'text-green-600' : 'text-amber-600'}`}>
                        {Math.round((lead.totalCost / lead.tcv) * 100)}% of projected
                      </div>
                    )}
                  </td>

                  {/* Projected TCV */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(lead.tcv)}
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium">
                        {lead.assignedTo?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "?"}
                      </div>
                      <div className="ml-3 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                          {lead.assignedTo?.name || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {lead.assignedTo?.role || ""}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="mx-auto flex flex-col items-center justify-center max-w-md">
                    <div className="p-4 bg-gray-50 rounded-full">
                      <FiFilter className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      No closed deals found
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {`There are currently no ${
                        viewMyLeadsOnly ? "your" : "team"
                      } closed deals matching your criteria.`}
                    </p>
                    <button className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <FiRefreshCw className="mr-2" />
                      Refresh view
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

ClosedLeadsTable.propTypes = {
  leads: PropTypes.array.isRequired,
  formatDate: PropTypes.func.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
};

export default ClosedLeadsTable;