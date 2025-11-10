import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import AddJD from "../AddJd/AddJD";
import { XIcon } from "@heroicons/react/outline";
import CompanyDetailsModal from "./CompanyDetailsModal";
import CompanyHeader from "./CompanyHeader";
import CompanyTable from "./CompanyTable";
import PlacedStudent from "./PlacedStudent";

// Function to get college abbreviation
const getCollegeAbbreviation = (collegeName) => {
  if (!collegeName) return null;
  return collegeName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
};

function CompanyOpen() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [activeTab, setActiveTab] = useState("ongoing");
  const [loading, setLoading] = useState(true);
  const [showJDForm, setShowJDForm] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [filters, setFilters] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showPlacedStudent, setShowPlacedStudent] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  const fetchStudents = async () => {
    if (!selectedCompany || !selectedCompany.college) {
      return;
    }

    try {
      setLoadingStudents(true);

      const collegeAbbr = getCollegeAbbreviation(selectedCompany.college);

      // Fetch trainingForms collection
      const trainingFormsSnapshot = await getDocs(collection(db, "trainingForms"));

      let allStudents = [];

      for (const docSnap of trainingFormsSnapshot.docs) {
        const docId = docSnap.id;

        // Only consider documents where collegeAbbr matches
        if (docId.startsWith(collegeAbbr)) {
          const studentsRef = collection(doc(db, "trainingForms", docId), "students");
          const studentsSnapshot = await getDocs(studentsRef);

          const students = studentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          allStudents = [...allStudents, ...students];
        }
      }

      setStudents(allStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const updateCompanyStatus = async (companyId, newStatus) => {
    try {
      // Mark as transitioning for animation
      setCompanies(prev => prev.map(company =>
        company.id === companyId
          ? { ...company, isTransitioning: true }
          : company
      ));

      // Update in Firebase
      const companyRef = doc(db, "companies", companyId);
      await updateDoc(companyRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      // Switch to the new status tab immediately for smooth UX
      setActiveTab(newStatus);

      // Update local state optimistically
      setCompanies(prev => prev.map(company =>
        company.id === companyId
          ? { ...company, status: newStatus, isTransitioning: false, updatedAt: new Date() }
          : company
      ));

      // Close dropdown immediately
      setDropdownOpen(null);

    } catch (error) {
      console.error("Error updating company status:", error);
      // Revert transition state on error
      setCompanies(prev => prev.map(company =>
        company.id === companyId
          ? { ...company, isTransitioning: false }
          : company
      ));
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchUsers();
  }, []);

  const filteredCompanies = useMemo(() => {
    return companies
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
          if (!value || value.length === 0) return true;
          
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
          
          if (key === 'course') {
            return value.includes(company.course);
          }
          
          if (key === 'specialization') {
            return value.includes(company.specialization);
          }
          
          if (key === 'passingYear') {
            return value.includes(company.passingYear);
          }
          
          return company[key]?.toString().toLowerCase() === value.toString().toLowerCase();
        });
      });
  }, [companies, activeTab, searchTerm, filters]);

  if (loading) {
    return (
      <div className="bg-linear-to-br from-gray-50 to-gray-100 min-h-screen p-2 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-linear-to-br from-gray-50 to-gray-100 min-h-screen p-2">
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={fetchCompanies}
                className="mt-1 text-sm text-red-500 hover:text-red-700 font-medium"
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
    <div className="bg-linear-to-br from-gray-50 to-gray-100 min-h-screen font-sans">
      <div className="mx-auto p-0">
        <CompanyHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          companies={companies}
          filteredCompanies={filteredCompanies}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          filters={filters}
          setFilters={setFilters}
          users={users}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setShowJDForm={setShowJDForm}
          setShowPlacedStudent={setShowPlacedStudent}
          fetchCompanies={fetchCompanies}
        />

        <CompanyTable
          filteredCompanies={filteredCompanies}
          activeTab={activeTab}
          setSelectedCompany={setSelectedCompany}
          dropdownOpen={dropdownOpen}
          setDropdownOpen={setDropdownOpen}
          setShowJDForm={setShowJDForm}
          updateCompanyStatus={updateCompanyStatus}
        />

        {selectedCompany && (
          <CompanyDetailsModal
            company={selectedCompany}
            onClose={() => {
              setSelectedCompany(null);
              setStudents([]);
            }}
            fetchStudents={fetchStudents}
            students={students}
            loadingStudents={loadingStudents}
          />
        )}

        {showJDForm && (
          <AddJD show={showJDForm} onClose={() => {
            setShowJDForm(false);
            fetchCompanies();
          }} />
        )}

        {showPlacedStudent && (
          <PlacedStudent
            show={showPlacedStudent}
            onClose={() => setShowPlacedStudent(false)}
          />
        )}
      </div>
    </div>
  );
}

export default CompanyOpen;
