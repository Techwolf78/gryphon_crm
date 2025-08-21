import React from 'react'

function GenerateTrainerInvoice() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Generate Trainer Invoice</h2>
        <p className="text-gray-600 mb-6">Create and manage trainer invoices</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
          <div className="text-blue-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Invoice Generator</h3>
          <p className="text-gray-600">
            This section will contain the trainer invoice generation functionality.
          </p>
        </div>
        
        <div className="mt-6">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  )
}

export default GenerateTrainerInvoice
