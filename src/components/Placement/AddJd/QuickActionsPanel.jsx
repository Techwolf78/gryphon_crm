import React from "react";
import {
  DocumentDownloadIcon,
  UploadIcon,
  ChevronRightIcon,
} from "@heroicons/react/outline";

const QuickActionsPanel = ({
  onDownloadTemplate,
  onShowUploadModal,
  onOpenUploadFile,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Quick Actions</h2>

      <div className="space-y-6">
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
  );
};

export default QuickActionsPanel;
