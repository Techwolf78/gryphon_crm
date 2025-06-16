import React from "react";
import {
  FaEllipsisV,
  FaPhone,
  FaCalendarCheck,
  FaArrowRight,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";

const tabLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  renewal: "Renewal",
};

const LeadTable = ({
  leads,
  activeTab,
  dropdownOpenId,
  setDropdownOpenId,
  dropdownRef,
  updateLeadPhase,
  setSelectedLead,
  setShowFollowUpModal,
  setShowClosureModal,
  getLatestFollowup,
  formatDate,
  loading,
  gridColumns,
  borderColorMap,
  headerColorMap,
}) => {
  const filteredLeads = Object.entries(leads).filter(
    ([, lead]) => (lead.phase || "hot") === activeTab
  );

  const toggleDropdown = (id, e) => {
    e.stopPropagation();
    setDropdownOpenId((currentId) => (currentId === id ? null : id));
  };

  return (
    <>
      {/* Table Header */}
      <div
        className={`hidden md:grid ${gridColumns} ${headerColorMap[activeTab]} text-base font-semibold px-6 py-4 rounded-xl mb-4 shadow-sm text-gray-800`}
      >
        <div>Business</div>
        <div>City</div>
        <div>State</div>
        <div>Contact</div>
        <div>Phone</div>
        <div>Email</div>
        <div>Created</div>
        <div>Follow-Up</div>
        <div className="text-center col-span-2">Actions</div>
      </div>

      {/* Lead Rows */}
      <div className="space-y-2">
        {filteredLeads.map(([id, lead]) => (
          <div
            key={id}
            className="relative group bg-white shadow-md hover:shadow-lg rounded-xl border border-gray-100 transition-all duration-200"
          >
            {/* Grid for desktop */}
            <div
              className={`hidden md:grid ${gridColumns} gap-4 p-4 items-center`}
            >
              {[
                "businessName",
                "city",
                "state",
                "pocName",
                "phoneNo",
                "email",
                "createdAt",
              ].map((field, i) => (
                <div
                  key={i}
                  className="text-sm text-gray-700 truncate max-w-[180px]"
                >
                  {field === "createdAt"
                    ? formatDate(lead[field])
                    : lead[field] || "-"}
                </div>
              ))}

              <div className="text-sm text-gray-700 truncate">
                {getLatestFollowup(lead)}
              </div>

              <div className="flex justify-center items-center col-span-2">
                <button
                  onClick={(e) => toggleDropdown(id, e)}
                  className={`p-2 rounded-full transition-colors hover:bg-gray-100 ${
                    dropdownOpenId === id
                      ? "bg-gray-200 text-gray-900 shadow-inner"
                      : "text-gray-500"
                  }`}
                >
                  {dropdownOpenId === id ? (
                    <FaTimes size={16} />
                  ) : (
                    <FaEllipsisV size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden p-4 space-y-2">
              <div className="text-sm font-semibold text-gray-800">
                {lead.businessName}
              </div>
              <div className="text-sm text-gray-600">
                📍 {lead.city}, {lead.state}
              </div>
              <div className="text-sm text-gray-600">
                📞 {lead.phoneNo} | ✉️ {lead.email}
              </div>
              <div className="text-sm text-gray-600">
                👤 {lead.pocName} | 🗓️ {formatDate(lead.createdAt)}
              </div>
              <div className="text-sm text-gray-600">
                📝 {getLatestFollowup(lead)}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={(e) => toggleDropdown(id, e)}
                  className={`p-2 rounded-full transition-colors hover:bg-gray-100 ${
                    dropdownOpenId === id
                      ? "bg-gray-200 text-gray-900 shadow-inner"
                      : "text-gray-500"
                  }`}
                >
                  {dropdownOpenId === id ? (
                    <FaTimes size={16} />
                  ) : (
                    <FaEllipsisV size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Dropdown Actions */}
            {dropdownOpenId === id && (
              <div
                ref={dropdownRef}
                className="absolute z-50 bg-white rounded-lg shadow-xl w-52 overflow-hidden right-4 top-full mt-2 transition-opacity duration-200"
              >
                <div className="py-2 divide-y divide-gray-100">
                  <div className="space-y-1">
                    <a
                      href={`tel:${lead.phoneNo}`}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <FaPhone className="text-blue-500 mr-3" />
                      Call
                    </a>
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      onClick={() => {
                        setSelectedLead({ ...lead, id });
                        setShowFollowUpModal(true);
                        setDropdownOpenId(null);
                      }}
                    >
                      <FaCalendarCheck className="text-purple-500 mr-3" />
                      Follow Up
                    </button>
                  </div>

                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Move to
                  </div>
                  <div className="space-y-1">
                    {["hot", "warm", "cold", "renewal"]
                      .filter((phase) => phase !== activeTab)
                      .map((phase) => (
                        <button
                          key={phase}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                          onClick={async () => {
                            await updateLeadPhase(id, phase);
                            setDropdownOpenId(null);
                          }}
                        >
                          <FaArrowRight
                            className={`${
                              phase === "hot"
                                ? "text-red-500"
                                : phase === "warm"
                                ? "text-amber-500"
                                : phase === "cold"
                                ? "text-emerald-500"
                                : "text-blue-500"
                            } mr-3`}
                          />
                          {tabLabels[phase]}
                        </button>
                      ))}
                  </div>

                  <div className="pt-2">
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      onClick={() => {
                        setSelectedLead({ ...lead, id });
                        setShowClosureModal(true);
                        setDropdownOpenId(null);
                      }}
                    >
                      <FaCheckCircle className="text-green-500 mr-3" />
                      Closure
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default LeadTable;
