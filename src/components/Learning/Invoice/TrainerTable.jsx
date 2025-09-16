import React from "react";
import { FiChevronUp, FiChevronDown, FiUser, FiCalendar, FiDollarSign, FiLayers, FiFileText, FiDownload, FiCheckCircle, FiClock } from "react-icons/fi";
import { FaEye } from "react-icons/fa";
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
  return (
    <div className="space-y-4">
      {Object.keys(filteredGroupedData).map((phase) => (
        <div
          key={phase}
          className="border border-gray-200 rounded-lg overflow-hidden transition-all hover:shadow-sm"
        >
          {/* Phase Header */}
          <div
            className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => togglePhase(phase)}
            aria-expanded={expandedPhases[phase]}
          >
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              {expandedPhases[phase] ? (
                <FiChevronUp className="text-gray-500" />
              ) : (
                <FiChevronDown className="text-gray-500" />
              )}
              {phase.toUpperCase()} Trainers
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full ml-2">
                {filteredGroupedData[phase].length}{" "}
                {filteredGroupedData[phase].length === 1
                  ? "trainer"
                  : "trainers"}
              </span>
            </h3>
            <span className="text-sm text-gray-500">
              {expandedPhases[phase] ? "Collapse" : "Expand"}
            </span>
          </div>

          {/* Trainer Table */}
          {expandedPhases[phase] && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trainer
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      College & Projects
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domains
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates & Hours
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredGroupedData[phase].map((item, idx) => (
                    <TrainerRow
                      key={idx}
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
          )}
        </div>
      ))}
    </div>
  );
}

export default TrainerTable;