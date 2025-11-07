import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from 'use-debounce';
import AddLeads from "./AddLeads";
import BulkUploadModal from "./BulkUploadModal";
import AddJD from "../AddJd/AddJD"; // ✅ adjust the relative path

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import LeadsHeader from "./LeadsHeader";
import LeadsFilters from "./LeadsFilters";
import LeadsTable from "./LeadsTable";
import LeadViewEditModal from "./LeadViewEditModal";
import FollowUpCompany from "./FollowUpCompany";
import { useAuth } from "../../../context/AuthContext";

  // Utility function to handle Firestore index errors
  const handleFirestoreIndexError = (error, operation = "operation") => {
    console.error(`❌ Firestore Index Error in ${operation}:`, error);

    if (error.message && error.message.includes('index')) {
      console.error("🔍 Firestore Index Error Detected!");
      console.error("💡 To fix this, create the required index:");

      // Try to extract index URL from error message
      const indexUrlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
      if (indexUrlMatch) {
        console.log("🔗 %cClick here to create index", "color: blue; text-decoration: underline; cursor: pointer; font-weight: bold;", indexUrlMatch[0]);
        console.log("📋 Or copy this URL: " + indexUrlMatch[0]);

        // Make the link clickable in some browsers
        console.log("🚨 After creating the index, refresh the page to retry the " + operation + ".");
      } else {
        console.error("❓ Could not extract index URL from error.");
        console.log("🔗 Go to: https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/indexes");
        console.log("📝 Replace YOUR_PROJECT_ID with your actual Firebase project ID");
      }
    }
  };

  // Test function to simulate index error (for development/testing)
  const testIndexError = () => {
    const mockError = {
      message: "The query requires an index. You can create it here: https://console.firebase.google.com/project/test-project/firestore/indexes?create_composite_index=1"
    };
    handleFirestoreIndexError(mockError, "test query");
  };

  // Expose test function to window for console testing
  // Usage: Open browser console and run: testFirestoreIndexError()
  if (typeof window !== 'undefined') {
    window.testFirestoreIndexError = testIndexError;
  }

function CompanyLeads() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("hot");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddLeadForm, setShowAddLeadForm] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showBulkUploadForm, setShowBulkUploadForm] = useState(false);

  // Meeting modal state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedCompanyForMeeting, setSelectedCompanyForMeeting] = useState(null);

  // Followup alerts state - commented out for now
  // const [todayFollowUps, setTodayFollowUps] = useState([]);
  // const [showTodayFollowUpAlert, setShowTodayFollowUpAlert] = useState(false);
  // const [reminderPopup, setReminderPopup] = useState(null);

  // AddJD modal state
