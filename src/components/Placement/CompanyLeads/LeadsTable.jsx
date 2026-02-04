import React, { useState, useEffect, useCallback } from "react";
import { FaEllipsisV } from "react-icons/fa";
import { REMARKS_TEMPLATES } from "../../../utils/constants";

const statusColorMap = {
  hot: "text-blue-600 hover:bg-blue-50",
  warm: "text-blue-600 hover:bg-blue-50",
  cold: "text-blue-600 hover:bg-blue-50",
  called: "text-blue-600 hover:bg-blue-50",
  onboarded: "text-blue-600 hover:bg-blue-50",
  dead: "text-red-600 hover:bg-red-50",
};

const statusBgColorMap = {
  hot: { bg: "from-blue-50 to-blue-100", border: "border-blue-200", hover: "hover:from-blue-100 hover:to-blue-200", icon: "bg-blue-600", leftBorder: "border-l-blue-200" },
  warm: { bg: "from-blue-50 to-blue-100", border: "border-blue-200", hover: "hover:from-blue-100 hover:to-blue-200", icon: "bg-blue-600", leftBorder: "border-l-blue-200" },
  cold: { bg: "from-blue-50 to-blue-100", border: "border-blue-200", hover: "hover:from-blue-100 hover:to-blue-200", icon: "bg-blue-600", leftBorder: "border-l-blue-200" },
  called: { bg: "from-blue-50 to-blue-100", border: "border-blue-200", hover: "hover:from-blue-100 hover:to-blue-200", icon: "bg-blue-600", leftBorder: "border-l-blue-200" },
  onboarded: { bg: "from-blue-50 to-blue-100", border: "border-blue-200", hover: "hover:from-blue-100 hover:to-blue-200", icon: "bg-blue-600", leftBorder: "border-l-blue-200" },
  dead: { bg: "from-red-50 to-red-100", border: "border-red-200", hover: "hover:from-red-100 hover:to-red-200", icon: "bg-red-600", leftBorder: "border-l-red-200" },
};

