import React, { useState } from "react";
import {
  FiHelpCircle,
  FiMail,
  FiPhone,
  FiClock,
  FiUser,
  FiSettings,
  FiBook,
  FiX,
  FiExternalLink,
  FiCheckCircle,
} from "react-icons/fi";

const Help = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");

  const handleKnowledgeItemClick = (title) => {
    setPopupTitle(title);
    setShowPopup(true);
  };

  const knowledgeBaseItems = [
    {
      icon: <FiSettings className="w-5 h-5" />,
      title: "System Settings",
      desc: "Configure application preferences and integrations",
      category: "Configuration",
    },
    {
      icon: <FiHelpCircle className="w-5 h-5" />,
      title: "Troubleshooting",
      desc: "Solve common issues and error messages",
      category: "Support",
    },
    {
      icon: <FiUser className="w-5 h-5" />,
      title: "User Management",
      desc: "Add, remove, and manage team members",
      category: "Administration",
    },
    {
      icon: <FiBook className="w-5 h-5" />,
      title: "Getting Started",
      desc: "New user onboarding guide",
      category: "Guides",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Under Development Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl p-6 max-w-md w-full relative overflow-hidden border border-gray-100 shadow-2xl animate-scaleIn">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close popup"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className="text-center pt-2">
              <div className="w-16 h-16 mx-auto mb-4 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-spin-slow [animation-duration:3s]"></div>
                <div className="relative bg-blue-500 rounded-full p-3 text-white">
                  <FiSettings className="w-6 h-6" />
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {popupTitle}
              </h3>
              <p className="text-gray-600 mb-4">
                This feature is currently under active development.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Our engineering team is working hard to deliver this
                functionality. We'll notify you as soon as it's available.
              </p>

              <button
                onClick={() => setShowPopup(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="">
        {/* Header aligned left */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-start bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-5 mb-4 shadow-sm border border-white">
            <FiHelpCircle className="text-blue-600 w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            How can we help?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Find answers, guides, and resources to help you get the most out of
            our platform.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Contact Support */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden transition-all hover:shadow-sm">
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-xl mr-4 shadow-inner border border-white">
                    <FiMail className="text-blue-600 w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Contact Support
                  </h2>
                </div>

                <div className="space-y-5">
                  {/* Email */}
                  <div className="flex items-start">
                    <div className="p-2.5 bg-blue-50 rounded-xl mr-3 shadow-inner border border-white/50">
                      <FiMail className="text-blue-600 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Email
                      </h3>
                      <a
                        href="mailto:connect@gryphonacademy.co.in"
                        className="text-blue-600 hover:text-blue-800 transition-colors font-medium inline-flex items-center"
                      >
                        connect@gryphonacademy.co.in{" "}
                        <FiExternalLink className="ml-1 w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start">
                    <div className="p-2.5 bg-blue-50 rounded-xl mr-3 shadow-inner border border-white/50">
                      <FiPhone className="text-blue-600 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Phone
                      </h3>
                      <a
                        href="tel:+15551234567"
                        className="text-blue-600 hover:text-blue-800 transition-colors font-medium"
                      >
                        +91 8605234701
                      </a>
                    </div>
                  </div>

                  {/* Support Hours */}
                  <div className="flex items-start">
                    <div className="p-2.5 bg-blue-50 rounded-xl mr-3 shadow-inner border border-white/50">
                      <FiClock className="text-blue-600 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Support Hours
                      </h3>
                      <p className="text-gray-700 font-medium">
                        Monday-Saturday, 10AM-7PM IST
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Emergency support available 24/7 for critical issues
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Knowledge Base and Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Knowledge Base Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {knowledgeBaseItems.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleKnowledgeItemClick(item.title)}
                  className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="bg-blue-50 p-2.5 rounded-xl border border-white/60 shadow-inner">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-gray-900">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{item.category}</p>
                </div>
              ))}
            </div>

            {/* Status Card - Moved below knowledge base cards */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative mt-1">
                    <div className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75 animate-ping"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      System Status
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      All systems operational
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
                  <span className="inline-flex items-center">
                    <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500 mr-1.5" />
                    Last updated:{" "}
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;