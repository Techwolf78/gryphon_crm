import React from 'react';

const CompletionReport = ({ report, onComplete }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-gray-100">
        <div className="mx-auto">
        {/* Header and Progress - Side by Side */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
          {/* Left side - Header */}
          <div className="flex-1">
            <div className="w-16 h-16 bg-linear-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Congratulations!
            </h1>
            <p className="text-lg text-gray-600">
              You have successfully completed your department onboarding
            </p>
          </div>

          {/* Right side - Progress indicator */}
          <div className="lg:w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-gray-700">
                Step 4 of 4
              </span>
              <span className="text-sm font-medium text-gray-700">
                100% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-linear-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>
        </div>

        {/* Report Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
            Onboarding Completion Report
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Score Section */}
            <div className={`p-4 rounded-lg border-2 ${getScoreBg(report.score)}`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <svg className={`w-5 h-5 ${getScoreColor(report.score)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Assessment Score</h3>
                  <p className="text-sm text-gray-600">Department knowledge test</p>
                </div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(report.score)} mb-2`}>
                  {report.score.toFixed(0)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${getScoreColor(report.score).replace('text-', 'bg-')}`}
                    style={{ width: `${report.score}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {report.score >= 70 ? 'Passed' : 'Needs Review'}
                </p>
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium text-gray-700">Name</span>
                </div>
                <span className="text-gray-900">{report.name}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium text-gray-700">Department</span>
                </div>
                <span className="text-gray-900">{report.department}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-gray-700">Time Taken</span>
                </div>
                <span className="text-gray-900">
                  {(() => {
                    const minutes = Math.floor(report.timeTaken / 60000);
                    const seconds = Math.floor((report.timeTaken % 60000) / 1000);
                    if (minutes === 0) {
                      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
                    } else if (seconds === 0) {
                      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
                    } else {
                      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
                    }
                  })()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-gray-700">Completion Date</span>
                </div>
                <span className="text-gray-900">{report.date.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={onComplete}
            className="group inline-flex items-center space-x-2 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Complete Onboarding</span>
          </button>
          <p className="text-gray-600 text-sm mt-4">
            This will save your progress and redirect you to your department dashboard
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompletionReport;