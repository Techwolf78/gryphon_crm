import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, writeBatch, query, where } from "firebase/firestore";
import { toast } from 'react-toastify';
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
  const [searchTerm, setSearchTerm] = useState("");
  const [globalMatchStats, setGlobalMatchStats] = useState({ total: 0, matched: 0 });
  const [showPlacedStudentDashboard, setShowPlacedStudentDashboard] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  
  // ✅ NEW STATES for CompanyTable logic
  const [companyStudentsData, setCompanyStudentsData] = useState({});
  const [companyMatchStats, setCompanyMatchStats] = useState({});
  const [roundStudents, setRoundStudents] = useState(() => {
    try {
      const saved = localStorage.getItem('placementRoundSelections');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading round selections from localStorage:', error);
      return {};
    }
  });

  // ✅ Function to get students for a specific round (CARRY-FORWARD)
  const getStudentsForRound = useCallback((companyId, roundIndex, companyStudents) => {
    if (roundIndex === 0) {
      // First round - all students are eligible
      return companyStudents;
    }
    // For subsequent rounds, only students selected in previous round are eligible
    const previousRoundStudents = roundStudents[companyId]?.[roundIndex - 1];
    if (!previousRoundStudents || previousRoundStudents.length === 0) {
      // Try to fallback to selections persisted in company doc (DB)
      const companyFromProps = companies.find(c => c.id === companyId);
      const dbPrev = companyFromProps?.roundSelections?.[roundIndex - 1];
      if (dbPrev && dbPrev.length > 0) {
        // Match by email or studentName
        return companyStudents.filter((student) => {
          const studEmail = (student.email || '').toLowerCase().trim();
          const studName = (student.studentName || '').toLowerCase().trim();
          return dbPrev.some(selected => {
            const selEmail = (selected.email || '').toLowerCase().trim();
            const selName = (selected.studentName || '').toLowerCase().trim();
            return (selEmail && selEmail === studEmail) || (selName && selName === studName);
          });
        });
      }
      return [];
    }

    // Filter companyStudents based on previous round selection
    return companyStudents.filter((student) => {
      return previousRoundStudents.some(selected => 
        selected.studentName === student.studentName && selected.email === student.email
      );
    });
  }, [roundStudents, companies]);

  // ✅ NEW: Function to check placed students
  const checkAlreadyPlacedStudents = async (students, collegeName) => {
    if (!students || students.length === 0 || !collegeName) return students;

    try {
      const placedQuery = query(
        collection(db, 'placedStudents'),
        where('college', '==', collegeName)
      );
      
      const placedSnapshot = await getDocs(placedQuery);
      const placedStudents = placedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Create lookup map for placed students
      const placedMap = new Map();
      placedStudents.forEach(placed => {
        // Use email + name as unique key
        const emailKey = (placed.email || '').toLowerCase().trim();
        const nameKey = (placed.studentName || '').toLowerCase().trim();
        if (emailKey) placedMap.set(emailKey, true);
        if (nameKey) placedMap.set(nameKey, true);
      });

      // Filter out already placed students
      return students.filter(student => {
        const studentEmail = (student.email || '').toLowerCase().trim();
        const studentName = (student.studentName || '').toLowerCase().trim();
        
        return !placedMap.has(studentEmail) && !placedMap.has(studentName);
      });
    } catch (error) {
      console.error("Error checking placed students:", error);
      return students;
    }
  };

  // ✅ Function to handle round student selection
  const handleRoundStudentSelection = (
    companyId,
    roundIndex,
    selectedStudentIds
  ) => {
    setRoundStudents((prev) => {
      const updated = {
        ...prev,
        [companyId]: {
          ...prev[companyId],
          [roundIndex]: selectedStudentIds,
        },
      };

      // Save to localStorage
      try {
        localStorage.setItem('placementRoundSelections', JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving round selections to localStorage:', error);
      }

      return updated;
    });
  };

  // ✅ Student modal state and functions
  const [studentModalData, setStudentModalData] = useState({
    isOpen: false,
    students: [],
    roundName: "",
    currentSelected: [],
    companyId: null,
    roundIndex: null
  });

  // ✅ Function to open student modal (used by CompanyTable)
  const handleOpenStudentModal = useCallback(async (eligibleStudents, roundName, currentSelected, companyId, roundIndex) => {
    // Find the company object
    const company = companies.find(c => c.id === companyId);
    
    if (!company) return;

    // Ensure students are loaded
    let companyStudents = companyStudentsData[companyId];
    if (!companyStudents) {
      try {
        companyStudents = await fetchCompanyStudents(company);
        setCompanyStudentsData((prev) => ({
          ...prev,
          [companyId]: companyStudents,
        }));
      } catch (error) {
        console.error("Error loading students for modal:", error);
        companyStudents = [];
      }
    }

    // Get eligible students for this round
    let finalEligibleStudents = companyStudents ? 
      getStudentsForRound(companyId, roundIndex, companyStudents) : 
      eligibleStudents;

    // Step 1: Filter out unmatched students
    finalEligibleStudents = finalEligibleStudents.filter((s) => {
      if (s.matchStatus) return s.matchStatus !== 'unmatched';
      const unmatched = companyMatchStats[companyId]?.unmatched || [];
      const key = `${(s.email || '').toLowerCase().trim()}|${(s.studentName || '').toLowerCase().trim()}`;
      const unmatchedKeys = new Set(unmatched.map(u => 
        `${(u.email || '').toLowerCase().trim()}|${(u.studentName || '').toLowerCase().trim()}`
      ));
      return !unmatchedKeys.has(key);
    });

    // Step 2: Filter out already placed students (NEW LOGIC)
    if (company.college && finalEligibleStudents.length > 0) {
      try {
        finalEligibleStudents = await checkAlreadyPlacedStudents(finalEligibleStudents, company.college);
      } catch (error) {
        console.error("Error filtering placed students:", error);
      }
    }

    // ✅ Always open modal with filtered students
    setStudentModalData({
      isOpen: true,
      students: finalEligibleStudents,
      roundName,
      currentSelected,
      companyId,
      roundIndex
    });
  }, [companies, companyStudentsData, companyMatchStats, getStudentsForRound]);

  // ✅ Handle student selection from modal
  const handleStudentSelection = useCallback(async (selectedStudents) => {
    const companyIdForSave = studentModalData.companyId;
    const roundIndexForSave = studentModalData.roundIndex;
    
    if (companyIdForSave !== null && roundIndexForSave !== null) {
      handleRoundStudentSelection(
        companyIdForSave,
        roundIndexForSave,
        selectedStudents
      );
    }
    
    setStudentModalData({
      isOpen: false,
      students: [],
      roundName: "",
      currentSelected: [],
      companyId: null,
      roundIndex: null
    });

    // Persist selection to backend if function provided
    try {
      if (typeof saveRoundSelection === 'function') {
        await saveRoundSelection(companyIdForSave, roundIndexForSave, selectedStudents);
      }
    } catch (error) {
      console.error('Error saving round selection via prop:', error);
    }
  }, [studentModalData.companyId, studentModalData.roundIndex]);

  // ✅ Close student modal
  const closeStudentModal = () => {
    setStudentModalData(prev => ({ ...prev, isOpen: false }));
  };

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
          
          // Pre-fetch student count for each company (college-specific)
          try {
            const companyCode = companyData.companyName?.replace(/\s+/g, '_').toUpperCase();
            if (companyCode) {
              const uploadsCollectionRef = collection(db, 'studentList', companyCode, 'uploads');
              const querySnapshot = await getDocs(uploadsCollectionRef);
              
              let collegeStudents = 0;
              querySnapshot.forEach((uploadDoc) => {
                const uploadData = uploadDoc.data();
                // Only count students uploaded by this specific college
                if (uploadData.college === companyData.college && 
                    uploadData.students && Array.isArray(uploadData.students)) {
                  collegeStudents += uploadData.students.length;
                }
              });
              
              companyData.studentCount = collegeStudents;
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
            formDocId: docId,
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

  // Save selected students for a company round to Firestore
  const saveRoundSelection = async (companyId, roundIndex, selectedStudents) => {
    try {
      const companyRef = doc(db, "companies", companyId);

      // Build array of minimal student data (email, studentName, uploadId, trainingFormId if present)
      const payload = (selectedStudents || []).map(s => ({
        studentName: s.studentName || s['FULL NAME OF STUDENT'] || s.name || '',
        email: s.email || s['EMAIL ID'] || '',
        uploadId: s.uploadId || null,
        trainingFormId: s.formDocId || null,
        studentDocId: s.id || null
      }));

      // Read current company's roundSelections (if any)
      const companyData = companies.find(c => c.id === companyId) || {};
      const existingSelections = companyData.roundSelections || {};
      const updatedSelections = { ...existingSelections, [roundIndex]: payload };

      await updateDoc(companyRef, { roundSelections: updatedSelections, updatedAt: new Date() });

      toast.success('Saved selections for the round successfully');

      // Update local state for companies
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, roundSelections: updatedSelections, updatedAt: new Date() } : c));

      // If this is the final round AND the round status for this index is "completed", mark the selected students as placed
      const hiringRoundsLength = (companyData?.hiringRounds || []).length;
      const currentRoundStatus = (companyData?.roundStatus || [])[roundIndex];
      if (roundIndex === hiringRoundsLength - 1 && currentRoundStatus === 'completed') {
        await finalizePlacedStudents(companyData, payload);
      }

      return true;
    } catch (error) {
      console.error("Error saving round selection to DB:", error);
      toast.error('Failed to save round selection. Please try again.');
      return false;
    }
  };

  // Finalize placed students by updating training form docs and creating placedStudents entries
  const finalizePlacedStudents = async (company, selectedStudents) => {
    if (!company || !selectedStudents || selectedStudents.length === 0) return;

    try {
      const batch = writeBatch(db);
      // Fetch training form students to map by email
      const trainingFormStudents = await fetchTrainingFormStudents(company.college);
      const trainingByEmail = {};
      trainingFormStudents.forEach(tf => {
        const emailKey = (tf['EMAIL ID'] || tf.email || '').toLowerCase().trim();
        if (emailKey) trainingByEmail[emailKey] = tf;
      });

      let addedCount = 0;

      // Build existing placements set for this company to avoid duplicates with single query
      const existingPlacedQuery = query(collection(db, 'placedStudents'), where('companyId', '==', company.id));
      const existingSnapshot = await getDocs(existingPlacedQuery);
      const existingSet = new Set(existingSnapshot.docs.map(d => ((d.data().email || '') + '').toLowerCase().trim()));

      for (const s of selectedStudents) {
        const emailKey = (s.email || '').toLowerCase().trim();
        const placedData = {
          studentName: s.studentName || '',
          email: s.email || '',
          college: company.college || '',
          companyName: company.companyName || '',
          jobDesignation: company.jobDesignation || '',
          salary: company.salary || company.stipend || null,
          placedDate: new Date(),
          companyId: company.id,
          status: 'Placed',
        };

        // Deduplicate: check if placedStudents already contains this email + companyId
        try {
          const emailKey = (placedData.email || '').toLowerCase().trim();
          if (!existingSet.has(emailKey)) {
            const placedCollectionRef = collection(db, 'placedStudents');
            const newPlacedDocRef = doc(placedCollectionRef); // get auto-id
            batch.set(newPlacedDocRef, placedData);
            existingSet.add(emailKey);
            addedCount += 1;
          }
        } catch (err) {
          console.error('Error checking placed students duplicate:', err);
        }

        // Update training form student doc if present
        const tf = trainingByEmail[emailKey];
        if (tf && tf.formDocId && tf.id) {
          const studentDocRef = doc(db, 'trainingForms', tf.formDocId, 'students', tf.id);
          batch.update(studentDocRef, { placement: { ...placedData, placedDate: new Date() }, isPlaced: true });
        }
      }

      // Commit batched updates to training student docs and added placed students
      await batch.commit();
      // Refresh companies to reflect new roundSelections and counts
      fetchCompanies();
      if (addedCount > 0) {
        toast.success(`Marked ${addedCount} student(s) as placed in ${company.companyName}`);
      } else {
        toast.info(`No new placements were added (duplicates skipped).`);
      }
      toast.success(`Marked ${selectedStudents.length} student(s) as placed in ${company.companyName}`);
    } catch (error) {
      console.error('Error finalizing placed students:', error);
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

      // If this is the last round and it was marked completed, try to finalize placements
      const hiringRoundsLen = (companyDoc?.hiringRounds || []).length;
      if (roundIndex === hiringRoundsLen - 1 && newStatus === 'completed') {
        // Look up saved selections for this company and round
        const companySelections = companyDoc.roundSelections || {};
        const selectedForFinal = companySelections[roundIndex] || [];
        if (!selectedForFinal || selectedForFinal.length === 0) {
          // No selections saved; none to finalize
          console.warn('No selections found for final round; skipping finalize.');
          toast.warn('No student selections saved for the final round. Please select students before marking the final round as completed.');
        } else {
          // Finalize placements using stored selection
          await finalizePlacedStudents(companyDoc, selectedForFinal);
        }
      }

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
    if (!company?.companyName || !company?.college) return [];
    
    try {
      const companyCode = company.companyName.replace(/\s+/g, '_').toUpperCase();
      const uploadsCollectionRef = collection(db, 'studentList', companyCode, 'uploads');
      
      const querySnapshot = await getDocs(uploadsCollectionRef);
      
      const collegeStudents = [];
      querySnapshot.forEach((doc) => {
        const uploadData = doc.data();
        // Only include students uploaded by this specific college
        if (uploadData.college === company.college && 
            uploadData.students && Array.isArray(uploadData.students)) {
          // Normalize each uploaded student to standard keys so matching works
          const studentsWithMeta = uploadData.students.map(student => {
            const normalized = {
              // Prefer common camelCase keys if present, otherwise attempt various capitalized names
              studentName: student.studentName || student.name || student['FULL NAME OF STUDENT'] || student['full name of student'] || student['Full Name of Student'] || '',
              email: student.email || student['EMAIL ID'] || student['email id'] || student['Email ID'] || student.emailId || '',
              phone: student.phone || student.mobile || student['PHONE NUMBER'] || student.phoneNumber || '',
              enrollmentNo: student.enrollmentNo || student.enrollment || student['ENROLLMENT NUMBER'] || '',
              course: student.course || student['COURSE'] || student.degree || '',
              specialization: student.specialization || student['SPECIALIZATION'] || student.branch || '',
              activeBacklogs: student.activeBacklogs || student['ACTIVE BACKLOGS'] || student.backlogs || 0,
              status: student.status || student.STATUS || 'submitted',
              // Keep raw upload object so debugging is easy
              _raw: student,
            };

            return {
              ...normalized,
              uploadedAt: uploadData.uploadedAt,
              college: uploadData.college,
              uploadId: doc.id,
            };
          });
          collegeStudents.push(...studentsWithMeta);
        }
      });
      
      return collegeStudents;
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  };

  // TrainingForms se students fetch karne ka function
  const fetchTrainingFormStudents = async (collegeName) => {
    if (!collegeName) return [];
    
    try {
      const collegeAbbr = getCollegeAbbreviation(collegeName);
      
      const trainingFormsSnapshot = await getDocs(collection(db, "trainingForms"));
      
      let allStudents = [];
      
      for (const docSnap of trainingFormsSnapshot.docs) {
        const docId = docSnap.id;
        
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
      
      return allStudents;
    } catch (error) {
      console.error("Error fetching training form students:", error);
      return [];
    }
  };

const checkStudentMatches = async (company) => {
  if (!company?.companyName || !company?.college)
    return { matched: 0, total: 0, unmatched: [] };

  try {
    const studentListStudents = await fetchCompanyStudents(company);
    const trainingFormStudents = await fetchTrainingFormStudents(company.college);
    
    const unmatchedStudents = [];

    // Normalize fields
    const normalizeName = (s) => ((s && (s.studentName || s.name || s['FULL NAME OF STUDENT'] || '')) + '').toLowerCase().trim();
    const normalizeEmail = (s) => ((s && (s.email || s['EMAIL ID'] || '')) + '').toLowerCase().trim();

    studentListStudents.forEach((studentListStudent) => {
      const matched = trainingFormStudents.some((trainingStudent) => {
        return normalizeName(studentListStudent) === normalizeName(trainingStudent) ||
               normalizeEmail(studentListStudent) === normalizeEmail(trainingStudent);
      });

      if (!matched) {
        unmatchedStudents.push({
          ...studentListStudent,
          matchStatus: "unmatched",
        });
      }
    });

    const result = {
      matched: studentListStudents.length - unmatchedStudents.length,
      total: studentListStudents.length,
      unmatched: unmatchedStudents,
    };

    // Update local state
    setCompanyMatchStats((prev) => ({
      ...prev,
      [company.id]: result,
    }));

    // Update global stats
    setGlobalMatchStats(prev => ({
      total: prev.total + studentListStudents.length,
      matched: prev.matched + (studentListStudents.length - unmatchedStudents.length)
    }));

    // Update student data with match status
    setCompanyStudentsData((prev) => {
      const students = prev[company.id] || studentListStudents;
      const unmatchedKeys = new Set(unmatchedStudents.map(u => 
        ((u.email || u.studentName || '') + '').toLowerCase().trim()
      ));
      
      const updatedStudents = students.map((s) => ({
        ...s,
        matchStatus: unmatchedKeys.has(((s.email || s.studentName || '') + '').toLowerCase().trim()) 
          ? 'unmatched' 
          : 'matched'
      }));

      return { ...prev, [company.id]: updatedStudents };
    });

    return result;
  } catch (error) {
    console.error("Error matching students:", error);
    return { matched: 0, total: 0, unmatched: [] };
  }
};
  const handleMatchStatsUpdate = (stats) => {
    setGlobalMatchStats(stats);
  };

  // Handle editing a JD
  const handleEditJD = (company) => {
    setEditingCompany(company);
    setShowJDForm(true);
  };

  // Fetch companies and users on component mount
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

  // ✅ Import StudentSelectionModal component
  const StudentSelectionModal = React.lazy(() => import('./StudentSelectionModal'));

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
        {showPlacedStudentDashboard ? (
          <PlacedStudent onClose={() => setShowPlacedStudentDashboard(false)} />
        ) : (
          <>
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
              fetchCompanies={fetchCompanies}
              matchStats={globalMatchStats}
              showPlacedStudentDashboard={showPlacedStudentDashboard}
              setShowPlacedStudentDashboard={setShowPlacedStudentDashboard}
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
              onEditJD={handleEditJD}
              saveRoundSelection={saveRoundSelection}
              // ✅ Pass new props
              companyMatchStats={companyMatchStats}
              setCompanyMatchStats={setCompanyMatchStats}
              companyStudentsData={companyStudentsData}
              setCompanyStudentsData={setCompanyStudentsData}
              checkStudentMatches={checkStudentMatches}
              getStudentsForRound={getStudentsForRound}
              handleOpenStudentModal={handleOpenStudentModal}
              handleRoundStudentSelection={handleRoundStudentSelection}
              checkAlreadyPlacedStudents={checkAlreadyPlacedStudents}
            />
          </>
        )}

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
          <AddJD 
            show={showJDForm} 
            onClose={() => {
              setShowJDForm(false);
              setEditingCompany(null);
              fetchCompanies();
            }}
            company={editingCompany}
            fetchCompanies={fetchCompanies}
          />
        )}

        {/* ✅ Student Selection Modal */}
        {studentModalData.isOpen && (
          <React.Suspense fallback={<div>Loading modal...</div>}>
            <StudentSelectionModal
              isOpen={studentModalData.isOpen}
              onClose={closeStudentModal}
              students={studentModalData.students}
              roundName={studentModalData.roundName}
              currentSelected={studentModalData.currentSelected}
              onStudentsSelect={handleStudentSelection}
            />
          </React.Suspense>
        )}
      </div>
    </div>
  );
}

export default CompanyOpen;