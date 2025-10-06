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
  downloadingInvoice,
  getDownloadStatus,
  formatDate
}) {
  // 🔄 NEW: Structure is now College → Phase → Trainers
  
  return (
    <div className="space-y-6">
      {Object.keys(filteredGroupedData).map((collegeName) => (
        <div key={collegeName} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          {/* Enhanced College Header */}
          <div
            className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 px-6 py-3 flex justify-between items-center cursor-pointer hover:from-green-100 hover:to-emerald-100 transition-all duration-200 border-l-4 border-green-500"
            onClick={() => togglePhase(collegeName)}
          >
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-green-100 hover:bg-green-200 transition-colors">
                {expandedPhases[collegeName] ? (
                  <FiChevronUp className="text-green-600 text-lg" />
                ) : (
                  <FiChevronDown className="text-green-600 text-lg" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-lg border border-green-200 shadow-sm">
                  🏛️ {collegeName}
                </span>
                <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-lg border shadow-sm">
                    <FiUsers className="text-blue-500" />
                    <span className="font-medium">{Object.keys(filteredGroupedData[collegeName]).length}</span>
                    <span className="text-gray-500">phases</span>
                  </span>
                  <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-lg border shadow-sm">
                    <FiHome className="text-green-500" />
                    <span className="font-medium">
                      {Object.values(filteredGroupedData[collegeName]).reduce((total, phaseTrainers) => total + phaseTrainers.length, 0)}
                    </span>
                    <span className="text-gray-500">trainers</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600 font-medium bg-white px-3 py-1 rounded-lg border shadow-sm">
                {expandedPhases[collegeName] ? "🔽 Collapse" : "▶️ Expand"}
              </span>
            </div>
          </div>

          {/* Phases and Trainers */}
          {expandedPhases[collegeName] && (
            <div className="bg-white">
              {Object.keys(filteredGroupedData[collegeName]).map((phase) => (
                <div key={`${collegeName}_${phase}`} className="border-b border-gray-100 last:border-b-0">
                  {/* Enhanced Phase Header within College */}
                  <div 
                    className="bg-gradient-to-r from-blue-50/30 to-indigo-50/30 px-6 py-4 border-b border-blue-100 cursor-pointer hover:from-blue-100/50 hover:to-indigo-100/50 transition-all duration-200"
                    onClick={() => togglePhase(`${collegeName}_${phase}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors">
                          {expandedPhases[`${collegeName}_${phase}`] ? (
                            <FiChevronUp className="text-blue-600" />
                          ) : (
                            <FiChevronDown className="text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">
                            📚 {phase}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center text-sm text-gray-600 bg-white px-3 py-1 rounded-lg border shadow-sm">
                              <FiUsers className="text-blue-500 text-sm mr-2" />
                              <span className="font-medium">{filteredGroupedData[collegeName][phase].length}</span>
                              <span className="ml-1">{filteredGroupedData[collegeName][phase].length === 1 ? "trainer" : "trainers"}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 font-medium bg-white px-2 py-1 rounded-lg border shadow-sm">
                        {expandedPhases[`${collegeName}_${phase}`] ? "🔽 Collapse" : "▶️ Expand"}
                      </div>
                    </div>
                  </div>

                  {/* Responsive Trainers Table */}
                  {expandedPhases[`${collegeName}_${phase}`] && (
                    <div className="overflow-x-auto overflow-y-hidden">
                      <div className="min-w-0">
                        <table className="w-full min-w-[900px] table-fixed">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[180px]">
                                👤 Trainer Details
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[160px]">
                                🏛️ College & Project
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[120px]">
                                📚 Domain
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[140px]">
                                📅 Timeline & Hours
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[300px]">
                                💼 Invoice Status
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
                              downloadingInvoice={downloadingInvoice}
                              getDownloadStatus={getDownloadStatus}
                              formatDate={formatDate}
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
