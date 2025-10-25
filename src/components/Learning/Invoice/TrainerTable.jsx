import React from "react";
import { FiChevronUp, FiChevronDown, FiHome, 
  FiUsers  } from "react-icons/fi";

import TrainerRow from "./TrainerRow";

function TrainerTable({
  filteredGroupedData,
  expandedPhases,
  togglePhase,
  handleDownloadInvoice,
  handleEditInvoice,
  handleGenerateInvoice,
  handleApproveInvoice,
  downloadingInvoice,
  getDownloadStatus,
  formatDate,
  recentlyGeneratedInvoices,
  handleUndoInvoice,
  countdownTimers
}) {
  // 🔄 NEW: Structure is now College → Phase → Trainers
  
  return (
    <div className="space-y-6">
      {Object.keys(filteredGroupedData).map((collegeName) => (
        <div key={collegeName} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          {/* Enhanced College Header */}
          <div
            className="bg-gradient-to-r from-blue-50 via-blue-50 to-blue-50 px-6 py-3 flex justify-between items-center cursor-pointer hover:from-blue-100 hover:to-blue-100 transition-all duration-200 border-l-4 border-blue-500"
            onClick={() => togglePhase(collegeName)}
          >
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors">
                {expandedPhases[collegeName] ? (
                  <FiChevronUp className="text-blue-600 text-lg" />
                ) : (
                  <FiChevronDown className="text-blue-600 text-lg" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-1 rounded-lg border border-blue-200 shadow-sm">
                  {collegeName}
                </span>
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-600">
                  <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border text-xs">
                    <FiUsers className="text-blue-500 text-xs" />
                    <span className="font-medium">{Object.keys(filteredGroupedData[collegeName]).length}</span>
                    <span className="text-gray-500">phases</span>
                  </span>
                  <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border text-xs">
                    <FiHome className="text-blue-500 text-xs" />
                    <span className="font-medium">
                      {Object.values(filteredGroupedData[collegeName]).reduce((total, phaseTrainers) => total + phaseTrainers.length, 0)}
                    </span>
                    <span className="text-gray-500">trainers</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 font-medium bg-gray-50 px-2 py-0.5 rounded border">
                {expandedPhases[collegeName] ? "Collapse" : "Expand"}
              </span>
            </div>
          </div>

          {/* Phases and Trainers */}
          {expandedPhases[collegeName] && (
            <div className="bg-white">
              {Object.keys(filteredGroupedData[collegeName]).map((phase) => (
                <div key={`${collegeName}_${phase}`} className="border-b border-gray-100 last:border-b-0">
                  {/* Compact Phase Header within College */}
                  <div 
                    className="bg-gradient-to-r from-blue-50/30 to-indigo-50/30 px-4 py-2 border-b border-blue-100 cursor-pointer hover:from-blue-100/50 hover:to-indigo-100/50 transition-all duration-200"
                    onClick={() => togglePhase(`${collegeName}_${phase}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-0.5 rounded bg-blue-100 hover:bg-blue-200 transition-colors">
                          {expandedPhases[`${collegeName}_${phase}`] ? (
                            <FiChevronUp className="text-blue-600 text-xs" />
                          ) : (
                            <FiChevronDown className="text-blue-600 text-xs" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {phase}
                          </h4>
                          <span className="inline-flex items-center text-xs text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded border">
                            <FiUsers className="text-blue-500 text-xs mr-1" />
                            <span className="font-medium">{filteredGroupedData[collegeName][phase].length}</span>
                            <span className="ml-1">{filteredGroupedData[collegeName][phase].length === 1 ? "trainer" : "trainers"}</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 font-medium bg-gray-50 px-1.5 py-0.5 rounded border">
                        {expandedPhases[`${collegeName}_${phase}`] ? "Collapse" : "Expand"}
                      </div>
                    </div>
                  </div>

                  {/* Responsive Trainers Table */}
                  {expandedPhases[`${collegeName}_${phase}`] && (
                    <div className="overflow-x-auto overflow-y-hidden">
                      <div className="min-w-0">
                        <table className="w-full min-w-[800px]">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Trainer Details
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                College & Project
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Domain
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Timeline & Hours
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Invoice Status
                              </th>
                            </tr>
                          </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {filteredGroupedData[collegeName][phase].map((item, idx) => (
                            <TrainerRow
                              key={`${collegeName}-${phase}-${idx}`}
                              item={item}
                              handleDownloadInvoice={handleDownloadInvoice}
                              handleEditInvoice={handleEditInvoice}
                              handleGenerateInvoice={handleGenerateInvoice}
                              handleApproveInvoice={handleApproveInvoice}
                              downloadingInvoice={downloadingInvoice}
                              getDownloadStatus={getDownloadStatus}
                              formatDate={formatDate}
                              recentlyGeneratedInvoices={recentlyGeneratedInvoices}
                              handleUndoInvoice={handleUndoInvoice}
                              countdownTimers={countdownTimers}
                            />
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default TrainerTable;
