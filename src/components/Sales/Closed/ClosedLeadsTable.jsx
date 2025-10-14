import React, { useState, useEffect, useCallback } from "react";
import {
  FiFilter,
  FiMoreVertical,
  FiUpload,
  FiX,
  FiFileText,
  FiEdit,
  FiSearch,
  FiTrendingUp,
  FiDollarSign,
  FiUsers,
  FiCalendar,
  FiCheckCircle,
  FiRefreshCw
} from "react-icons/fi";
import PropTypes from "prop-types";
import { db } from "../../../firebase";
import {
  doc,
  getDoc,
} from "firebase/firestore";

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

            const docId = projectCode.replace(/\//g, "-");
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

  // Calculate summary statistics
  const calculateSummary = () => {
    const totalValue = enrichedLeads.reduce((sum, [, lead]) => sum + (lead.totalCost || 0), 0);
    const totalStudents = enrichedLeads.reduce((sum, [, lead]) => sum + (lead.studentCount || 0), 0);
    const newLeads = enrichedLeads.filter(([, lead]) => lead.closureType === 'new').length;
    const renewalLeads = enrichedLeads.filter(([, lead]) => lead.closureType === 'renewal').length;

    return { totalValue, totalStudents, newLeads, renewalLeads };
  };

  const summary = calculateSummary();

  return (
    <div className={`w-full ${className}`}>
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading ? "Loading closed leads data..." : `${enrichedLeads.length} closed leads loaded`}
      </div>

      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Closed Deals
            </h1>
            <p className="text-gray-600 text-xs mt-0.5">
              Successfully closed leads • {enrichedLeads.length} deals • {formatCurrency(summary.totalValue)} total value
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Value</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-green-100 rounded-lg flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Students</p>
              <p className="text-lg font-bold text-gray-900">{summary.totalStudents.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Deals</p>
              <p className="text-lg font-bold text-gray-900">{summary.newLeads}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-orange-100 rounded-lg flex items-center justify-center">
              <FiRefreshCw className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Renewals</p>
              <p className="text-lg font-bold text-gray-900">{summary.renewalLeads}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
        {/* Mobile Card Layout */}
        <div className="block lg:hidden">
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
                className={`bg-white border-b border-gray-100 p-4 hover:bg-gray-50/50 transition-colors duration-200 cursor-pointer ${showAnimations ? 'animate-in fade-in slide-in-from-bottom-2' : ''} ${cardClassName}`}
                style={showAnimations ? { animationDelay: `${index * 0.05}s` } : {}}
                onClick={async () => {
                  try {
                    const projectCode = lead.projectCode;
                    if (!projectCode) {
                      return;
                    }

                    const docId = projectCode.replace(/\//g, "-");
                    const docRef = doc(db, "trainingForms", docId);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                      onViewDetails({ id: docSnap.id, ...docSnap.data() });
                    } else {
                      onViewDetails(lead);
                    }
                  } catch (error) {
                    console.error("Error viewing lead details:", error);
                    onViewDetails(lead);
                  }
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-blue-700 font-semibold flex-shrink-0 shadow-sm border border-blue-100/50">
                      {lead.businessName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {lead.businessName || "-"}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">
                        {lead.projectCode?.replace(/-/g, "/") || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.closureType === "new" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200">
                        <FiCheckCircle className="mr-1 h-3 w-3" />
                        New
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200">
                        <FiRefreshCw className="mr-1 h-3 w-3" />
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
                        className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
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

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50/50 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-500 mb-1">Students</p>
                    <p className="text-lg font-semibold text-gray-900">{lead.studentCount || "-"}</p>
                  </div>
                  <div className="bg-gray-50/50 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-500 mb-1">Cost per Student</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {lead.perStudentCost ? formatCurrency(lead.perStudentCost) : "-"}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-500 mb-1">Total Value</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(lead.totalCost)}</p>
                  </div>
                  <div className="bg-gray-50/50 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-500 mb-1">Closed Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(lead.closedDate)}</p>
                  </div>
                </div>

                {/* Owner Info */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-100 to-gray-200 flex items-center justify-center text-slate-700 text-xs font-semibold flex-shrink-0 shadow-sm border border-slate-200/50">
                      {lead.assignedTo?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{lead.assignedTo?.name || "-"}</p>
                      <p className="text-xs text-slate-500">Deal Owner</p>
                    </div>
                  </div>
                  {lead.mouFileUrl && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <FiFileText className="w-3 h-3" />
                      <span>MOU</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <FiSearch className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                No closed leads found
              </h3>
              <p className="text-gray-500 text-xs">
                {`There are currently no ${viewMyLeadsOnly ? "your" : "team"} closed deals. New deals will appear here once they're marked as closed.`}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden lg:block">
          <div className={`overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300/60 scrollbar-track-slate-50/50 scrollbar-thumb-rounded-full hover:scrollbar-thumb-slate-400/60 transition-colors ${maxHeight ? 'overflow-y-auto' : ''}`} style={maxHeight ? { maxHeight } : {}}>
            {/* Table */}
            <table className={`min-w-full divide-y divide-gray-200 ${tableClassName}`}>
              <thead className="bg-gradient-to-r from-slate-600 to-slate-700">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <FiTrendingUp className="w-4 h-4" />
                      <span>Deal Details</span>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <FiUsers className="w-4 h-4" />
                      <span>Students & Cost</span>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <FiDollarSign className="w-4 h-4" />
                      <span>Total Value</span>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <FiCalendar className="w-4 h-4" />
                      <span>Closed Date</span>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <FiCheckCircle className="w-4 h-4" />
                      <span>Type</span>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Deal Owner
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  // Loading skeleton for desktop
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-slate-200"></div>
                          <div className="ml-4 space-y-2">
                            <div className="h-4 w-32 bg-slate-200 rounded"></div>
                            <div className="h-3 w-12 bg-slate-200 rounded"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="h-4 w-8 bg-slate-200 rounded mx-auto"></div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="h-4 w-16 bg-slate-200 rounded"></div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="h-4 w-20 bg-slate-200 rounded"></div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-slate-200"></div>
                          <div className="ml-3">
                            <div className="h-4 w-24 bg-slate-200 rounded"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
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
                      className="hover:bg-gray-50 transition-all duration-300 align-top cursor-pointer group hover:shadow-sm"
                      onClick={async () => {
                        try {
                          const projectCode = lead.projectCode;
                          if (!projectCode) {
                            return;
                          }

                          const docId = projectCode.replace(/\//g, "-");
                          const docRef = doc(db, "trainingForms", docId);
                          const docSnap = await getDoc(docRef);

                          if (docSnap.exists()) {
                            onViewDetails({ id: docSnap.id, ...docSnap.data() });
                          } else {
                            onViewDetails(lead);
                          }
                        } catch (error) {
                          console.error("Error viewing lead details:", error);
                          onViewDetails(lead);
                        }
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-blue-700 font-semibold flex-shrink-0 shadow-sm border border-blue-100/50">
                            {lead.businessName?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-slate-900 truncate max-w-[200px] overflow-hidden whitespace-nowrap">
                              {lead.businessName || "-"}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {lead.projectCode?.replace(/-/g, "/") || "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-center">
                          <div className="text-sm font-semibold text-gray-900">{lead.studentCount || "-"}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {lead.perStudentCost ? formatCurrency(lead.perStudentCost) : "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-gray-900">{formatCurrency(lead.totalCost)}</div>
                        {lead.gstAmount > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            +{formatCurrency(lead.gstAmount)} GST
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {formatDate(lead.closedDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.closureType === "new" ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200">
                            <FiCheckCircle className="mr-1.5 h-3 w-3" />
                            New Deal
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200">
                            <FiRefreshCw className="mr-1.5 h-3 w-3" />
                            Renewal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
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
                            className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group-hover:bg-slate-100/60 ${
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
                    <td colSpan="7" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4 px-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-sm border border-slate-200/50">
                          <FiTrendingUp className="w-10 h-10 text-slate-400" />
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

          {/* Table Footer with Summary */}
          {enrichedLeads.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">
                    Total Deals: <span className="font-semibold text-gray-900">{enrichedLeads.length}</span>
                  </span>
                  <span className="text-gray-600">
                    New: <span className="font-semibold text-emerald-600">{summary.newLeads}</span>
                  </span>
                  <span className="text-gray-600">
                    Renewals: <span className="font-semibold text-blue-600">{summary.renewalLeads}</span>
                  </span>
                  <span className="text-gray-600">
                    Students: <span className="font-semibold text-gray-900">{summary.totalStudents.toLocaleString()}</span>
                  </span>
                </div>
                <div className="text-gray-600">
                  Total Value: <span className="font-bold text-gray-900">{formatCurrency(summary.totalValue)}</span>
                </div>
              </div>
            </div>
          )}
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
