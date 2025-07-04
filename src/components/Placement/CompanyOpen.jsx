import React, { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import AddJD from "./AddJD";
import { XIcon } from "@heroicons/react/outline";
import CompanyFilter from "./CompanyFilter";
import ImportData from "./ImportData";
import ExportData from "./ExportData";

const statusColorMap = {
  cancel: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-300",
    activeBg: "bg-red-100",
  },
  ongoing: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-300",
    activeBg: "bg-amber-100",
  },
  onhold: {
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    border: "border-cyan-300",
    activeBg: "bg-cyan-100",
  },
  complete: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-300",
    activeBg: "bg-green-100",
  },
  noapplications: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
    activeBg: "bg-gray-200",
  },
};

function CompanyDetails({ company, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex justify-between items-center sticky top-0">
          <h2 className="text-lg font-semibold">Company Details</h2>
          <button onClick={onClose}>
            <XIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Information */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Company Name</label>
                <p className="mt-1">{company.companyName || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Website</label>
                <p className="mt-1">{company.companyWebsite || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">College</label>
                <p className="mt-1">{company.college || "-"}</p>
              </div>
            </div>
          </div>

          {/* Eligibility Criteria */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Eligibility Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Course</label>
                <p className="mt-1">{company.course || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Specialization</label>
                <p className="mt-1">{company.specialization || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Passing Year</label>
                <p className="mt-1">{company.passingYear || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Marks Criteria</label>
                <p className="mt-1">{company.marksCriteria || "-"}</p>
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Job Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Job Type</label>
                <p className="mt-1">{company.jobType || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Designation</label>
                <p className="mt-1">{company.jobDesignation || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Location</label>
                <p className="mt-1">{company.jobLocation || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Salary</label>
                <p className="mt-1">{company.salary ? `${company.salary} LPA` : "-"}</p>
              </div>
              {company.internshipDuration && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Internship Duration</label>
                  <p className="mt-1">{company.internshipDuration} months</p>
                </div>
              )}
              {company.stipend && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Stipend</label>
                  <p className="mt-1">₹{company.stipend} per month</p>
                </div>
              )}
            </div>
          </div>

          {/* Other Information */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Other Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Mode of Interview</label>
                <p className="mt-1">{company.modeOfInterview || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Joining Period</label>
                <p className="mt-1">{company.joiningPeriod || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Mode of Work</label>
                <p className="mt-1">{company.modeOfWork || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <p className="mt-1 capitalize">{company.status || "-"}</p>
              </div>
            </div>
          </div>

          {company.jobDescription && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500">Job Description</label>
              <p className="mt-1 whitespace-pre-line">{company.jobDescription}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
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
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
    <div className="p-6">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex gap-2">
  <ImportData 
    show={showImportModal} 
    onClose={() => setShowImportModal(false)} 
    handleImportComplete={fetchCompanies}
  />
  
  <button
    onClick={() => setShowImportModal(true)}
    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
  >
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
    Import Data
  </button>

  <ExportData companies={companies} />

  <button
  onClick={() => setIsFilterOpen(!isFilterOpen)}
  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
>
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-5 w-5" 
    viewBox="0 0 512 512"
    fill="currentColor"  // Will match your text-gray-700 color
  >
    <path d="M487.976 0H24.028C2.71 0-8.047 25.866 7.058 40.971L192 225.941V432c0 7.831 3.821 15.17 10.237 19.662l80 55.98C298.02 518.69 320 507.493 320 487.98V225.941l184.947-184.97C520.021 25.896 509.338 0 487.976 0z"/>
  </svg>
  Filter
</button>
</div>
          
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-1.5 border rounded-md w-full md:w-64"
          />
          
          <button
            onClick={() => setShowJDForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-1.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-md flex items-center whitespace-nowrap"
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
        </div>
      </div>

      {isFilterOpen && (
        <CompanyFilter
          filters={filters}
          setFilters={setFilters}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          users={users}
          companies={companies}
        />
      )}

      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        {["ongoing", "onhold", "complete", "cancel", "noapplications"].map((tab) => {
          const colors = statusColorMap[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold border ${colors.border} ${
                activeTab === tab
                  ? `${colors.activeBg} ${colors.text} font-bold`
                  : `${colors.bg} ${colors.text}`
              } whitespace-nowrap`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-1 font-normal">
                ({companies.filter((company) => company.status === tab).length})
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto border rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{company.companyName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{company.college}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">{company.jobDesignation}</div>
                    <div className="text-sm text-gray-500">{company.course} ({company.specialization})</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.source || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.jobType}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        statusColorMap[company.status]?.bg || "bg-gray-100"
                      } ${statusColorMap[company.status]?.text || "text-gray-800"}`}
                    >
                      {company.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
                    <div className="flex items-center justify-end">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(dropdownOpen === company.id ? null : company.id);
                          }}
                          className="inline-flex justify-center items-center text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100"
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        
                        {dropdownOpen === company.id && (
                          <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCompany(company);
                                  setDropdownOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                View Details
                              </button>
                              {["ongoing", "onhold", "complete", "cancel", "noapplications"]
                                .filter(status => status !== company.status)
                                .map((status) => (
                                  <button
                                    key={status}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateCompanyStatus(company.id, status);
                                    }}
                                    className={`block w-full text-left px-4 py-2 text-sm ${
                                      statusColorMap[status]?.text || "text-gray-700"
                                    } hover:${statusColorMap[status]?.activeBg || "bg-gray-100"}`}
                                  >
                                    Mark as {status}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center justify-center py-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-700">No matching companies found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm.trim() ? 
                        `No companies match your search for "${searchTerm}"` : 
                        "No companies available in this category"}
                    </p>
                    {searchTerm.trim() && (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          fetchCompanies();
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCompany && (
        <CompanyDetails
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      {showJDForm && (
        <AddJD show={showJDForm} onClose={() => {
          setShowJDForm(false);
          fetchCompanies();
        }} />
      )}
    </div>
  );
}

export default CompanyOpen;