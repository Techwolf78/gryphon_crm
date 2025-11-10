import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useDebounce } from 'use-debounce';
import { PlusIcon, CloudUploadIcon } from "@heroicons/react/outline";
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
import LeadsFilters from "./LeadsFilters";
import LeadsTable from "./LeadsTable";
import LeadViewEditModal from "./LeadViewEditModal";
import FollowUpCompany from "./FollowUpCompany";
import PlacementLeadAlert from "../PlacementLeadAlert";
import ViewModeToggle from "../ViewModeToggle";
import { useAuth } from "../../../context/AuthContext";

  // Utility function to handle Firestore index errors
  const handleFirestoreIndexError = (error, operation = "operation") => {
    console.error(`❌ Firestore Index Error in ${operation}:`, error);
  };

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

  // Followup alerts state - start with empty array, will be populated dynamically
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [showTodayFollowUpAlert, setShowTodayFollowUpAlert] = useState(false);
  const [reminderPopup, setReminderPopup] = useState(null);

  // AddJD modal state
const [showAddJDForm, setShowAddJDForm] = useState(false);
const [selectedCompanyForJD, setSelectedCompanyForJD] = useState(null);

  // Debounced search term for performance
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  // View mode state with localStorage persistence
  const [viewMyLeadsOnly, setViewMyLeadsOnly] = useState(() => {
    const saved = localStorage.getItem("placementViewMyLeadsOnly");
    return saved !== null ? JSON.parse(saved) : true; // Default to "My Leads" view
  });

  // Users data for hierarchical team logic
  const [allUsers, setAllUsers] = useState({});

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

  // Get team member IDs recursively (hierarchical) - MOVED UP to fix initialization error
  const getTeamMemberIds = useCallback((managerUid, users = allUsers, visited = new Set()) => {
    // Prevent infinite recursion
    if (visited.has(managerUid)) {
      console.warn('Circular reference detected in team hierarchy for user:', managerUid);
      return [];
    }
    
    visited.add(managerUid);
    const teamIds = new Set();
    
    // Find all direct reports
    Object.values(users).forEach(userData => {
      if (userData.reportingManager === managerUid) {
        const userId = userData.id || userData.uid;
        if (userId && !visited.has(userId)) {
          teamIds.add(userId);
          // Recursively get their team members
          const subTeamIds = getTeamMemberIds(userId, users, new Set(visited));
          subTeamIds.forEach(id => teamIds.add(id));
        }
      }
    });
    
    return Array.from(teamIds);
  }, [allUsers]);

  // Fetch today's follow-ups from all companies
  const fetchTodayFollowUps = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      const allFollowUps = [];

      // Use the already filtered leads from state

      // Extract follow-ups from each company
      leads.forEach(lead => {
        // Only process hot leads for follow-up alerts
        if (lead.status !== "hot") return;
        
        const followups = lead.followups || [];
        followups.forEach(followup => {
          // Check if follow-up is for today
          if (followup.date === today) {
            allFollowUps.push({
              id: `${lead.id}_${followup.key}`,
              company: lead.companyName || lead.name || 'Unknown Company',
              time: followup.time,
              date: followup.date,
              remarks: followup.remarks,
              assignedTo: lead.assignedTo,
              leadId: lead.id,
              followupKey: followup.key
            });
          }
        });
      });
      setTodayFollowUps(allFollowUps);

      // Show alert if there are follow-ups
      setShowTodayFollowUpAlert(allFollowUps.length > 0);

    } catch (error) {
      console.error("Error fetching today's follow-ups:", error);
    }
  }, [user, leads]);

  // Test function for placement alerts (accessible via window.testPlacementAlerts)
  useEffect(() => {
    // Test functionality removed for production
  }, [user, viewMyLeadsOnly, todayFollowUps, showTodayFollowUpAlert, leads, getTeamMemberIds]);

  // Caching constants
  const CACHE_KEY = 'companyLeadsCache';
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds


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

      // Filter leads by current user based on view mode
      const userLeads = user ? allCompanies.filter(lead => {
        if (viewMyLeadsOnly) {
          // My Leads: Only show leads assigned to current user
          return lead.assignedTo === user.uid;
        } else {
          // My Team: Show leads assigned to team members OR unassigned leads (exclude current user's leads)
          const teamMemberIds = getTeamMemberIds(user.uid);
          return !lead.assignedTo || teamMemberIds.includes(lead.assignedTo);
        }
      }) : allCompanies;
      
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
            // My Team: Show leads assigned to team members OR unassigned leads (exclude current user's leads)
            const teamMemberIds = getTeamMemberIds(user.uid);
            return !lead.assignedTo || teamMemberIds.includes(lead.assignedTo);
          }
        }) : leadsData;
        
        setLeads(userLeadsFallback);

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
          // Filter cached data by current user based on view mode
          const userLeads = user ? data.filter(lead => {
            if (viewMyLeadsOnly) {
              // My Leads: Only show leads assigned to current user
              return lead.assignedTo === user.uid;
            } else {
              // My Team: Show leads assigned to team members OR unassigned leads (exclude current user's leads)
              const teamMemberIds = getTeamMemberIds(user.uid);
              return !lead.assignedTo || teamMemberIds.includes(lead.assignedTo);
            }
          }) : data;
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

  // Fetch today's follow-ups when leads data changes
  useEffect(() => {
    if (leads.length > 0) {
      fetchTodayFollowUps();
    }
  }, [leads, viewMyLeadsOnly, fetchTodayFollowUps]);

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
      // Mark as transitioning for animation
      setLeads((prevLeads) =>
        prevLeads.map((l) =>
          l.id === leadId
            ? { ...l, isTransitioning: true }
            : l
        )
      );

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
            status: newStatus,
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

      // Update local state optimistically
      const currentLead = leads.find((l) => l.id === leadId);
      const isCurrentlyUnassigned = currentLead && !currentLead.assignedTo;
      const localAssignmentData = isCurrentlyUnassigned && user ? {
        assignedTo: user.uid,
        assignedBy: user.uid,
        assignedAt: new Date().toISOString(),
      } : {};

      setLeads((prevLeads) =>
        prevLeads.map((l) =>
          l.id === leadId
            ? { ...l, status: newStatus, updatedAt: new Date().toISOString(), ...localAssignmentData, isTransitioning: false }
            : l
        )
      );

      // Switch to "called" tab when status is changed to "called"
      if (newStatus === "called") {
        setActiveTab("called");
      }

      // ✅ If marked as onboarded → open AddJD modal
      if (newStatus === "onboarded") {
        setSelectedCompanyForJD(lead);  // send company info to AddJD
        setShowAddJDForm(true);
      }
    } catch (error) {
      handleFirestoreIndexError(error, "lead status update");
      // Revert transition state on error
      setLeads((prevLeads) =>
        prevLeads.map((l) =>
          l.id === leadId
            ? { ...l, isTransitioning: false }
            : l
        )
      );
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

  // Filter follow-ups based on view mode (My Leads vs My Team)
  const filteredFollowUps = useMemo(() => {
    if (!user) {
      return []; // No follow-ups if no user
    }

    // fetchTodayFollowUps already filters based on view mode, so just return todayFollowUps
    return todayFollowUps;
  }, [todayFollowUps, user]);

  if (loading) {
    return (
      <div className="bg-black rounded-lg shadow p-4 relative min-h-screen overflow-hidden">
        <video 
          src="/home/loading.mp4" 
          autoPlay 
          loop 
          muted 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 flex justify-center pt-8">
          <p className="text-white text-4xl">Loading your leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Header with View Toggle on Left, Search in Center, Actions on Right */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2">
        {/* View Mode Toggle on Left */}
        <div className="flex items-center gap-2 shrink-0 h-8">
          <span className="text-xs font-medium text-gray-700">View:</span>
          <ViewModeToggle
            viewMyLeadsOnly={viewMyLeadsOnly}
            setViewMyLeadsOnly={setViewMyLeadsOnly}
          />
        </div>

        {/* Search in Center */}
        <div className="flex-1 flex justify-center max-w-md h-8">
          <input
            type="text"
            placeholder="Search companies or contacts..."
            className="w-full px-3 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs h-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Action Buttons on Right */}
        <div className="flex gap-1 shrink-0 h-8">
          <button
            onClick={() => setShowAddLeadForm(true)}
            className="px-3 py-1 bg-linear-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold flex items-center justify-center hover:from-blue-700 hover:to-indigo-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md transition-all duration-200 text-xs h-full"
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            Add Company
          </button>
          <button
            onClick={() => setShowBulkUploadForm(true)}
            className="px-3 py-1 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md text-xs h-full"
          >
            <CloudUploadIcon className="h-3 w-3 mr-1" />
            Bulk Upload
          </button>
        </div>
      </div>      <LeadsFilters
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
        order={true}
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
          onFollowUpScheduled={() => {
            // Refresh today's follow-ups when a new follow-up is scheduled
            fetchTodayFollowUps();
          }}
        />
      )}

      {/* Followup Alerts */}
      <Suspense fallback={<div></div>}>
        <PlacementLeadAlert
          todayFollowUps={filteredFollowUps}
          showTodayFollowUpAlert={showTodayFollowUpAlert}
          setShowTodayFollowUpAlert={setShowTodayFollowUpAlert}
          reminderPopup={reminderPopup}
          setReminderPopup={setReminderPopup}
        />
      </Suspense>

    </div>

    
  );
}

export default CompanyLeads;
