import React, { useState } from "react";
import {
  DocumentDownloadIcon,
  UploadIcon,
  ChevronRightIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/outline";

const QuickActionsPanel = ({
  onDownloadTemplate,
  onShowUploadModal,
  onOpenUploadFile,
}) => {
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  return (
    <>
      {/* Help Modal - Quick Actions */}
      {helpModalOpen && (
        <div className="fixed inset-0 backdrop-blur-lg z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <QuestionMarkCircleIcon className="h-6 w-6 mr-2 text-blue-500" />
                Quick Actions Help
              </h3>
              <button
                onClick={() => setHelpModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">📥 Download Template</h4>
                <p className="text-sm">Download an Excel template file based on your course type. Use this template to organize student data before uploading.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">📤 Upload Data</h4>
                <p className="text-sm">Upload the filled Excel file with student data. The system will validate and process the information for the current placement drive.</p>
              </div>
            </div>
            <button
              onClick={() => setHelpModalOpen(false)}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg pt-3 pb-6 px-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-800">Quick Actions</h2>
          <button
            onClick={() => setHelpModalOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="View help for Quick Actions"
          >
            <QuestionMarkCircleIcon className="h-6 w-6 text-gray-600 hover:text-gray-800" />
            <span className="text-xs">Help</span>
          </button>
        </div>

        <div className="space-y-4">
        <button
          onClick={onDownloadTemplate}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-md transition-all duration-300 hover:shadow-lg"
        >
          <div className="flex items-center">
            <DocumentDownloadIcon className="h-6 w-6 mr-3" />
            <div className="text-left">
              <p className="font-semibold">Download Template</p>
              <p className="text-sm text-blue-100">Excel format</p>
            </div>
          </div>
          <ChevronRightIcon className="h-5 w-5" />
        </button>

        <button
          onClick={onShowUploadModal}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-md transition-all duration-300 hover:shadow-lg"
        >
          <div className="flex items-center">
            <UploadIcon className="h-6 w-6 mr-3" />
            <div className="text-left">
              <p className="font-semibold">Upload Data</p>
              <p className="text-sm text-green-100">Submit student list</p>
            </div>
          </div>
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
    </>
  );
};

export default QuickActionsPanel;
