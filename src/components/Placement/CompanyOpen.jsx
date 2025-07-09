import React, { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import AddJD from "./AddJD";
import { XIcon } from "@heroicons/react/outline";
import { FaEllipsisV, FaTimes } from "react-icons/fa";
import CompanyFilter from "./CompanyFilter";
import ImportData from "./ImportData";
import ExportData from "./ExportData";

const statusColorMap = {
  complete: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-300",
    activeBg: "bg-green-100",
    tab: {
      active: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg",
      inactive: "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
    }
  },
  ongoing: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-300",
    activeBg: "bg-amber-100",
    tab: {
      active: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg",
      inactive: "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
    }
  },
  onhold: {
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    border: "border-cyan-300",
    activeBg: "bg-cyan-100",
    tab: {
      active: "bg-gradient-to-r from-cyan-400 to-cyan-500 text-white shadow-lg",
      inactive: "bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-200"
    }
  },
  cancel: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-300",
    activeBg: "bg-red-100",
    tab: {
      active: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg",
      inactive: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
    }
  },
  noapplications: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
    activeBg: "bg-gray-200",
    tab: {
      active: "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg",
      inactive: "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
    }
  }
};

const tabLabels = {
  complete: "Complete",
  ongoing: "Ongoing",
  onhold: "On Hold",
  cancel: "Cancelled",
  noapplications: "No Applications"
};

const borderColorMap = {
  complete: "border-l-4 border-green-500",
  ongoing: "border-l-4 border-amber-400",
  onhold: "border-l-4 border-cyan-400",
  cancel: "border-l-4 border-red-500",
  noapplications: "border-l-4 border-gray-400"
};

const headerColorMap = {
  complete: "bg-green-50 text-green-800 border-b border-green-200",
  ongoing: "bg-amber-50 text-amber-800 border-b border-amber-200",
  onhold: "bg-cyan-50 text-cyan-800 border-b border-cyan-200",
  cancel: "bg-red-50 text-red-800 border-b border-red-200",
  noapplications: "bg-gray-50 text-gray-800 border-b border-gray-200"
};

