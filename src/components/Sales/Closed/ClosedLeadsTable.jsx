import React, { useState, useEffect, useCallback } from "react";
import {
  FiFilter,
  FiMoreVertical,
  FiUpload,
  FiX,
  FiFileText,
  FiEdit,
} from "react-icons/fi";
import PropTypes from "prop-types";
import { db } from "../../../firebase";
import {
  doc,
  getDoc,
} from "firebase/firestore";

// Project Code Conversion Utilities
const projectCodeToDocId = (projectCode) =>
  projectCode ? projectCode.replace(/\//g, "-") : "";
const displayProjectCode = (code) => (code ? code.replace(/-/g, "/") : "-");
const displayYear = (year) => year.replace(/-/g, " ");

const ClosedLeadsTable = ({
  leads,
  formatDate,
  formatCurrency,
  viewMyLeadsOnly,
  onEditModal,
  onViewDetails,
  onUploadModal,
  onMOUModal,
  isLoading = false,
  className = "",
  cardClassName = "",
  tableClassName = "",
  showAnimations = true,
  maxHeight,
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [enrichedLeads, setEnrichedLeads] = useState([]);

  // Update the useEffect for click outside handling
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if we're clicking outside ALL dropdowns
      if (!event.target.closest('[data-dropdown-container]')) {
        setOpenDropdown(null);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // Remove openDropdown dependency

  // Fetch additional data from trainingForms collection
  useEffect(() => {
    const fetchTrainingFormData = async () => {
      if (!leads || leads.length === 0) {
        setEnrichedLeads([]);
        return;
      }

      const enriched = await Promise.all(
        leads.map(async ([id, lead]) => {
          try {
            const projectCode = lead.projectCode;
            if (!projectCode) {
              return [id, lead];
            }

            const docId = projectCodeToDocId(projectCode);
            const docRef = doc(db, "trainingForms", docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              const trainingFormData = docSnap.data();
              // Merge the training form data with the lead data
              return [id, {
                ...lead,
                studentCount: trainingFormData.studentCount || lead.studentCount,
                perStudentCost: trainingFormData.perStudentCost || lead.perStudentCost,
                totalCost: trainingFormData.totalCost || lead.totalCost,
                gstAmount: trainingFormData.gstAmount || 0,
                netPayableAmount: trainingFormData.netPayableAmount || lead.totalCost,
              }];
            } else {
              return [id, lead];
            }
          } catch (error) {
            console.error("Error fetching training form data:", error);
            return [id, lead];
          }
        })
      );

      setEnrichedLeads(enriched);
    };

    fetchTrainingFormData();
  }, [leads]);

  // Update the toggleDropdown function
  const toggleDropdown = useCallback((id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(openDropdown === id ? null : id);
  }, [openDropdown]);

  // Enhanced keyboard navigation and accessibility
  const handleKeyDown = useCallback((event, id) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleDropdown(id, event);
    } else if (event.key === 'Escape') {
      setOpenDropdown(null);
    }
  }, [toggleDropdown]);

  // Handle dropdown menu keyboard navigation
  const handleDropdownKeyDown = (event, id) => {
    const dropdown = document.getElementById(`dropdown-${id}`) || document.getElementById(`mobile-dropdown-${id}`);
    if (!dropdown) return;

    const buttons = Array.from(dropdown.querySelectorAll('button[role="menuitem"]'));
    const currentIndex = buttons.findIndex(btn => btn === document.activeElement);

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
        buttons[nextIndex].focus();
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
        buttons[prevIndex].focus();
        break;
      }
      case 'Escape': {
        event.preventDefault();
        setOpenDropdown(null);
        // Return focus to the trigger button
        const triggerBtn = document.getElementById(`dropdown-button-${id}`) || document.getElementById(`mobile-dropdown-button-${id}`);
        if (triggerBtn) triggerBtn.focus();
        break;
      }
      case 'Tab': {
        // Allow tab to close dropdown if tabbing out
        setTimeout(() => {
          if (!dropdown.contains(document.activeElement)) {
            setOpenDropdown(null);
          }
        }, 0);
        break;
      }
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading ? "Loading closed leads data..." : `${enrichedLeads.length} closed leads loaded`}
      </div>
      {/* Mobile Card Layout */}
      <div className="block lg:hidden space-y-4">
        {isLoading ? (
          // Loading skeleton for mobile
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100/80 p-6 animate-pulse" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-slate-200 animate-pulse" style={{ animationDelay: `${index * 0.1 + 0.1}s` }}></div>
                <div className="ml-4 space-y-2 flex-1">
                  <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" style={{ animationDelay: `${index * 0.1 + 0.2}s` }}></div>
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" style={{ animationDelay: `${index * 0.1 + 0.3}s` }}></div>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" style={{ animationDelay: `${index * 0.1 + 0.4}s` }}></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" style={{ animationDelay: `${index * 0.1 + 0.5 + i * 0.1}s` }}></div>
                    <div className="h-6 w-16 bg-slate-200 rounded animate-pulse" style={{ animationDelay: `${index * 0.1 + 0.6 + i * 0.1}s` }}></div>
                  </div>
                ))}
              </div>
              <div className="flex items-center pt-4 border-t border-slate-100/60">
                <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" style={{ animationDelay: `${index * 0.1 + 0.9}s` }}></div>
                <div className="ml-3 space-y-1">
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" style={{ animationDelay: `${index * 0.1 + 1.0}s` }}></div>
                  <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" style={{ animationDelay: `${index * 0.1 + 1.1}s` }}></div>
                </div>
              </div>
            </div>
          ))
        ) : enrichedLeads.length > 0 ? (
          enrichedLeads.map(([id, lead], index) => (
            <div
              key={id}
              className={`bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100/80 p-4 md:p-6 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 cursor-pointer hover:border-slate-200/60 transform hover:-translate-y-0.5 ${showAnimations ? 'animate-in fade-in slide-in-from-bottom-2' : ''} ${cardClassName}`}
              style={showAnimations ? { animationDelay: `${index * 0.05}s` } : {}}
              onClick={async () => {
                try {
                  const projectCode = lead.projectCode;
                  if (!projectCode) {
                    console.error("No project code found for this lead");
                    return;
                  }

                  const docId = projectCodeToDocId(projectCode);
                  const docRef = doc(db, "trainingForms", docId);
                  const docSnap = await getDoc(docRef);

                  if (docSnap.exists()) {
                    onViewDetails({ id: docSnap.id, ...docSnap.data() });
                  } else {
                    console.error("No training form found for this lead");
                    onViewDetails(lead);
                  }
                } catch (error) {
                  console.error("Error fetching training form:", error);
                  onViewDetails(lead);
                }
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-blue-700 font-semibold flex-shrink-0 shadow-sm border border-blue-100/50">
                    {lead.businessName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-slate-900 text-lg">
                      {lead.businessName || "-"}
                    </h3>
                    <p className="text-sm text-slate-600 font-medium">
                      {displayProjectCode(lead.projectCode) || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {lead.closureType === "new" ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                      New
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100/50">
                      Renewal
                    </span>
                  )}
                  <div className="relative">
                    <button
                      id={`mobile-dropdown-button-${id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(id, e);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, id)}
                      aria-label="Action menu"
                      aria-expanded={openDropdown === id}
                      aria-haspopup="menu"
                      aria-controls={`mobile-dropdown-${id}`}
                      className={`p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        openDropdown === id
                          ? "bg-indigo-50 text-indigo-700 shadow-sm scale-105"
                          : "text-slate-500 hover:bg-slate-100/60 hover:text-slate-700 hover:scale-105"
                      }`}
                    >
                      {openDropdown === id ? (
                        <FiX className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <FiMoreVertical className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>

                    {/* Mobile Dropdown menu */}
                    {openDropdown === id && (
                      <div
                        id={`mobile-dropdown-${id}`}
                        data-dropdown-id={id}
                        className="absolute right-0 top-full z-30 mt-2 w-52 origin-top-right rounded-2xl bg-white shadow-xl shadow-slate-200/60 ring-1 ring-slate-200/80 focus:outline-none backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => handleDropdownKeyDown(e, id)}
                        role="menu"
                        aria-labelledby={`mobile-dropdown-button-${id}`}
                        style={{
                          boxShadow:
                            "0px 20px 40px -10px rgba(0, 0, 0, 0.1), 0px 10px 20px -5px rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <div className="flex flex-col p-2">
                          <button
                            className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-indigo-50/80 hover:text-indigo-700 focus:outline-none focus:bg-indigo-50/80 focus:text-indigo-700 group hover:scale-[1.02] active:scale-[0.98] active:bg-indigo-100/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUploadModal(lead);
                              setOpenDropdown(null);
                            }}
                            role="menuitem"
                          >
                            <FiUpload className="mr-3 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                            <span>Upload Student List</span>
                          </button>

                          <button
                            className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-indigo-50/80 hover:text-indigo-700 focus:outline-none focus:bg-indigo-50/80 focus:text-indigo-700 group hover:scale-[1.02] active:scale-[0.98] active:bg-indigo-100/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMOUModal(id);
                              setOpenDropdown(null);
                            }}
                            role="menuitem"
                          >
                            <FiFileText className="mr-3 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                            <span>
                              {lead.mouFileUrl ? "Update MOU" : "Upload MOU"}
                            </span>
                            {lead.mouFileUrl && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400/90 shadow-sm"></span>
                            )}
                          </button>

                          <button
                            className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-indigo-50/80 hover:text-indigo-700 focus:outline-none focus:bg-indigo-50/80 focus:text-indigo-700 group hover:scale-[1.02] active:scale-[0.98] active:bg-indigo-100/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditModal(lead);
                              setOpenDropdown(null);
                            }}
                            role="menuitem"
                          >
                            <FiEdit className="mr-3 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                            <span>Edit Details</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Students</p>
                  <p className="text-lg font-semibold text-slate-900">{lead.studentCount || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Cost per Student</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {lead.perStudentCost ? formatCurrency(lead.perStudentCost) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Total Value</p>
                  <p className="text-lg font-semibold text-slate-900">{formatCurrency(lead.totalCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">GST Amount</p>
                  <p className="text-lg font-semibold text-slate-900">{formatCurrency(lead.gstAmount || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Closed Date</p>
                  <p className="text-sm font-medium text-slate-900">{formatDate(lead.closedDate)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100/60">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-100 to-gray-200 flex items-center justify-center text-slate-700 text-xs font-semibold flex-shrink-0 shadow-sm border border-slate-200/50">
                    {lead.assignedTo?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-900">{lead.assignedTo?.name || "-"}</p>
                    <p className="text-xs text-slate-500">Owner</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100/80 p-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-sm border border-slate-200/50">
                <FiFileText className="w-10 h-10 text-slate-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  No closed leads found
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {`There are currently no ${viewMyLeadsOnly ? "your" : "team"} closed deals. New deals will appear here once they're marked as closed.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden lg:block">
        <div className={`overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300/60 scrollbar-track-slate-50/50 scrollbar-thumb-rounded-full hover:scrollbar-thumb-slate-400/60 transition-colors ${maxHeight ? 'overflow-y-auto' : ''}`} style={maxHeight ? { maxHeight } : {}}>
          {/* Table */}
          <table className={`min-w-full divide-y divide-gray-100/60 ${tableClassName}`}>
            <thead className="bg-gradient-to-r from-slate-50 to-gray-50/80">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Project Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  College Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[90px]">
                  No of stds.
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[110px]">
                  Cost per std.
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[12px]">
                  Actual TCV
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[140px]">
                  Owner
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[120px]">
                  Closed Date
                </th>
                <th className="px-2 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-[40px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100/60">
              {isLoading ? (
                // Loading skeleton for desktop
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-20 bg-slate-200 rounded"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-slate-200"></div>
                        <div className="ml-4 space-y-2">
                          <div className="h-4 w-32 bg-slate-200 rounded"></div>
                          <div className="h-3 w-12 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-8 bg-slate-200 rounded mx-auto"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-16 bg-slate-200 rounded"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-20 bg-slate-200 rounded"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-slate-200"></div>
                        <div className="ml-3">
                          <div className="h-4 w-24 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-16 bg-slate-200 rounded"></div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="h-8 w-8 bg-slate-200 rounded-full mx-auto"></div>
                    </td>
                  </tr>
                ))
              ) : enrichedLeads.length > 0 ? (
                enrichedLeads.map(([id, lead]) => (
                  <tr
                    key={id}
                    className="hover:bg-slate-50/50 transition-all duration-300 align-top cursor-pointer group hover:shadow-sm"
                    onClick={async () => {
                      try {
                        const projectCode = lead.projectCode;
                        if (!projectCode) {
                          console.error("No project code found for this lead");
                          return;
                        }

                        const docId = projectCodeToDocId(projectCode);
                        const docRef = doc(db, "trainingForms", docId);
                        const docSnap = await getDoc(docRef);

                        if (docSnap.exists()) {
                          onViewDetails({ id: docSnap.id, ...docSnap.data() });
                        } else {
                          console.error("No training form found for this lead");
                          onViewDetails(lead);
                        }
                      } catch (error) {
                        console.error("Error fetching training form:", error);
                        onViewDetails(lead);
                      }
                    }}
                  >
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 overflow-hidden truncate max-w-[120px] font-medium"
                      title={`DocID: ${projectCodeToDocId(
                        lead.projectCode || ""
                      )}, ProjectCode: ${displayProjectCode(
                        lead.projectCode || ""
                      )}, Year: ${displayYear(String(lead.closedDate || ""))}`}
                    >
                      {displayProjectCode(lead.projectCode) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap overflow-hidden truncate max-w-[180px]">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-blue-700 font-semibold flex-shrink-0 shadow-sm border border-blue-100/50">
                          {lead.businessName?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-slate-900 truncate max-w-[140px] overflow-hidden whitespace-nowrap">
                            {lead.businessName || "-"}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {lead.closureType === "new" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                                New
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100/50">
                                Renewal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 overflow-hidden truncate max-w-[90px] font-medium">
                      <div className="text-center">
                        {lead.studentCount || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900 overflow-hidden truncate max-w-[110px]">
                      {lead.perStudentCost ? formatCurrency(lead.perStudentCost) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900 overflow-hidden truncate max-w-[140px]">
                      {formatCurrency(lead.totalCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap overflow-hidden truncate max-w-[140px]">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-100 to-gray-200 flex items-center justify-center text-slate-700 text-xs font-semibold flex-shrink-0 shadow-sm border border-slate-200/50">
                          {lead.assignedTo?.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "?"}
                        </div>
                        <div className="ml-3 text-sm font-medium text-slate-900 truncate max-w-[100px] overflow-hidden whitespace-nowrap">
                          {lead.assignedTo?.name || "-"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 overflow-hidden truncate max-w-[140px] font-medium">
                      {formatDate(lead.closedDate)}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap w-[40px]">
                      <div
                        className="flex justify-center items-center h-full relative"
                        data-dropdown-container
                      >
                        <button
                          id={`dropdown-button-${id}`}
                          onClick={(e) => toggleDropdown(id, e)}
                          onKeyDown={(e) => handleKeyDown(e, id)}
                          aria-label="Action menu"
                          aria-expanded={openDropdown === id}
                          aria-haspopup="menu"
                          aria-controls={`dropdown-${id}`}
                          className={`p-1.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group-hover:bg-slate-100/60 ${
                            openDropdown === id
                              ? "bg-indigo-50 text-indigo-700 shadow-sm scale-105"
                              : "text-slate-500 hover:bg-slate-100/60 hover:text-slate-700 hover:scale-105"
                          }`}
                        >
                          {openDropdown === id ? (
                            <FiX className="h-5 w-5" aria-hidden="true" />
                          ) : (
                            <FiMoreVertical className="h-5 w-5" aria-hidden="true" />
                          )}
                        </button>

                        {/* Dropdown menu */}
                        {openDropdown === id && (
                          <div
                            id={`dropdown-${id}`}
                            data-dropdown-id={id}
                            className="absolute right-0 top-full z-30 mt-2 w-52 origin-top-right rounded-2xl bg-white shadow-xl shadow-slate-200/60 ring-1 ring-slate-200/80 focus:outline-none backdrop-blur-sm"
                            data-dropdown-container
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => handleDropdownKeyDown(e, id)}
                            role="menu"
                            aria-labelledby={`dropdown-button-${id}`}
                            style={{
                              boxShadow:
                                "0px 20px 40px -10px rgba(0, 0, 0, 0.1), 0px 10px 20px -5px rgba(0, 0, 0, 0.05)",
                            }}
                          >
                            <div className="flex flex-col p-2">
                              <button
                                className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-indigo-50/80 hover:text-indigo-700 focus:outline-none focus:bg-indigo-50/80 focus:text-indigo-700 group hover:scale-[1.02] active:scale-[0.98] active:bg-indigo-100/80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUploadModal(lead);
                                  setOpenDropdown(null);
                                }}
                                role="menuitem"
                              >
                                <FiUpload className="mr-3 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                                <span>Upload Student List</span>
                              </button>

                              <button
                                className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-indigo-50/80 hover:text-indigo-700 focus:outline-none focus:bg-indigo-50/80 focus:text-indigo-700 group hover:scale-[1.02] active:scale-[0.98] active:bg-indigo-100/80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMOUModal(id);
                                  setOpenDropdown(null);
                                }}
                                role="menuitem"
                              >
                                <FiFileText className="mr-3 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                                <span>
                                  {lead.mouFileUrl ? "Update MOU" : "Upload MOU"}
                                </span>
                                {lead.mouFileUrl && (
                                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400/90 shadow-sm"></span>
                                )}
                              </button>

                              <button
                                className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-indigo-50/80 hover:text-indigo-700 focus:outline-none focus:bg-indigo-50/80 focus:text-indigo-700 group hover:scale-[1.02] active:scale-[0.98] active:bg-indigo-100/80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditModal(lead);
                                  setOpenDropdown(null);
                                }}
                                role="menuitem"
                              >
                                <FiEdit className="mr-3 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                                <span>Edit Details</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 px-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-sm border border-slate-200/50">
                        <FiFileText className="w-10 h-10 text-slate-400" />
                      </div>
                      <div className="text-center max-w-sm">
                        <h3 className="text-xl font-semibold text-slate-900 mb-3">
                          No closed leads found
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          {`There are currently no ${viewMyLeadsOnly ? "your" : "team"} closed deals. New deals will appear here once they're marked as closed.`}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

ClosedLeadsTable.propTypes = {
  leads: PropTypes.array.isRequired,
  formatDate: PropTypes.func.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  viewMyLeadsOnly: PropTypes.bool.isRequired,
  onEditModal: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onUploadModal: PropTypes.func.isRequired,
  onMOUModal: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  className: PropTypes.string,
  cardClassName: PropTypes.string,
  tableClassName: PropTypes.string,
  showAnimations: PropTypes.bool,
  maxHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(ClosedLeadsTable);
