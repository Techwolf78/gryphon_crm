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
    <div className="space-y-4">
      {Object.keys(phaseCollegeGroupedData).map((phase) => (
        <div key={phase} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Phase Header */}
          <div
            className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 flex justify-between items-center cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => togglePhase(phase)}
          >
            <div className="flex items-center gap-3">
              {expandedPhases[phase] ? (
                <FiChevronUp className="text-blue-600 text-lg" />
              ) : (
                <FiChevronDown className="text-blue-600 text-lg" />
              )}
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  {phase.toUpperCase()} PHASE
                </h3>
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <FiHome className="text-blue-500" />
                  {Object.keys(phaseCollegeGroupedData[phase]).length} colleges • 
                  <FiUsers className="text-green-500 ml-1" />
                  {filteredGroupedData[phase].length} trainers total
                </p>
              </div>
            </div>
            <span className="text-sm text-blue-600 font-medium bg-blue-100 px-3 py-1 rounded-full">
              {expandedPhases[phase] ? "Collapse" : "Expand"} Phase
            </span>
          </div>

          {/* Colleges and Trainers */}
          {expandedPhases[phase] && (
            <div className="bg-white">
              {Object.keys(phaseCollegeGroupedData[phase]).map((collegeName) => (
                <div key={collegeName} className="border-b border-gray-100 last:border-b-0">
                  {/* College Header */}
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FiHome className="text-gray-600 text-xl" />
                        <div>
                          <h4 className="font-semibold text-gray-800 text-lg">
                            {collegeName}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <FiUsers className="text-gray-500" />
                            {phaseCollegeGroupedData[phase][collegeName].length} 
                            {phaseCollegeGroupedData[phase][collegeName].length === 1 ? " trainer" : " trainers"} in {phase} phase
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 bg-white px-3 py-2 rounded-lg border font-medium">
                        College
                      </span>
                    </div>
                  </div>

                  {/* Trainers Table for this College */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Trainer Details
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Project & Domain
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Timeline & Hours
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
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
