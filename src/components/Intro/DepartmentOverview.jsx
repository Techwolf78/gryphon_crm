import React, { useState } from 'react';

const DepartmentOverview = ({ data, onStartQuiz }) => {
  const [currentSection, setCurrentSection] = useState(0);

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading department data...</p>
      </div>
    </div>
  );

  const sections = [
    {
      title: 'Department Overview',
      content: data.overview,
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: 'Tools & Technologies',
      content: data.tools,
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      title: 'Key Processes',
      content: data.processes,
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    },
    {
      title: 'Performance KPIs',
      content: data.kpis,
      icon: (
        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'Key Responsibilities',
      content: data.key_responsibilities,
      icon: (
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      title: 'Success Stories',
      content: data.success_stories,
      icon: (
        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    },
    {
      title: 'Important Contacts',
      content: data.contacts,
      icon: (
        <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
  ];

  const currentSectionData = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;
  const isFirstSection = currentSection === 0;

  const handleNext = () => {
    if (!isLastSection) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-gray-100">
      <div className="mx-auto">
        {/* Header and Progress - Side by Side */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
          {/* Left side - Header */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Department Overview
            </h1>
            <p className="text-base text-gray-600">
              Learn about your department's role, tools, and key responsibilities
            </p>
          </div>

          {/* Right side - Progress indicator */}
          <div className="lg:w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-gray-700">
                Step 3 of 4
              </span>
              <span className="text-sm font-medium text-gray-700">
                75% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-linear-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: '75%' }}
              ></div>
            </div>
          </div>
        </div>

        {/* Current section content */}
        {currentSectionData && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6 transform transition-all duration-300 hover:shadow-xl">
            <div className="flex items-start space-x-4 mb-6">
              <div className="shrink-0 p-3 bg-gray-50 rounded-lg">
                {currentSectionData.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-4 leading-tight">
                  {currentSectionData.title}
                </h2>
                <div className="text-gray-700 leading-relaxed">
                  {currentSectionData.title === 'Department Overview' ? (
                    <p className="text-base mb-4">{currentSectionData.content}</p>
                  ) : currentSectionData.title === 'Important Contacts' ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-base font-medium text-gray-900 mb-2">Contact Information:</p>
                      <p className="text-base">{currentSectionData.content}</p>
                    </div>
                  ) : currentSectionData.title === 'Success Stories' ? (
                    <div className="bg-linear-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200">
                      <div className="flex items-center mb-3">
                        <svg className="w-5 h-5 text-emerald-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        <span className="font-semibold text-emerald-800">Achievement Highlights</span>
                      </div>
                      <ul className="space-y-2">
                        {currentSectionData.content.split(', ').map((item, index) => (
                          <li key={index} className="flex items-start">
                            <svg className="w-4 h-4 text-emerald-600 mr-2 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-base">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {currentSectionData.content.split(', ').map((item, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="w-4 h-4 text-blue-600 mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-base">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <button
            onClick={handlePrevious}
            disabled={isFirstSection}
            className={`group flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
              isFirstSection
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md'
            }`}
            aria-label="Previous section"
          >
            <svg className={`w-5 h-5 transition-transform ${isFirstSection ? '' : 'group-hover:-translate-x-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Previous</span>
          </button>

          {/* Section indicators */}
          <div className="flex space-x-3" role="tablist" aria-label="Department overview sections">
            {sections.map((section, index) => (
              <button
                key={index}
                onClick={() => setCurrentSection(index)}
                className={`group relative w-10 h-10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  index === currentSection
                    ? 'bg-blue-600 text-white shadow-lg scale-110'
                    : index < currentSection
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                aria-label={`Go to ${section.title}`}
                role="tab"
                aria-selected={index === currentSection}
              >
                <div className="flex items-center justify-center w-full h-full">
                  {React.cloneElement(section.icon, {
                    className: `w-5 h-5 ${index === currentSection ? 'text-white' : 'text-current'}`
                  })}
                </div>
                {index === currentSection && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </button>
            ))}
          </div>

          {isLastSection ? (
            <button
              onClick={onStartQuiz}
              className="group flex items-center space-x-2 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              aria-label="Start department quiz"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Start Quiz</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="group flex items-center space-x-2 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              aria-label="Next section"
            >
              <span>Next</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentOverview;