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
  // Naya grouping: Phase -> College -> Trainers (with proper college names)
  const phaseCollegeGroupedData = {};
  
  Object.keys(filteredGroupedData).forEach(phase => {
    phaseCollegeGroupedData[phase] = {};
    
    filteredGroupedData[phase].forEach(trainer => {
      // College name properly use karo
      const collegeName = trainer.collegeName || "Unknown College";
      
      if (!phaseCollegeGroupedData[phase][collegeName]) {
        phaseCollegeGroupedData[phase][collegeName] = [];
      }
      
      phaseCollegeGroupedData[phase][collegeName].push(trainer);
    });
  });

  return (
    <div className="space-y-6">
      {Object.keys(phaseCollegeGroupedData).map((phase) => (
        <div key={phase} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          {/* Enhanced Phase Header */}
          <div
            className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 px-6 py-3 flex justify-between items-center cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border-l-4 border-blue-500"
            onClick={() => togglePhase(phase)}
          >
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors">
                {expandedPhases[phase] ? (
                  <FiChevronUp className="text-blue-600 text-lg" />
                ) : (
                  <FiChevronDown className="text-blue-600 text-lg" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-yellow-100 text-yellow-700 text-sm font-semibold px-3 py-1 rounded-lg border border-yellow-200 shadow-sm">
                  📚 {phase.toUpperCase()}
                </span>
                <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-lg border shadow-sm">
                    <FiHome className="text-blue-500" />
                    <span className="font-medium">{Object.keys(phaseCollegeGroupedData[phase]).length}</span>
                    <span className="text-gray-500">colleges</span>
                  </span>
                  <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-lg border shadow-sm">
                    <FiUsers className="text-green-500" />
                    <span className="font-medium">{filteredGroupedData[phase].length}</span>
                    <span className="text-gray-500">trainers</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-600 font-medium bg-white px-3 py-1 rounded-lg border shadow-sm">
                {expandedPhases[phase] ? "🔽 Collapse" : "▶️ Expand"}
              </span>
            </div>
          </div>

          {/* Colleges and Trainers */}
          {expandedPhases[phase] && (
            <div className="bg-white">
              {Object.keys(phaseCollegeGroupedData[phase]).map((collegeName) => (
                <div key={collegeName} className="border-b border-gray-100 last:border-b-0">
                  {/* Enhanced College Header */}
                  <div className="bg-gradient-to-r from-blue-50/30 to-indigo-50/30 px-6 py-4 border-b border-blue-100">
                    <div className="flex items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FiHome className="text-blue-600 text-lg" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">
                            🏛️ {collegeName}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center text-sm text-gray-600 bg-white px-3 py-1 rounded-lg border shadow-sm">
                              <FiUsers className="text-green-500 text-sm mr-2" />
                              <span className="font-medium">{phaseCollegeGroupedData[phase][collegeName].length}</span>
                              <span className="ml-1">{phaseCollegeGroupedData[phase][collegeName].length === 1 ? "trainer" : "trainers"}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Responsive Trainers Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            👤 Trainer Details
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            🏛️ College & Project
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            📚 Domain
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            📅 Timeline & Hours
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            💼 Invoice Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {phaseCollegeGroupedData[phase][collegeName].map((item, idx) => (
                          <TrainerRow
                            key={`${collegeName}-${idx}`}
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
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default TrainerTable;