const [showAddJDForm, setShowAddJDForm] = useState(false);
const [selectedCompanyForJD, setSelectedCompanyForJD] = useState(null);

  // Debounced search term for performance
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  // View mode state with localStorage persistence
  const [viewMyLeadsOnly, setViewMyLeadsOnly] = useState(() => {
    const saved = localStorage.getItem("placementViewMyLeadsOnly");
    return saved !== null ? JSON.parse(saved) : false; // Default to "My Team" view
  });

  // Users data for hierarchical team logic
  const [allUsers, setAllUsers] = useState({});

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem("placementViewMyLeadsOnly", JSON.stringify(viewMyLeadsOnly));
  }, [viewMyLeadsOnly]);

  // Fetch all users for hierarchical team logic
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersQuery = query(collection(db, "users"));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = {};
        usersSnapshot.forEach((doc) => {
          usersData[doc.id] = { id: doc.id, ...doc.data() };
        });
        setAllUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    if (user) {
      fetchUsers();
    }
  }, [user]);

  // Get team member IDs recursively (hierarchical)
  const getTeamMemberIds = useCallback((managerUid, users = allUsers) => {
    const teamIds = new Set();
    
    // Find all direct reports
    Object.values(users).forEach(userData => {
      if (userData.reportingManager === managerUid) {
        teamIds.add(userData.id || userData.uid);
        // Recursively get their team members
        const subTeamIds = getTeamMemberIds(userData.id || userData.uid, users);
        subTeamIds.forEach(id => teamIds.add(id));
      }
    });
    
    return Array.from(teamIds);
  }, [allUsers]);

  // Caching constants
  const CACHE_KEY = 'companyLeadsCache';
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  // Maintenance mode - set to true during updates to prevent data corruption
  // Change to false when updates are complete to restore normal functionality
  const [isMaintenanceMode] = useState(false);


  // Fetch ALL leads from Firestore (no pagination)
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch ALL batch documents from companyleads collection
      const q = query(
        collection(db, "companyleads"),
        orderBy("__name__", "desc") // Sort by document name (batch_39, batch_38, etc.)
      );

      const querySnapshot = await getDocs(q);

      const allCompanies = [];

      querySnapshot.docs.forEach((batchDoc) => {
        const batchData = batchDoc.data();
        const encodedCompanies = batchData.companies || [];

        // Decode Base64 companies and add batch info
        encodedCompanies.forEach((encodedCompany, index) => {
          try {
            // Decode Unicode-safe Base64: atob() first, then decodeURIComponent()
            const uriDecoded = atob(encodedCompany);
            const jsonString = decodeURIComponent(uriDecoded);
            const decodedCompany = JSON.parse(jsonString);
            allCompanies.push({
              id: `${batchDoc.id}_${index}`, // Unique ID combining batchId and index
              batchId: batchDoc.id,
              ...decodedCompany,
              // Map the fields to match existing UI component expectations
              companyName: decodedCompany.name || decodedCompany.companyName || '',
              pocName: decodedCompany.contactPerson || decodedCompany.pocName || '',
              pocDesignation: decodedCompany.designation || decodedCompany.pocDesignation || '',
              pocPhone: decodedCompany.phone || decodedCompany.pocPhone || '',
              companyUrl: decodedCompany.companyUrl || '',
              companyWebsite: decodedCompany.companyWebsite || decodedCompany.companyUrl || '',
              linkedinUrl: decodedCompany.linkedinUrl || '',
              pocLinkedin: decodedCompany.pocLinkedin || decodedCompany.linkedinUrl || '',
              // Handle email field mapping (Excel might put email in companyUrl)
              pocMail: decodedCompany.email || decodedCompany.pocMail || 
                      (decodedCompany.companyUrl && decodedCompany.companyUrl.includes('@') ? decodedCompany.companyUrl : ''),
              pocLocation: decodedCompany.location || decodedCompany.pocLocation || '',
              industry: decodedCompany.industry || decodedCompany.sector || '',
              companySize: decodedCompany.companySize || decodedCompany.employeeCount || '',
              source: decodedCompany.source || 'Excel Upload',
              notes: decodedCompany.notes || '',
              status: decodedCompany.status || "hot",
              workingSince: decodedCompany.workingSince || '',
              assignedTo: decodedCompany.assignedTo || null,
              assignedBy: decodedCompany.assignedBy || null,
              assignedAt: decodedCompany.assignedAt || null,
              createdAt: decodedCompany.createdAt || new Date().toISOString(),
              updatedAt: decodedCompany.updatedAt || new Date().toISOString(),
              contacts: decodedCompany.contacts || [],
            });
          } catch (error) {
            console.error(`❌ Error decoding company ${index} in batch ${batchDoc.id}:`, error);
          }
        });
      });

      console.log(`✅ Loaded ${allCompanies.length} companies from ${querySnapshot.docs.length} batches`);
      
      // Filter leads by current user based on view mode
      const userLeads = user ? allCompanies.filter(lead => {
        if (viewMyLeadsOnly) {
          // My Leads: Only show leads assigned to current user
          return lead.assignedTo === user.uid;
        } else {
          // My Team: Show leads assigned to current user, their team members, OR unassigned leads
          const teamMemberIds = getTeamMemberIds(user.uid);
          return !lead.assignedTo || 
                 lead.assignedTo === user.uid || 
                 teamMemberIds.includes(lead.assignedTo);
        }
      }) : allCompanies;
      
      console.log(`✅ Filtered to ${userLeads.length} leads for user ${user?.uid || 'guest'} (${viewMyLeadsOnly ? 'My Leads' : 'My Team'} view)`);
      setLeads(userLeads);

      // Cache the data (with error handling for quota limits)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: allCompanies, timestamp: Date.now() }));
      } catch (error) {
        console.warn("⚠️ Failed to cache data due to storage quota limit:", error);
      }

    } catch (error) {
      handleFirestoreIndexError(error, "fetching leads");

      // Fallback to old CompanyLeads collection if new structure fails
      try {
        console.log("🔄 Falling back to old CompanyLeads collection...");
        const q = query(
          collection(db, "CompanyLeads"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const leadsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate().toISOString()
            : new Date().toISOString(),
          updatedAt: doc.data().updatedAt?.toDate
            ? doc.data().updatedAt.toDate().toISOString()
            : new Date().toISOString(),
          contacts: doc.data().contacts || [],
          assignedTo: doc.data().assignedTo || null,
        }));
        
        // Filter leads by current user for fallback collection too
        const userLeadsFallback = user ? leadsData.filter(lead => {
          if (viewMyLeadsOnly) {
            // My Leads: Only show leads assigned to current user
            return lead.assignedTo === user.uid;
          } else {
            // My Team: Show leads assigned to current user, their team members, OR unassigned leads
            const teamMemberIds = getTeamMemberIds(user.uid);
            return !lead.assignedTo || 
                   lead.assignedTo === user.uid || 
                   teamMemberIds.includes(lead.assignedTo);
          }
        }) : leadsData;
        
        setLeads(userLeadsFallback);
        console.log("✅ Successfully loaded data from fallback collection");

        // Cache the data (with error handling for quota limits)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: leadsData, timestamp: Date.now() }));
        } catch (error) {
          console.warn("⚠️ Failed to cache data due to storage quota limit:", error);
        }
      } catch (fallbackError) {
        handleFirestoreIndexError(fallbackError, "fallback fetch");
      }
    } finally {
      setLoading(false);
    }
  }, [user, viewMyLeadsOnly, getTeamMemberIds]);

  // Load data from cache or fetch from Firestore
  const loadData = useCallback(async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log("✅ Loaded data from cache");
          // Filter cached data by current user based on view mode
          const userLeads = user ? data.filter(lead => {
            if (viewMyLeadsOnly) {
              // My Leads: Only show leads assigned to current user
              return lead.assignedTo === user.uid;
            } else {
              // My Team: Show leads assigned to current user, their team members, OR unassigned leads
              const teamMemberIds = getTeamMemberIds(user.uid);
              return !lead.assignedTo || 
                     lead.assignedTo === user.uid || 
                     teamMemberIds.includes(lead.assignedTo);
            }
          }) : data;
          console.log(`✅ Filtered cached data to ${userLeads.length} leads for user ${user?.uid || 'guest'} (${viewMyLeadsOnly ? 'My Leads' : 'My Team'} view)`);
          setLeads(userLeads);
          setLoading(false);
          return;
        }
      }
      // Cache is stale or missing, fetch from Firestore
      await fetchLeads();
    } catch (error) {
      console.error("Error loading data:", error);
      // Fallback to fetch
      await fetchLeads();
    }
  }, [fetchLeads, CACHE_DURATION, user, viewMyLeadsOnly, getTeamMemberIds]);

  // Initial fetch on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate completeness score for lead prioritization
  const calculateCompletenessScore = useCallback((lead) => {
    let score = 0;

    // Company Name (required field)
    if (lead.companyName && lead.companyName.trim() && lead.companyName !== 'N/A') {
      score += 1;
    }

    // Contact Person
    if (lead.pocName && lead.pocName.trim() && lead.pocName !== 'N/A') {
      score += 1;
    }

    // Designation
    if (lead.pocDesignation && lead.pocDesignation.trim() && lead.pocDesignation !== 'N/A') {
      score += 1;
    }

    // Contact Details (Phone)
    if (lead.pocPhone && String(lead.pocPhone).trim() && lead.pocPhone !== 'N/A') {
      score += 1;
    }

    // Email ID
    if (lead.pocMail && lead.pocMail.trim() && lead.pocMail !== 'N/A' && lead.pocMail.includes('@')) {
      score += 1;
    }

    // LinkedIn Profile
    if (lead.pocLinkedin && lead.pocLinkedin.trim() && lead.pocLinkedin !== 'N/A') {
      score += 1;
    }

    return score;
  }, []);

  // Filter leads based on active tab and search term
  const filteredLeads = useMemo(() => {
    // Early return for empty search and "all" tab
    if (!debouncedSearchTerm && activeTab === "all") {
      // Sort by manual leads first, then by completeness score
      return [...leads].sort((a, b) => {
        // Manual leads always come first
        const aIsManual = a.source === "Manual Add";
        const bIsManual = b.source === "Manual Add";
        
        if (aIsManual && !bIsManual) return -1;
        if (!aIsManual && bIsManual) return 1;
        
        // If both are manual or both are not manual, sort by completeness score
        const scoreA = calculateCompletenessScore(a);
        const scoreB = calculateCompletenessScore(b);
        return scoreB - scoreA; // Higher score first
      });
    }

    const searchLower = debouncedSearchTerm ? debouncedSearchTerm.toLowerCase() : '';

    const filtered = leads.filter((lead) => {
      // First filter by status if not showing all
      if (activeTab !== "all" && lead.status !== activeTab) {
        return false;
      }

      // Then filter by search term if present
      if (debouncedSearchTerm) {
        // Pre-compute string values to avoid repeated conversions
        const companyName = (lead.companyName || '').toLowerCase();
        const pocName = (lead.pocName || '').toLowerCase();
        const pocLocation = (lead.pocLocation || '').toLowerCase();
        const pocPhone = String(lead.pocPhone || '').toLowerCase();

        // Check main fields first (most likely to match)
        if (companyName.includes(searchLower) ||
            pocName.includes(searchLower) ||
            pocLocation.includes(searchLower) ||
            pocPhone.includes(searchLower)) {
          return true;
        }

        // Check contacts (less common, check last)
        return lead.contacts?.some(
          (contact) =>
            (contact.name || '').toLowerCase().includes(searchLower) ||
            (contact.email || '').toLowerCase().includes(searchLower) ||
            String(contact.phone || '').toLowerCase().includes(searchLower)
        );
      }
      return true;
    });

    // Sort filtered results by manual leads first, then completeness score
    return filtered.sort((a, b) => {
      // Manual leads always come first
      const aIsManual = a.source === "Manual Add";
      const bIsManual = b.source === "Manual Add";
      
      if (aIsManual && !bIsManual) return -1;
      if (!aIsManual && bIsManual) return 1;
      
      // If both are manual or both are not manual, sort by completeness score
      const scoreA = calculateCompletenessScore(a);
      const scoreB = calculateCompletenessScore(b);
      return scoreB - scoreA; // Higher score first
    });
  }, [leads, activeTab, debouncedSearchTerm, calculateCompletenessScore]);

  // Group leads by status for tab counts
  const leadsByStatus = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});

  const handleAddLead = (newLead) => {
    setLeads((prevLeads) => [
      {
        ...newLead,
        contacts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...prevLeads,
    ]);
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead || !lead.batchId) return;

      // Fetch the batch document
      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];

        // Find the company index in the array
        const companyIndex = parseInt(leadId.split('_').pop()); // Extract index from "batch_39_5" -> 5

        if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
          // Decode, update, and re-encode the company (Unicode-safe)
          const uriDecoded = atob(encodedCompanies[companyIndex]);
          const jsonString = decodeURIComponent(uriDecoded);
          const decodedCompany = JSON.parse(jsonString);
          const updatedCompany = {
            ...decodedCompany,
            status: newStatus,
          };
          // Unicode-safe encoding: encodeURIComponent + btoa
          const updatedJsonString = JSON.stringify(updatedCompany);
          const updatedUriEncoded = encodeURIComponent(updatedJsonString);
          encodedCompanies[companyIndex] = btoa(updatedUriEncoded);

          // Save back to Firestore
          await setDoc(batchDocRef, {
            ...batchData,
            companies: encodedCompanies,
          });
        }
      }

      // Update local state
      setLeads((prevLeads) =>
        prevLeads.map((l) =>
          l.id === leadId
            ? { ...l, status: newStatus, updatedAt: new Date().toISOString() }
            : l
        )
      );

      // ✅ If marked as onboarded → open AddJD modal
      if (newStatus === "onboarded") {
        setSelectedCompanyForJD(lead);  // send company info to AddJD
        setShowAddJDForm(true);
      }
    } catch (error) {
      handleFirestoreIndexError(error, "lead status update");
    }
  };

  const handleScheduleMeeting = (company) => {
    setSelectedCompanyForMeeting(company);
    setShowMeetingModal(true);
  };

  const handleUpdateLead = (leadId, updatedData) => {
    const updateCompany = async () => {
      try {
        const lead = leads.find((l) => l.id === leadId);
        if (!lead || !lead.batchId) return;

        // Fetch the batch document
        const batchDocRef = doc(db, "companyleads", lead.batchId);
        const batchDocSnap = await getDoc(batchDocRef);

        if (batchDocSnap.exists()) {
          const batchData = batchDocSnap.data();
          const encodedCompanies = batchData.companies || [];

          // Find the company index in the array
          const companyIndex = parseInt(leadId.split('_').pop()); // Extract index from "batch_39_5" -> 5

          if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
            // Decode, update, and re-encode the company (Unicode-safe)
            const uriDecoded = atob(encodedCompanies[companyIndex]);
            const jsonString = decodeURIComponent(uriDecoded);
            const decodedCompany = JSON.parse(jsonString);
            
            // If the lead is currently unassigned, assign it to the current user
            const isCurrentlyUnassigned = !decodedCompany.assignedTo;
            const assignmentData = isCurrentlyUnassigned && user ? {
              assignedTo: user.uid,
              assignedBy: user.uid,
              assignedAt: new Date().toISOString(),
            } : {};
            
            const updatedCompany = {
              ...decodedCompany,
              ...updatedData,
              ...assignmentData,
            };
            // Unicode-safe encoding: encodeURIComponent + btoa
            const updatedJsonString = JSON.stringify(updatedCompany);
            const updatedUriEncoded = encodeURIComponent(updatedJsonString);
            encodedCompanies[companyIndex] = btoa(updatedUriEncoded);

            // Save back to Firestore
            await setDoc(batchDocRef, {
              ...batchData,
              companies: encodedCompanies,
            });
          }
        }
      } catch (error) {
        handleFirestoreIndexError(error, "company update");
      }
    };
    updateCompany();

    // Map Firestore field names back to UI field names for local state update
    const uiFieldUpdates = {
      companyName: updatedData.name || updatedData.companyName,
      pocName: updatedData.contactPerson || updatedData.pocName,
      pocDesignation: updatedData.designation || updatedData.pocDesignation,
      pocPhone: updatedData.phone || updatedData.pocPhone,
      pocMail: updatedData.email || updatedData.pocMail,
      pocLocation: updatedData.location || updatedData.pocLocation,
      companyWebsite: updatedData.companyUrl || updatedData.companyWebsite,
      pocLinkedin: updatedData.linkedinUrl || updatedData.pocLinkedin,
      industry: updatedData.industry,
      companySize: updatedData.companySize,
      status: updatedData.status,
      workingSince: updatedData.workingSince,
      updatedAt: new Date().toISOString(),
    };

    // Check if we need to add assignment data to local state
    const currentLead = leads.find((l) => l.id === leadId);
    const isCurrentlyUnassigned = currentLead && !currentLead.assignedTo;
    const localAssignmentData = isCurrentlyUnassigned && user ? {
      assignedTo: user.uid,
      assignedBy: user.uid,
      assignedAt: new Date().toISOString(),
    } : {};

    // Update local state with UI field names and assignment data
    setLeads((prevLeads) =>
      prevLeads.map((l) =>
        l.id === leadId
          ? { ...l, ...uiFieldUpdates, ...localAssignmentData }
          : l
      )
    );

    // Update selectedLead if it's the currently selected lead
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(prev => ({ ...prev, ...uiFieldUpdates, ...localAssignmentData }));
    }
  };

  // TODO: Add lead reassignment functionality in future update
  // const handleReassignLead = async (leadId, newAssigneeId) => { ... }

  const handleDeleteLead = async (leadId) => {
    try {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead || !lead.batchId) return;

      // Confirm deletion
      if (!window.confirm(`Are you sure you want to delete ${lead.companyName}?`)) {
        return;
      }

      // Fetch the batch document
      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];

        // Find the company index in the array
        const companyIndex = parseInt(leadId.split('_').pop()); // Extract index from "batch_39_5" -> 5

        if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
          // Remove the company from the array
          encodedCompanies.splice(companyIndex, 1);

          // Save back to Firestore
          await setDoc(batchDocRef, {
            ...batchData,
            companies: encodedCompanies,
          });
        }
      }

      // Update local state by removing the lead
      setLeads((prevLeads) => prevLeads.filter((l) => l.id !== leadId));

      console.log(`✅ Deleted lead: ${lead.companyName}`);
    } catch (error) {
      handleFirestoreIndexError(error, "lead deletion");
      alert("Failed to delete the lead. Please try again.");
    }
  };


  const formatDate = useCallback((dateString) => {
    try {
      return dateString
        ? new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
    } catch {
      return "-";
    }
  }, []);

  // View Mode Toggle Component
  const ViewModeToggle = () => {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setViewMyLeadsOnly(true)}
          className={`text-xs font-medium px-3 py-1 rounded-full border transition ${
            viewMyLeadsOnly
              ? "bg-blue-600 text-white border-blue-600 shadow-md"
              : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
          }`}
          aria-label="Show only my leads"
        >
          My Leads
        </button>
        <button
          onClick={() => setViewMyLeadsOnly(false)}
          className={`text-xs font-medium px-3 py-1 rounded-full border transition ${
            !viewMyLeadsOnly
              ? "bg-blue-600 text-white border-blue-600 shadow-md"
              : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
          }`}
          aria-label="Show my team's leads"
        >
          My Team
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Maintenance mode - show message when updates are underway
  if (isMaintenanceMode) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-yellow-100 mb-6">
              <svg
                className="h-12 w-12 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              🚧 New Updates Underway
            </h2>
            <p className="text-lg text-gray-600 mb-4">
              Our developers are currently pushing important changes to the system.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Please Do Not Use Any Features
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      To prevent data corruption and ensure a smooth update process, 
                      please refrain from adding, editing, or deleting any company leads 
                      until the maintenance is complete.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="animate-pulse">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
              <span>Updates in progress...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Header with View Toggle on Left, Search in Center, Actions on Right */}
      <div className="flex items-center justify-between mb-4 gap-4">
        {/* View Mode Toggle on Left */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <ViewModeToggle />
        </div>

        {/* Search Input in Center */}
        <div className="flex-1 max-w-md mx-auto">
          <input
            type="text"
            placeholder="Search companies or contacts..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Action Buttons on Right */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowAddLeadForm(true)}
            className="px-3 py-2 text-white rounded-lg font-semibold flex items-center justify-center focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md relative overflow-hidden text-sm"
          >
            <span className="absolute inset-0 bg-linear-to-r from-blue-600 to-indigo-700 opacity-100 hover:opacity-90 transition-opacity duration-200 z-0"></span>
            <span className="relative z-10 flex items-center">
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Company
            </span>
          </button>
          <button
            onClick={() => setShowBulkUploadForm(true)}
            className="px-3 py-2 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md text-sm"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Bulk Upload
          </button>
        </div>
      </div>

      <LeadsFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        setActiveTab={setActiveTab}
        leadsByStatus={leadsByStatus}
      />

      <LeadsTable
        leads={filteredLeads}
        onLeadClick={(lead) => {
          setSelectedLead(lead);
          setShowLeadDetails(true);
        }}
        onStatusChange={handleStatusChange}
        onScheduleMeeting={handleScheduleMeeting}
        onDeleteLead={handleDeleteLead}
        currentUserId={user?.uid}
        currentUser={user}
      />

      {/* Company Count Display */}
      <div className="flex justify-between items-center mt-4 px-4 py-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-700">
          Total: {leads.length} companies loaded
        </div>
        <button
          onClick={async () => {
            setLoading(true);
            await fetchLeads();
          }}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          title="Refresh data from server"
        >
          Refresh
        </button>
      </div>

      {/* Lead View/Edit Modal */}
      {showLeadDetails && (
        <LeadViewEditModal
          lead={selectedLead}
          onClose={() => setShowLeadDetails(false)}
          onAddContact={(leadId, contactData) => {
            const updateContacts = async () => {
              try {
                const lead = leads.find((l) => l.id === leadId);
                if (!lead || !lead.batchId) return;

                // Fetch the batch document
                const batchDocRef = doc(db, "companyleads", lead.batchId);
                const batchDocSnap = await getDoc(batchDocRef);

                if (batchDocSnap.exists()) {
                  const batchData = batchDocSnap.data();
                  const encodedCompanies = batchData.companies || [];

                  // Find the company index in the array
                  const companyIndex = parseInt(leadId.split('_').pop()); // Extract index from "batch_39_5" -> 5

                  if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
                    // Decode, update contacts, and re-encode the company (Unicode-safe)
                    const uriDecoded = atob(encodedCompanies[companyIndex]);
                    const jsonString = decodeURIComponent(uriDecoded);
                    const decodedCompany = JSON.parse(jsonString);
                    const existingContacts = decodedCompany.contacts || [];
                    const updatedCompany = {
                      ...decodedCompany,
                      contacts: [...existingContacts, contactData],
                    };
                    // Unicode-safe encoding: encodeURIComponent + btoa
                    const updatedJsonString = JSON.stringify(updatedCompany);
                    const updatedUriEncoded = encodeURIComponent(updatedJsonString);
                    encodedCompanies[companyIndex] = btoa(updatedUriEncoded);

                    // Save back to Firestore
                    await setDoc(batchDocRef, {
                      ...batchData,
                      companies: encodedCompanies,
                    });
                  }
                }
              } catch (error) {
                handleFirestoreIndexError(error, "contact update");
              }
            };
            updateContacts();

            setLeads(
              leads.map((lead) =>
                lead.id === leadId
                  ? {
                      ...lead,
                      contacts: [...lead.contacts, contactData],
                      updatedAt: new Date().toISOString(),
                    }
                  : lead
              )
            );
          }}
          onUpdateLead={handleUpdateLead}
          formatDate={formatDate}
        />
      )}

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        show={showBulkUploadForm}
        onClose={() => setShowBulkUploadForm(false)}
        assigneeId={user?.uid}
      />

      {/* Add Leads Modal */}
      <AddLeads
        show={showAddLeadForm}
        onClose={() => setShowAddLeadForm(false)}
        onAddLead={handleAddLead}
      />

      {/* Add JD Modal */}
      {showAddJDForm && selectedCompanyForJD && (
        <AddJD
          show={showAddJDForm}
          onClose={() => {
            setShowAddJDForm(false);
            setSelectedCompanyForJD(null);
          }}
          company={selectedCompanyForJD}
        />
      )}

      {/* Meeting Modal */}
      {showMeetingModal && (
        <FollowUpCompany
          company={selectedCompanyForMeeting}
          onClose={() => setShowMeetingModal(false)}
        />
      )}

      {/* Followup Alerts */}
      {/* <Suspense fallback={<div></div>}>
        <FollowupAlerts
          todayFollowUps={todayFollowUps}
          showTodayFollowUpAlert={showTodayFollowUpAlert}
          setShowTodayFollowUpAlert={setShowTodayFollowUpAlert}
          reminderPopup={reminderPopup}
          setReminderPopup={setReminderPopup}
        />
      </Suspense> */}

    </div>

    
  );
}

export default CompanyLeads;