function LeadsTable({
  leads,
  groupedLeads,
  activeTab,
  onLeadClick,
  onStatusChange,
  onScheduleMeeting,
  onDeleteLead,
  onAssignLead,
  currentUserId,
  currentUser,
  allUsers,
  formatDate, // Add formatDate prop
  showCheckboxes = false,
  selectedLeads = [],
  onSelectionChange = () => {},
  isDeleting = false
}) {
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [assignSubmenuOpen, setAssignSubmenuOpen] = useState(null);
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem("leadsTableCurrentPage");
    return saved ? parseInt(saved, 10) : 1;
  });

  const itemsPerPage = 100; // Show 100 items per page for better performance

  // Persist current page changes
  useEffect(() => {
    localStorage.setItem("leadsTableCurrentPage", currentPage.toString());
  }, [currentPage]);

  // Reset page to 1 if current page is invalid (e.g., after filtering or data changes)
  useEffect(() => {
    const totalPages = groupedLeads ? 1 : Math.ceil(leads.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [leads.length, groupedLeads, currentPage, itemsPerPage]);

  // State for date group pagination
  const [dateGroupPage, setDateGroupPage] = useState({});
  const itemsPerDateGroup = 20; // Show 20 items per date group for performance

  // State for tracking expanded/collapsed date groups
  const [expandedDates, setExpandedDates] = useState(() => {
    if (!groupedLeads) return {};
    
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    // Only expand current date by default, collapse all others
    const initialState = {};
    Object.keys(groupedLeads).forEach(date => {
      initialState[date] = date === today;
    });
    return initialState;
  });

  // Function to toggle date group expansion
  const toggleDateExpansion = useCallback((date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  }, []);

  // Function to get initials from display name
  const getInitials = (assignedTo, currentUserId, currentUser) => {
    if (!assignedTo) return 'UN'; // Unassigned
    
    if (assignedTo === currentUserId) {
      // For current user, try to get initials from display name
      if (currentUser?.displayName) {
        const names = currentUser.displayName.trim().split(' ');
        if (names.length >= 2) {
          return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        } else if (names.length === 1) {
          return names[0].substring(0, 2).toUpperCase();
        }
      }
      return 'ME'; // Fallback to ME if no display name
    }
    
    // For other users, try to get initials from allUsers data
    const assignedUser = Object.values(allUsers).find(u => u.uid === assignedTo || u.id === assignedTo);
    if (assignedUser?.displayName || assignedUser?.name) {
      const displayName = assignedUser.displayName || assignedUser.name;
      const names = displayName.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      } else if (names.length === 1) {
        return names[0].substring(0, 2).toUpperCase();
      }
    }
    
    // Fallback to "OT" if user data not found
    return 'OT';
  };

  // Function to get the latest follow-up remark
  const getLatestRemark = (lead) => {
    if (!lead.followups || lead.followups.length === 0) {
      return 'No remarks';
    }

    // Sort followups by date and time (most recent first)
    const sortedFollowups = [...lead.followups].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
      return dateB - dateA;
    });

    const latest = sortedFollowups[0];

    // If there's a template, return the template label
    if (latest.template) {
      const template = REMARKS_TEMPLATES.find(t => t.value === latest.template);
      if (template) {
        return template.label;
      }
    }

    // Otherwise, return the remarks
    return latest.remarks || 'No remarks';
  };

  // Helper functions to concatenate contact information
  const getAllContactNames = (lead) => {
    const names = [];
    if (lead.pocName && lead.pocName.trim()) names.push(lead.pocName.trim());
    if (lead.contacts && lead.contacts.length > 0) {
      lead.contacts.forEach(contact => {
        if (contact.name && contact.name.trim()) names.push(contact.name.trim());
      });
    }
    return names.length > 0 ? names.join(', ') : 'N/A';
  };

  const getAllDesignations = (lead) => {
    const designations = [];
    if (lead.pocDesignation && lead.pocDesignation.trim()) designations.push(lead.pocDesignation.trim());
    if (lead.contacts && lead.contacts.length > 0) {
      lead.contacts.forEach(contact => {
        if (contact.designation && contact.designation.trim()) designations.push(contact.designation.trim());
      });
    }
    return designations.length > 0 ? designations.join(', ') : 'N/A';
  };

  const getAllPhones = (lead) => {
    const phones = [];
    if (lead.pocPhone && lead.pocPhone.toString().trim()) phones.push(lead.pocPhone.toString().trim());
    if (lead.contacts && lead.contacts.length > 0) {
      lead.contacts.forEach(contact => {
        if (contact.phone && contact.phone.toString().trim()) phones.push(contact.phone.toString().trim());
      });
    }
    return phones.length > 0 ? phones.join(', ') : 'N/A';
  };

  const getAllEmails = (lead) => {
    const emails = [];
    if (lead.pocMail && lead.pocMail.trim()) emails.push(lead.pocMail.trim());
    if (lead.contacts && lead.contacts.length > 0) {
      lead.contacts.forEach(contact => {
        if (contact.email && contact.email.trim()) emails.push(contact.email.trim());
      });
    }
    return emails.length > 0 ? emails.join(', ') : 'N/A';
  };

  const handleActionClick = (leadId, e) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen === leadId ? null : leadId);
    setAssignSubmenuOpen(null); // Close assign submenu when opening main dropdown
  };

  const handleAssignLead = (leadId, user, e) => {
    e.stopPropagation();
    onAssignLead(leadId, user);
    setAssignSubmenuOpen(null);
    setDropdownOpen(null);
  };

  const closeDropdown = useCallback(() => {
    setDropdownOpen(null);
    setAssignSubmenuOpen(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownOpen && !e.target.closest('.dropdown-container')) {
        closeDropdown();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen, closeDropdown]);

  // Calculate pagination or grouped display
  const totalPages = groupedLeads ? 1 : Math.ceil(leads.length / itemsPerPage);
  const startIndex = groupedLeads ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = groupedLeads ? leads.length : startIndex + itemsPerPage;
  const currentLeads = groupedLeads ? leads : leads.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setDropdownOpen(null); // Close any open dropdowns
    setAssignSubmenuOpen(null); // Close any open assign submenus
  };

  if (leads.length === 0) {
    return (
      <div className="mt-2">
        <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H3V7zm0 4h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No companies found
          </h3>
          <p className="mt-1 text-gray-500">Get started by adding a new lead</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 h-screen flex flex-col">
      {/* Table Container with Fixed Height */}
      <div className="flex-1 overflow-hidden border border-gray-300 rounded-lg">
        <div className="h-full overflow-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className={`sticky top-0 z-10 text-black ${activeTab && statusBgColorMap[activeTab] ? `bg-linear-to-r ${statusBgColorMap[activeTab].bg}` : 'bg-linear-to-r from-blue-500 via-blue-600 to-blue-700'}`}>
              <tr>
                {showCheckboxes && (
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-10">
                    Select
                  </th>
                )}
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-[100px]">
                  Company Name
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-[90px]">
                  Contact Person
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-[90px]">
                  Designation
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-[90px]">
                  Contact Details
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-[100px]">
                  email ID
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-20">
                  CTC
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-[120px]">
                  Remarks
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-10">
                  ASSGN
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border border-gray-300 w-[50px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedLeads ? (
                // Render grouped leads by date
                Object.entries(groupedLeads).map(([date, dateLeads]) => {
                  const leadStatus = dateLeads[0]?.status || 'hot';
                  const colors = statusBgColorMap[leadStatus] || statusBgColorMap.hot;
                  
                  return (
                  <React.Fragment key={date}>
                    {/* Date header with improved styling - now clickable */}
                    <tr>
                      <td colSpan={showCheckboxes ? "10" : "9"} className={`px-3 py-1.5 bg-linear-to-r ${colors.bg} border-b-2 ${colors.border} cursor-pointer ${colors.hover} transition-colors duration-200`} onClick={() => toggleDateExpansion(date)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            {/* Expand/Collapse Icon */}
                            <div className={`flex items-center justify-center w-5 h-5 ${colors.icon} rounded-full transition-transform duration-200 ${expandedDates[date] ? 'rotate-90' : ''}`}>
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">{formatDate ? formatDate(date) : date}</h3>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-600">
                              {dateLeads.length} lead{dateLeads.length !== 1 ? 's' : ''} {leadStatus}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* Leads for this date - only show if expanded */}
                    {expandedDates[date] && (() => {
                      const currentPage = dateGroupPage[date] || 1;
                      const startIndex = (currentPage - 1) * itemsPerDateGroup;
                      const endIndex = startIndex + itemsPerDateGroup;
                      const paginatedLeads = dateLeads.slice(startIndex, endIndex);
                      const totalPages = Math.ceil(dateLeads.length / itemsPerDateGroup);

                      return (
                        <>
                          {paginatedLeads.map((lead, index) => (
                            <tr
                              key={`${lead.id}-${index}`}
                              className={`hover:bg-blue-50 cursor-pointer bg-white border-l-4 ${colors.leftBorder} transition-colors duration-150`}
                              onClick={() => onLeadClick(lead)}
                            >
                              {showCheckboxes && (
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                                  <input
                                    type="checkbox"
                                    checked={selectedLeads.includes(lead.id)}
                                    disabled={isDeleting}
                                    onChange={(e) => {
                                      if (!isDeleting && e.target.checked) {
                                        onSelectionChange(prev => [...prev, lead.id]);
                                      } else if (!isDeleting && !e.target.checked) {
                                        onSelectionChange(prev => prev.filter(id => id !== lead.id));
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                                  />
                                </td>
                              )}
                              <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[150px]">
                                <div className="flex items-center space-x-1">
                                  {lead.companyWebsite ? (
                                    <a
                                      href={lead.companyWebsite.startsWith('http') ? lead.companyWebsite : `https://${lead.companyWebsite}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {lead.companyName || "N/A"}
                                    </a>
                                  ) : (
                                    lead.companyName || "N/A"
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                                {getAllContactNames(lead)}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                                {getAllDesignations(lead)}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                                {getAllPhones(lead)}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[150px]">
                                {getAllEmails(lead)}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                                {lead.ctc || 'N/A'}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[200px]" title={getLatestRemark(lead)}>
                                {getLatestRemark(lead)}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 text-center">
                                <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                  {getInitials(lead.assignedTo, currentUserId, currentUser)}
                                </span>
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 relative border border-gray-300">
                                <div className="relative inline-block" data-dropdown-container>
                                  <button
                                    onClick={(e) => handleActionClick(lead.id, e)}
                                    className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 rounded-full hover:bg-gray-100 transition-colors"
                                    aria-expanded={dropdownOpen === lead.id}
                                    aria-haspopup="true"
                                    data-lead-id={lead.id}
                                  >
                                    <FaEllipsisV size={16} />
                                  </button>

                                  {/* Dropdown positioned relative to the button */}
                                  {dropdownOpen === lead.id && (
                                    <div
                                      className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl shadow-2xl backdrop-blur-xl bg-white/90 border border-white/20 overflow-hidden"
                                      style={{
                                        boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.15), 0px 0px 0px 1px rgba(255, 255, 255, 0.05), inset 0px 1px 0px rgba(255, 255, 255, 0.1)'
                                      }}
                                      data-dropdown-container
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="py-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onScheduleMeeting(lead);
                                            closeDropdown();
                                          }}
                                          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-700 transition-all duration-200 group"
                                        >
                                          <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          Schedule Meeting
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onLeadClick(lead);
                                            closeDropdown();
                                          }}
                                          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-700 transition-all duration-200 group"
                                        >
                                          <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          View/Edit
                                        </button>

                                        <div className="border-t border-gray-200/50 my-2 mx-2"></div>

                                        <div className="px-2 py-1">
                                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Assign Lead</p>
                                          <div className="relative">
                                            <button
                                              onClick={() => setAssignSubmenuOpen(assignSubmenuOpen === lead.id ? null : lead.id)}
                                              className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-700 transition-all duration-200 group rounded-lg"
                                            >
                                              <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                              </svg>
                                              Assign to:
                                            </button>

                                            {/* Assign submenu positioned relative to the button */}
                                            {assignSubmenuOpen === lead.id && (
                                              <div
                                                className="absolute top-full left-0 z-50 mt-1 w-48 rounded-xl shadow-2xl backdrop-blur-xl bg-white/95 border border-white/20 overflow-hidden"
                                              >
                                                <div className="py-1 max-h-48 overflow-y-auto">
                                                  {Object.values(allUsers)
                                                    .filter(user => user.departments && user.departments.some(dept => dept.toLowerCase().includes('placement')))
                                                    .map(user => (
                                                    <button
                                                      key={user.id}
                                                      onClick={(e) => handleAssignLead(lead.id, user, e)}
                                                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-700 transition-all duration-200"
                                                    >
                                                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
                                                      {user.displayName || user.name || 'Unknown User'}
                                                    </button>
                                                    ))}
                                                  {Object.values(allUsers).filter(user => user.departments && user.departments.some(dept => dept.toLowerCase().includes('placement'))).length === 0 && (
                                                    <div className="px-4 py-2 text-sm text-gray-500">
                                                      No placement users found
                                                      <br />
                                                      <small>Total users: {Object.keys(allUsers).length}</small>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="border-t border-gray-200/50 my-2 mx-2"></div>

                                        <div className="px-2 py-1">
                                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Change Status</p>
                                          {["called", "hot", "warm", "cold", "onboarded"]
                                            .filter((status) => status !== lead.status)
                                            .map((status) => (
                                              <button
                                                key={status}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onStatusChange(lead.id, status);
                                                  closeDropdown();
                                                }}
                                                className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-lg mb-1 transition-all duration-200 ${statusColorMap[status]} hover:shadow-sm`}
                                              >
                                                <div className={`w-2 h-2 rounded-full mr-3 bg-blue-500`}></div>
                                                Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                                              </button>
                                            ))}
                                        </div>

                                        {(activeTab === 'cold' || activeTab === 'called') && (
                                          <>
                                            <div className="border-t border-gray-200/50 my-2 mx-2"></div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteLead(lead.id);
                                                closeDropdown();
                                              }}
                                              className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/80 hover:text-red-700 transition-all duration-200 group"
                                            >
                                              <svg className="w-4 h-4 mr-3 text-red-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                              Mark as Dead
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                </div>
                              </td>
                            </tr>
                          ))}
                          
                          {/* Pagination controls for date group */}
                          {totalPages > 1 && (
                            <tr>
                              <td colSpan={showCheckboxes ? "10" : "9"} className="px-4 py-2 bg-gray-50 border border-gray-300">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-600">
                                    Showing {startIndex + 1}-{Math.min(endIndex, dateLeads.length)} of {dateLeads.length} leads for {date}
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDateGroupPage(prev => ({
                                          ...prev,
                                          [date]: Math.max(1, (prev[date] || 1) - 1)
                                        }));
                                      }}
                                      disabled={currentPage === 1}
                                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      ‹
                                    </button>
                                    <span className="text-xs text-gray-600 px-2">
                                      {currentPage} of {totalPages}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDateGroupPage(prev => ({
                                          ...prev,
                                          [date]: Math.min(totalPages, (prev[date] || 1) + 1)
                                        }));
                                      }}
                                      disabled={currentPage === totalPages}
                                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      ›
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                    {/* Add spacing between date groups */}
                    <tr>
                      <td colSpan={showCheckboxes ? "10" : "9"} className="h-2 bg-gray-50"></td>
                    </tr>
                  </React.Fragment>
                  );
                })
              ) : (
                // Render regular flat list for other tabs
                currentLeads.map((lead, index) => (
                  <tr
                    key={`${lead.id}-${index}`}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'} hover:bg-gray-50 cursor-pointer transition-colors`}
                    onClick={() => onLeadClick(lead)}
                  >
                    {showCheckboxes && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          disabled={isDeleting}
                          onChange={(e) => {
                            if (!isDeleting && e.target.checked) {
                              onSelectionChange(prev => [...prev, lead.id]);
                            } else if (!isDeleting && !e.target.checked) {
                              onSelectionChange(prev => prev.filter(id => id !== lead.id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                      </td>
                    )}
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[150px]">
                      <div className="flex items-center space-x-1">
                        {lead.companyWebsite ? (
                          <a
                            href={lead.companyWebsite.startsWith('http') ? lead.companyWebsite : `https://${lead.companyWebsite}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.companyName || "N/A"}
                          </a>
                        ) : (
                          lead.companyName || "N/A"
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                      {getAllContactNames(lead)}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                      {getAllDesignations(lead)}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                      {getAllPhones(lead)}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[150px]">
                      {getAllEmails(lead)}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[120px]">
                      {lead.ctc || 'N/A'}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 truncate max-w-[200px]" title={getLatestRemark(lead)}>
                      {getLatestRemark(lead)}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 border border-gray-300 text-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        {getInitials(lead.assignedTo, currentUserId, currentUser)}
                      </span>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 relative border border-gray-300">
                      <div className="relative inline-block" data-dropdown-container>
                        <button
                          onClick={(e) => handleActionClick(lead.id, e)}
                          className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 rounded-full hover:bg-gray-100 transition-colors"
                          aria-expanded={dropdownOpen === lead.id}
                          aria-haspopup="true"
                          data-lead-id={lead.id}
                        >
                          <FaEllipsisV size={16} />
                        </button>

                        {/* Dropdown positioned relative to the button */}
                        {dropdownOpen === lead.id && (
                          <div
                            className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl shadow-2xl backdrop-blur-xl bg-white/90 border border-white/20 overflow-hidden"
                            style={{
                              boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.15), 0px 0px 0px 1px rgba(255, 255, 255, 0.05), inset 0px 1px 0px rgba(255, 255, 255, 0.1)'
                            }}
                            data-dropdown-container
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="py-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onScheduleMeeting(lead);
                                  closeDropdown();
                                }}
                                className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-700 transition-all duration-200 group"
                              >
                                <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Schedule Meeting
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onLeadClick(lead);
                                  closeDropdown();
                                }}
                                className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-700 transition-all duration-200 group"
                              >
                                <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View/Edit
                              </button>

                              <div className="border-t border-gray-200/50 my-2 mx-2"></div>

                              <div className="px-2 py-1">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Assign Lead</p>
                                <div className="relative">
                                  <button
                                    onClick={() => setAssignSubmenuOpen(assignSubmenuOpen === lead.id ? null : lead.id)}
                                    className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-700 transition-all duration-200 group rounded-lg"
                                  >
                                    <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Assign to:
                                  </button>

                                  {/* Assign submenu positioned relative to the button */}
                                  {assignSubmenuOpen === lead.id && (
                                    <div
                                      className="absolute top-full left-0 z-50 mt-1 w-48 rounded-xl shadow-2xl backdrop-blur-xl bg-white/95 border border-white/20 overflow-hidden"
                                    >
                                      <div className="py-1 max-h-48 overflow-y-auto">
                                        {Object.values(allUsers)
                                          .filter(user => user.departments && user.departments.some(dept => dept.toLowerCase().includes('placement')))
                                          .map(user => (
                                            <button
                                              key={user.id}
                                              onClick={(e) => handleAssignLead(lead.id, user, e)}
                                              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-700 transition-all duration-200"
                                            >
                                              <div className="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
                                              {user.displayName || user.name || 'Unknown User'}
                                            </button>
                                          ))}
                                        {Object.values(allUsers).filter(user => user.departments && user.departments.some(dept => dept.toLowerCase().includes('placement'))).length === 0 && (
                                          <div className="px-4 py-2 text-sm text-gray-500">
                                            No placement users found
                                            <br />
                                            <small>Total users: {Object.keys(allUsers).length}</small>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="border-t border-gray-200/50 my-2 mx-2"></div>

                              <div className="px-2 py-1">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Change Status</p>
                                {["called", "hot", "warm", "cold", "onboarded"]
                                  .filter((status) => status !== lead.status)
                                  .map((status) => (
                                    <button
                                      key={status}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onStatusChange(lead.id, status);
                                        closeDropdown();
                                      }}
                                      className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-lg mb-1 transition-all duration-200 ${statusColorMap[status]} hover:shadow-sm`}
                                    >
                                      <div className={`w-2 h-2 rounded-full mr-3 bg-blue-500`}></div>
                                      Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                  ))}
                              </div>

                              {(activeTab === 'cold' || activeTab === 'called') && (
                                <>
                                  <div className="border-t border-gray-200/50 my-2 mx-2"></div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteLead(lead.id);
                                      closeDropdown();
                                    }}
                                    className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/80 hover:text-red-700 transition-all duration-200 group"
                                  >
                                    <svg className="w-4 h-4 mr-3 text-red-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Mark as Dead
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls - Only show for non-grouped views */}
      {!groupedLeads && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-50 rounded-lg shrink-0">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1}-{Math.min(endIndex, leads.length)} of {leads.length} companies
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadsTable;
