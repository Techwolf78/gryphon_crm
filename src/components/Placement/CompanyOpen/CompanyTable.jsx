import React from "react";
import { FaEllipsisV, FaTimes } from "react-icons/fa";
import CompanyDropdownActions from "./CompanyDropdownActions";

const borderColorMap = {
  complete: "border-l-4 border-green-500",
  ongoing: "border-l-4 border-amber-400",
  onhold: "border-l-4 border-cyan-400",
  cancel: "border-l-4 border-red-500",
  noapplications: "border-l-4 border-gray-400"
};

// Function to get college abbreviation
const getCollegeAbbreviation = (collegeName) => {
  if (!collegeName) return null;
  return collegeName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
};

function CompanyTable({
  filteredCompanies,
  activeTab,
  setSelectedCompany,
  dropdownOpen,
  setDropdownOpen,
  setShowJDForm,
  updateCompanyStatus
}) {
  return (
    <div className="mt-1 space-y-1">
      {filteredCompanies.length > 0 ? (
        filteredCompanies.map((company) => (
          <div
            key={company.id}
            className="relative group cursor-pointer"
            onClick={() => setSelectedCompany(company)}
          >
            <div
              className={`grid grid-cols-8 gap-2 p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200 ease-out ${borderColorMap[activeTab]} ${
                company.isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
              }`}
            >
              <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                {company.companyName || "-"}
              </div>

              <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                {getCollegeAbbreviation(company.college) || "-"}
              </div>

              <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                <div>
                  <div className="font-medium">{company.jobDesignation || "-"}</div>
                  <div className="text-xs text-gray-500">
                    {company.course} {company.specialization ? `(${company.specialization})` : ""}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                {company.source || "-"}
              </div>

              <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                {company.salary ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {company.salary} LPA
                  </span>
                ) : company.stipend ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ₹{company.stipend}/month
                  </span>
                ) : (
                  "-"
                )}
              </div>

              <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                {company.jobType || "-"}
              </div>

              <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                {company.companyOpenDate || "-"}
              </div>

              <div className="flex justify-center items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(dropdownOpen === company.id ? null : company.id);
                  }}
                  className={`text-gray-500 hover:text-gray-700 focus:outline-none transition p-2 rounded-full hover:bg-gray-100 ${
                    dropdownOpen === company.id
                      ? "bg-gray-200 text-gray-900 shadow-inner"
                      : ""
                  }`}
                  aria-expanded={dropdownOpen === company.id}
                  aria-haspopup="true"
                  aria-label={
                    dropdownOpen === company.id
                      ? "Close actions menu"
                      : "Open actions menu"
                  }
                >
                  {dropdownOpen === company.id ? (
                    <FaTimes size={16} />
                  ) : (
                    <FaEllipsisV size={16} />
                  )}
                </button>
              </div>
            </div>

            {dropdownOpen === company.id && (
              <CompanyDropdownActions
                companyId={company.id}
                companyData={company}
                closeDropdown={() => setDropdownOpen(null)}
                setSelectedCompany={setSelectedCompany}
                updateCompanyStatus={updateCompanyStatus}
                activeTab={activeTab}
              />
            )}
          </div>
        ))
      ) : (
        <div className="bg-white rounded-xl p-4 text-center border-2 border-dashed border-gray-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 mx-auto text-gray-400"
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

          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No companies found
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Get started by adding a new company
          </p>
          <button
            onClick={() => setShowJDForm(true)}
            className="mt-3 bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition text-sm"
          >
            Add Company
          </button>
        </div>
      )}
    </div>
  );
}

export default CompanyTable;