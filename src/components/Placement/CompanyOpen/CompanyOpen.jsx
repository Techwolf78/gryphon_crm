import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import AddJD from "../AddJd/AddJD";
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
  const [globalMatchStats, setGlobalMatchStats] = useState({ total: 0, matched: 0 });

  // Fetch companies with student counts
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getDocs(collection(db, "companies"));
      const companiesData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const companyData = {
            id: doc.id,
            ...doc.data(),
          };
          
          // Pre-fetch student count for each company
          try {
            const companyCode = companyData.companyName?.replace(/\s+/g, '_').toUpperCase();
            if (companyCode) {
              const uploadsCollectionRef = collection(db, 'studentList', companyCode, 'uploads');
              const querySnapshot = await getDocs(uploadsCollectionRef);
              
              let totalStudents = 0;
              querySnapshot.forEach((uploadDoc) => {
                const uploadData = uploadDoc.data();
                if (uploadData.students && Array.isArray(uploadData.students)) {
                  totalStudents += uploadData.students.length;
                }
              });
              
              companyData.studentCount = totalStudents;
            }
          } catch (error) {
            console.error(`Error fetching student count for ${companyData.companyName}:`, error);
            companyData.studentCount = 0;
          }
          
          return companyData;
        })
      );
      
      setCompanies(companiesData);
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

  // Function to update round status
  const updateRoundStatus = async (companyId, roundIndex, newStatus, hiringRounds) => {
    try {
      // Update in Firebase
      const companyRef = doc(db, "companies", companyId);
      const companyDoc = companies.find(company => company.id === companyId);
      
      // Create updated roundStatus array
      const currentRoundStatus = companyDoc.roundStatus || [];
      const updatedRoundStatus = [...currentRoundStatus];
      updatedRoundStatus[roundIndex] = newStatus;
      
      await updateDoc(companyRef, {
        roundStatus: updatedRoundStatus,
        updatedAt: new Date()
      });

      // Update local state
      setCompanies(prev => prev.map(company =>
        company.id === companyId
          ? { 
              ...company, 
              roundStatus: updatedRoundStatus,
              updatedAt: new Date()
            }
          : company
      ));

      console.log(`Updated round status: ${hiringRounds[roundIndex]} -> ${newStatus}`);

    } catch (error) {
      console.error("Error updating round status:", error);
      alert("Failed to update round status. Please try again.");
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

  // Add this function in CompanyOpen component
  const fetchCompanyStudents = async (company) => {
    if (!company?.companyName) return [];
    
    try {
      const companyCode = company.companyName.replace(/\s+/g, '_').toUpperCase();
      const uploadsCollectionRef = collection(db, 'studentList', companyCode, 'uploads');
      
      const querySnapshot = await getDocs(uploadsCollectionRef);
      
      const allStudents = [];
      querySnapshot.forEach((doc) => {
        const uploadData = doc.data();
        if (uploadData.students && Array.isArray(uploadData.students)) {
          const studentsWithMeta = uploadData.students.map(student => ({
            ...student,
            uploadedAt: uploadData.uploadedAt,
            college: uploadData.college,
            uploadId: doc.id
          }));
          allStudents.push(...studentsWithMeta);
        }
      });
      
      return allStudents;
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  };

  // TrainingForms se students fetch karne ka function
  const fetchTrainingFormStudents = async (collegeName) => {
    console.log('fetchTrainingFormStudents called for college:', collegeName);
    
    if (!collegeName) return [];
    
    try {
      const collegeAbbr = getCollegeAbbreviation(collegeName);
      console.log('College abbreviation for fetching:', collegeAbbr);
      
      const trainingFormsSnapshot = await getDocs(collection(db, "trainingForms"));
      console.log('Training forms documents found:', trainingFormsSnapshot.docs.length);
      
      let allStudents = [];
      
      for (const docSnap of trainingFormsSnapshot.docs) {
        const docId = docSnap.id;
        console.log('Checking document:', docId, 'starts with:', collegeAbbr, '?', docId.startsWith(collegeAbbr));
        
        if (docId.startsWith(collegeAbbr)) {
          const studentsRef = collection(doc(db, "trainingForms", docId), "students");
          const studentsSnapshot = await getDocs(studentsRef);
          console.log('Students in document', docId, ':', studentsSnapshot.docs.length);
          
          const students = studentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          allStudents = [...allStudents, ...students];
        }
      }
      
      console.log('Total training form students fetched:', allStudents.length);
      return allStudents;
    } catch (error) {
      console.error("Error fetching training form students:", error);
      return [];
    }
  };

  // Function to delete unmatched student from backend
  const deleteUnmatchedStudent = async (student, company) => {
    if (!student || !company?.companyName) return;
    
    try {
      const companyCode = company.companyName.replace(/\s+/g, '_').toUpperCase();
      const uploadsCollectionRef = collection(db, 'studentList', companyCode, 'uploads');
      
      // Get all upload documents to find the one containing this student
      const querySnapshot = await getDocs(uploadsCollectionRef);
      
      let foundUploadDoc = null;
      let foundUploadId = null;
      
      // Search through all upload documents
      for (const uploadDoc of querySnapshot.docs) {
        const uploadData = uploadDoc.data();
        if (uploadData.students && Array.isArray(uploadData.students)) {
          const studentExists = uploadData.students.some(s => 
            s.email === student.email && s.studentName === student.studentName
          );
          if (studentExists) {
            foundUploadDoc = uploadDoc;
            foundUploadId = uploadDoc.id;
            break;
          }
        }
      }
      
      if (!foundUploadDoc) {
        console.error('Student not found in any upload document:', student.studentName);
        return;
      }
      
      const uploadData = foundUploadDoc.data();
      const updatedStudents = uploadData.students.filter(s => 
        !(s.email === student.email && s.studentName === student.studentName)
      );
      
      const uploadDocRef = doc(db, 'studentList', companyCode, 'uploads', foundUploadId);
      await updateDoc(uploadDocRef, {
        students: updatedStudents,
        updatedAt: new Date()
      });
      
      console.log('Student deleted successfully from backend:', student.studentName);
    } catch (error) {
      console.error('Error deleting student from backend:', error);
      alert('Failed to delete student. Please try again.');
    }
  };

  // Function to accept unmatched student - add to training forms
  const acceptUnmatchedStudent = async (student, company) => {
    console.log('acceptUnmatchedStudent called with student:', student.studentName, 'company:', company.companyName);
    
    if (!student || !company?.college) return;
    
    try {
      // Get college abbreviation
      const collegeAbbr = getCollegeAbbreviation(company.college);
      console.log('College abbreviation:', collegeAbbr);
      
      // Find the existing training form document for this college
      const trainingFormsSnapshot = await getDocs(collection(db, "trainingForms"));
      let targetDocId = null;
      
      for (const docSnap of trainingFormsSnapshot.docs) {
        const docId = docSnap.id;
        if (docId.startsWith(collegeAbbr)) {
          targetDocId = docId;
          break;
        }
      }
      
      if (!targetDocId) {
        // If no existing document found, create one with college abbreviation
        targetDocId = collegeAbbr;
        console.log('No existing training form document found, will create:', targetDocId);
      }
      
      console.log('Target training form document:', targetDocId);
      
      // Reference to training forms students collection
      const trainingStudentsRef = collection(db, 'trainingForms', targetDocId, 'students');
      console.log('Training students ref path:', `trainingForms/${targetDocId}/students`);
      
      // Check if student already exists in training forms
      const existingStudentsQuery = await getDocs(trainingStudentsRef);
      console.log('Existing students in training forms:', existingStudentsQuery.docs.length);
      const studentExists = existingStudentsQuery.docs.some(doc => {
        const data = doc.data();
        return data['EMAIL ID']?.toLowerCase().trim() === student.email?.toLowerCase().trim() || 
               data['FULL NAME OF STUDENT']?.toLowerCase().trim() === student.studentName?.toLowerCase().trim();
      });
      
      if (studentExists) {
        alert('Student already exists in training data!');
        console.log('Student already exists in training forms:', student.studentName);
        return;
      }
      
      // Map upload student data to training forms schema
      const trainingStudentData = {
        'FULL NAME OF STUDENT': student.studentName,
        'EMAIL ID': student.email,
        'PHONE NUMBER': student.phone || '',
        'ENROLLMENT NUMBER': student.enrollmentNo || '',
        'COURSE': student.course || '',
        'SPECIALIZATION': student.specialization || '',
        'CURRENT YEAR': student.currentYear || '',
        '10TH MARKS %': student.tenthMarks || '',
        '12TH MARKS %': student.twelfthMarks || '',
        'CGPA': student.cgpa || '',
        'ACTIVE BACKLOGS': student.activeBacklogs || 0,
        'GENDER': student.gender || '',
        'COLLEGE': student.college || company.college,
        'STATUS': 'active',
        'CREATED_AT': new Date(),
        'ACCEPTED_FROM_COMPANY': company.companyName,
        'SOURCE': 'manual_acceptance'
      };
      
      console.log('Adding student data to training forms:', trainingStudentData);
      // Add to training forms
      await addDoc(trainingStudentsRef, trainingStudentData);
      
      // Add a small delay to ensure Firestore consistency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Student accepted and added to training forms:', student.studentName);
      
      // Optional: Update status in upload document to mark as accepted
      try {
        const companyCode = company.companyName.replace(/\s+/g, '_').toUpperCase();
        const uploadsCollectionRef = collection(db, 'studentList', companyCode, 'uploads');
        const querySnapshot = await getDocs(uploadsCollectionRef);
        
        for (const uploadDoc of querySnapshot.docs) {
          const uploadData = uploadDoc.data();
          if (uploadData.students && Array.isArray(uploadData.students)) {
            const studentIndex = uploadData.students.findIndex(s => 
              s.email === student.email && s.studentName === student.studentName
            );
            if (studentIndex !== -1) {
              // Mark student as accepted in upload document
              uploadData.students[studentIndex].acceptedStatus = 'accepted';
              uploadData.students[studentIndex].acceptedAt = new Date();
              
              const uploadDocRef = doc(db, 'studentList', companyCode, 'uploads', uploadDoc.id);
              await updateDoc(uploadDocRef, {
                students: uploadData.students,
                updatedAt: new Date()
              });
              console.log('Updated acceptance status in upload document for:', student.studentName);
              break;
            }
          }
        }
      } catch (updateError) {
        console.warn('Could not update acceptance status in upload document:', updateError);
        // Don't fail the whole operation for this
      }
      
    } catch (error) {
      console.error('Error accepting student:', error);
      alert('Failed to accept student. Please try again.');
    }
  };

  const handleMatchStatsUpdate = (stats) => {
    setGlobalMatchStats(stats);
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
          matchStats={globalMatchStats}
        />

        <CompanyTable
          filteredCompanies={filteredCompanies}
          activeTab={activeTab}
          setSelectedCompany={setSelectedCompany}
          dropdownOpen={dropdownOpen}
          setDropdownOpen={setDropdownOpen}
          setShowJDForm={setShowJDForm}
          updateCompanyStatus={updateCompanyStatus}
          updateRoundStatus={updateRoundStatus}
          fetchCompanyStudents={fetchCompanyStudents}
          fetchTrainingFormStudents={fetchTrainingFormStudents}
          onMatchStatsUpdate={handleMatchStatsUpdate}
          deleteUnmatchedStudent={deleteUnmatchedStudent}
          acceptUnmatchedStudent={acceptUnmatchedStudent}
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