function CompanyDetails({ company, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-54">
      <div className="fixed inset-0  bg-opacity-50 backdrop-blur" onClick={onClose}></div>
      
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto z-50">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex justify-between items-center sticky top-0">
          <h2 className="text-lg font-semibold">Company Details</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-blue-700 transition">
            <XIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Company Name</label>
                <p className="mt-1 text-gray-900">{company.companyName || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Website</label>
                <p className="mt-1 text-gray-900">{company.companyWebsite || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">College</label>
                <p className="mt-1 text-gray-900">{company.college || "-"}</p>
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Eligibility Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Course</label>
                <p className="mt-1 text-gray-900">{company.course || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Specialization</label>
                <p className="mt-1 text-gray-900">{company.specialization || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Passing Year</label>
                <p className="mt-1 text-gray-900">{company.passingYear || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Marks Criteria</label>
                <p className="mt-1 text-gray-900">{company.marksCriteria || "-"}</p>
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Job Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Job Type</label>
                <p className="mt-1 text-gray-900">{company.jobType || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Designation</label>
                <p className="mt-1 text-gray-900">{company.jobDesignation || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Location</label>
                <p className="mt-1 text-gray-900">{company.jobLocation || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Salary</label>
                <p className="mt-1 text-gray-900">{company.salary ? `${company.salary} LPA` : "-"}</p>
              </div>
              {company.internshipDuration && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Internship Duration</label>
                  <p className="mt-1 text-gray-900">{company.internshipDuration} months</p>
                </div>
              )}
              {company.stipend && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Stipend</label>
                  <p className="mt-1 text-gray-900">₹{company.stipend} per month</p>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Other Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Mode of Interview</label>
                <p className="mt-1 text-gray-900">{company.modeOfInterview || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Joining Period</label>
                <p className="mt-1 text-gray-900">{company.joiningPeriod || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Mode of Work</label>
                <p className="mt-1 text-gray-900">{company.modeOfWork || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <p className="mt-1 text-gray-900 capitalize">{company.status || "-"}</p>
              </div>
            </div>
          </div>

          {company.jobDescription && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500">Job Description</label>
              <p className="mt-1 whitespace-pre-line text-gray-900">{company.jobDescription}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DropdownActions({
  companyId,
  companyData,
  closeDropdown,
  setSelectedCompany,
  updateCompanyStatus,
  activeTab,
  setShowStudentData,
  setSelectedStudentData
}) {
  return (
    <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-54">
      <div className="py-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCompany(companyData);
            closeDropdown();
          }}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
        >
          View Details
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedStudentData(companyData);
            setShowStudentData(true);
            closeDropdown();
          }}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
        >
          Student Data
        </button>
        {["complete", "ongoing", "onhold", "cancel", "noapplications"]
          .filter(status => status !== activeTab)
          .map((status) => (
            <button
              key={status}
              onClick={(e) => {
                e.stopPropagation();
                updateCompanyStatus(companyId, status);
              }}
              className={`block w-full text-left px-4 py-2 text-sm ${
                statusColorMap[status]?.text || "text-gray-700"
              } hover:bg-gray-100 transition`}
            >
              Mark as {status}
            </button>
          ))}
      </div>
    </div>
  );
}

function CompanyOpen() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [activeTab, setActiveTab] = useState("ongoing");
  const [loading, setLoading] = useState(true);
  const [showJDForm, setShowJDForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [filters, setFilters] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [error, setError] = useState(null);
  const [showStudentData, setShowStudentData] = useState(false);
  const [selectedStudentData, setSelectedStudentData] = useState(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getDocs(collection(db, "companies"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCompanies(data);
    } catch (err) {
      console.error("Error fetching companies:", err);
      setError("Failed to load companies. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const usersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const updateCompanyStatus = async (companyId, newStatus) => {
    try {
      const companyRef = doc(db, "companies", companyId);
      await updateDoc(companyRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      fetchCompanies();
      setDropdownOpen(null);
    } catch (error) {
      console.error("Error updating company status:", error);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchUsers();
  }, []);

  const filteredCompanies = companies
    .filter((company) => company.status === activeTab)
    .filter((company) =>
      company.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.jobDesignation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.jobLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.college?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((company) => {
      if (!filters || Object.keys(filters).length === 0) return true;
      
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        
        if (key === 'dateRange') {
          if (!value.start || !value.end) return true;
          const companyDate = new Date(company.createdAt?.seconds * 1000);
          const startDate = new Date(value.start);
          const endDate = new Date(value.end);
          return companyDate >= startDate && companyDate <= endDate;
        }
        
        if (key === 'assignedTo') {
          return company.assignedTo === value;
        }
        
        return company[key]?.toString().toLowerCase() === value.toString().toLowerCase();
      });
    });

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={fetchCompanies}
                className="mt-2 text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-sans">
      <div className="mx-auto p-6">
        {/* Sticky header section */}
        <div className="sticky top-0 z-40 bg-gradient-to-br from-gray-50 to-gray-100 pt-2 pb-4">
          {/* Search and filter row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
            <div className="relative flex-grow md:flex-grow-0 md:w-64">
              <input
                type="text"
                placeholder="Search Bar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <ImportData 
                show={showImportModal} 
                onClose={() => setShowImportModal(false)} 
                handleImportComplete={fetchCompanies}
              />
              
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12.5535 2.49392C12.4114 2.33852 12.2106 2.25 12 2.25C11.7894 2.25 11.5886 2.33852 11.4465 2.49392L7.44648 6.86892C7.16698 7.17462 7.18822 7.64902 7.49392 7.92852C7.79963 8.20802 8.27402 8.18678 8.55352 7.88108L11.25 4.9318V16C11.25 16.4142 11.5858 16.75 12 16.75C12.4142 16.75 12.75 16.4142 12.75 16V4.9318L15.4465 7.88108C15.726 8.18678 16.2004 8.20802 16.5061 7.92852C16.8118 7.64902 16.833 7.17462 16.5535 6.86892L12.5535 2.49392Z"/>
                  <path d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z"/>
                </svg>
                Import Data
              </button>

              <ExportData companies={companies} filteredCompanies={filteredCompanies} />

              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5" 
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Filter
                </button>
                
                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <CompanyFilter
                      filters={filters}
                      setFilters={setFilters}
                      isFilterOpen={isFilterOpen}
                      setIsFilterOpen={setIsFilterOpen}
                      users={users}
                      companies={companies}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowJDForm(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-2 rounded-xl font-semibold hover:opacity-90 transition-all shadow-md flex items-center whitespace-nowrap"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                    clipRule="evenodd"
                  />
                </svg>
                Add JD
              </button>
              <button
                onClick={() => setShowJDForm(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-2 rounded-xl font-semibold hover:opacity-90 transition-all shadow-md flex items-center whitespace-nowrap"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
                  <path d="M12 9c-1.66 0-3-1.34-3-3V4h6v2c0 1.66-1.34 3-3 3z"/>
                  <circle cx="12" cy="12" r="2" fill="#FFD700"/>
                </svg>
                Placed Student
              </button>
            </div>
          </div>

          {/* Status tabs row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {Object.keys(tabLabels).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-2 rounded-xl text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-[1.02] ${
                  activeTab === key
                    ? statusColorMap[key].tab.active
                    : statusColorMap[key].tab.inactive
                } ${
                  activeTab === key ? "ring-2 ring-offset-2 ring-opacity-50" : ""
                } ${
                  activeTab === key
                    ? key === "complete"
                      ? "ring-green-500"
                      : key === "ongoing"
                      ? "ring-amber-400"
                      : key === "onhold"
                      ? "ring-cyan-400"
                      : key === "cancel"
                      ? "ring-red-500"
                      : "ring-gray-500"
                    : ""
                }`}
              >
                {tabLabels[key]}{" "}
                <span className="ml-1 text-xs font-bold">
                  ({companies.filter(c => c.status === key).length})
                </span>
              </button>
            ))}
          </div>

          {/* Table header row */}
          <div
            className={`grid grid-cols-8 ${headerColorMap[activeTab]} text-sm font-medium px-4 py-2 rounded-lg`}
          >
            <div className="break-words">Company</div>
            <div className="break-words">College</div>
            <div className="break-words">Eligible</div>
            <div className="break-words">Source</div>
            <div className="break-words">Salary</div>
            <div className="break-words">Type</div>
            <div className="break-words">Date</div>
            <div className="text-center break-words">Actions</div>
          </div>
        </div>

        {/* Company rows */}
        <div className="mt-2 space-y-2">
          {filteredCompanies.length > 0 ? (
            filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="relative group cursor-pointer"
                onClick={() => setSelectedCompany(company)}
              >
                <div
                  className={`grid grid-cols-8 gap-4 p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-300 ${borderColorMap[activeTab]}`}
                >
                  <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                    {company.companyName || "-"}
                  </div>

                  <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis flex items-center h-full">
                    {company.college || "-"}
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

                  <div className="flex justify-center items-center gap-2">
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
                  <DropdownActions
                    companyId={company.id}
                    companyData={company}
                    closeDropdown={() => setDropdownOpen(null)}
                    setSelectedCompany={setSelectedCompany}
                    updateCompanyStatus={updateCompanyStatus}
                    activeTab={activeTab}
                    setShowStudentData={setShowStudentData}
                    setSelectedStudentData={setSelectedStudentData}
                  />
                )}
              </div>
            ))
          ) : (
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
              <p className="mt-1 text-gray-500">
                Get started by adding a new company
              </p>
              <button
                onClick={() => setShowJDForm(true)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Add Company
              </button>
            </div>
          )}
        </div>

        {selectedCompany && (
          <CompanyDetails
            company={selectedCompany}
            onClose={() => setSelectedCompany(null)}
          />
        )}

        {showStudentData && selectedStudentData && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowStudentData(false)}></div>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto z-50">
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex justify-between items-center sticky top-0">
                <h2 className="text-lg font-semibold">Student Data for {selectedStudentData.companyName}</h2>
                <button onClick={() => setShowStudentData(false)} className="p-1 rounded-full hover:bg-blue-700 transition">
                  <XIcon className="h-5 w-5 text-white" />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-700 mb-4">Applied Students</h3>
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 transition hover:shadow-md">
                        <p className="font-medium text-gray-900">Student Name: John Doe</p>
                        <p className="text-sm text-gray-600">Course: B.Tech (CSE)</p>
                        <p className="text-sm text-gray-600">Status: Applied</p>
                      </div>
                      <div className="border rounded-lg p-4 transition hover:shadow-md">
                        <p className="font-medium text-gray-900">Student Name: Jane Smith</p>
                        <p className="text-sm text-gray-600">Course: B.Tech (ECE)</p>
                        <p className="text-sm text-gray-600">Status: Interview Scheduled</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-700 mb-4">Selected Students</h3>
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-green-50 transition hover:shadow-md">
                        <p className="font-medium text-gray-900">Student Name: Alex Johnson</p>
                        <p className="text-sm text-gray-600">Course: B.Tech (CSE)</p>
                        <p className="text-sm text-gray-600">Status: Offered</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
                <button
                  onClick={() => setShowStudentData(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showJDForm && (
          <AddJD show={showJDForm} onClose={() => {
            setShowJDForm(false);
            fetchCompanies();
          }} />
        )}
      </div>
    </div>
  );
}

export default CompanyOpen;