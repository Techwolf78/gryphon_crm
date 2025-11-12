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
import ViewModeToggle from "./ViewModeToggle";
import { useAuth } from "../../../context/AuthContext";
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

  // Utility function to handle Firestore index errors
  const handleFirestoreIndexError = (error, operation = "operation") => {
    console.error(`❌ Firestore Index Error in ${operation}:`, error);
  };

function CompanyLeads() {
  const { user } = useAuth();
  const { instance, accounts } = useMsal();
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("companyLeadsActiveTab");
    return saved || "hot";
  });
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

  // View mode state with localStorage persistence
  const [viewMyLeadsOnly, setViewMyLeadsOnly] = useState(() => {
    const saved = localStorage.getItem("placementViewMyLeadsOnly");
    return saved !== null ? JSON.parse(saved) : true; // Default to "My Leads" view
  });

  // User filter state
  const [selectedUserFilter, setSelectedUserFilter] = useState('all'); // 'all', 'unassigned', or user UID

  // Debounced search term for performance
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  // Microsoft 365 Connection Status
  const [ms365ConnectionStatus, setMs365ConnectionStatus] = useState('checking'); // 'checking', 'connected', 'weak', 'disconnected'
  const [ms365TestingConnection, setMs365TestingConnection] = useState(false);

  // Test Microsoft 365 connection status
  const testMs365Connection = useCallback(async () => {
    if (!accounts || accounts.length === 0) {
      setMs365ConnectionStatus('disconnected');
      return;
    }

    setMs365TestingConnection(true);
    try {
      // Try to acquire token silently first
      const silentRequest = {
        scopes: ["https://graph.microsoft.com/Calendars.ReadWrite"],
        account: accounts[0],
      };

      const response = await instance.acquireTokenSilent(silentRequest);
      if (response.accessToken) {
        setMs365ConnectionStatus('connected');
      } else {
        setMs365ConnectionStatus('weak');
      }
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Token needs interaction, connection is weak
        setMs365ConnectionStatus('weak');
      } else {
        console.error('MS365 connection test failed:', error);
        setMs365ConnectionStatus('disconnected');
      }
    } finally {
      setMs365TestingConnection(false);
    }
  }, [instance, accounts]);

  // Connect to Microsoft 365
  const connectToMs365 = useCallback(async () => {
    if (!accounts || accounts.length === 0) {
      try {
        const loginRequest = {
          scopes: ["https://graph.microsoft.com/Calendars.ReadWrite"],
          prompt: "select_account",
        };
        await instance.loginPopup(loginRequest);
        // After login, test connection
        setTimeout(() => testMs365Connection(), 1000);
      } catch (error) {
        console.error('MS365 login failed:', error);
        setMs365ConnectionStatus('disconnected');
      }
    } else {
      // Already have accounts, try to get token
      try {
        const tokenRequest = {
          scopes: ["https://graph.microsoft.com/Calendars.ReadWrite"],
          account: accounts[0],
        };
        await instance.acquireTokenPopup(tokenRequest);
        setMs365ConnectionStatus('connected');
      } catch (error) {
        console.error('MS365 token acquisition failed:', error);
        setMs365ConnectionStatus('disconnected');
      }
    }
  }, [instance, accounts, testMs365Connection]);

  // Log view mode changes
  useEffect(() => {
    localStorage.setItem("placementViewMyLeadsOnly", JSON.stringify(viewMyLeadsOnly));
  }, [viewMyLeadsOnly]);

  // Test MS365 connection on component mount and when accounts change
  useEffect(() => {
    testMs365Connection();
  }, [testMs365Connection]);

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

  // Get team member IDs based on role-based logic (matches Sales module)
  const getTeamMemberIds = useCallback((managerUid, users = allUsers) => {
    const user = Object.values(users).find((u) => u.uid === managerUid);
    if (!user) return [];

    const isPlacementDept = user.departments?.includes("Placement") || user.department === "Placement";
    const isHigherRole = ["Director", "Head", "Manager"].includes(user.role);

    if (user.role === "Director") {
      // Director sees all placement team leads
      return Object.values(users)
        .filter(u => u.departments?.includes("Placement") || u.department === "Placement")
        .map(u => u.uid || u.id);
    } else if (user.role === "Head") {
      // Head sees Managers and their subordinates in Placement (regardless of Head's own department)
      const teamMembers = [];
      
      // Find all Managers in Placement
      const managers = Object.values(users).filter(
        (u) => u.role === "Manager" && 
        (u.departments?.includes("Placement") || u.department === "Placement")
      );
      teamMembers.push(...managers.map(u => u.uid || u.id));
      
        // Find subordinates of those Managers
        managers.forEach(manager => {
          const subordinates = Object.values(users).filter(
            (u) =>
              u.reportingManager === manager.name &&
              ["Assistant Manager", "Executive"].includes(u.role) &&
              (u.departments?.includes("Placement") || u.department === "Placement")
          );
          teamMembers.push(...subordinates.map(u => u.uid || u.id));
        });      return teamMembers;
    } else if (isPlacementDept && isHigherRole) {
      if (user.role === "Manager") {
        // Manager sees direct subordinates (Assistant Manager, Executive)
        const subordinates = Object.values(users).filter(
          (u) =>
            u.reportingManager === user.name &&
            ["Assistant Manager", "Executive"].includes(u.role) &&
            (u.departments?.includes("Placement") || u.department === "Placement")
        );
        return subordinates.map((u) => u.uid || u.id);
      }
    }

    // Lower roles or non-placement users see no team members
    return [];
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
              contactPerson: lead.pocName || 'N/A',
              contactPhone: lead.pocPhone || 'N/A',
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
              calledAt: decodedCompany.calledAt || null,
              createdAt: decodedCompany.createdAt || new Date().toISOString(),
              updatedAt: decodedCompany.updatedAt || new Date().toISOString(),
              contacts: decodedCompany.contacts || [],
            });
          } catch (error) {
            console.error(`❌ Error decoding company ${index} in batch ${batchDoc.id}:`, error);
          }
        });
      });

      // Filter leads by current user based on view mode and user filter
      let teamMemberIds = [];
      if (!viewMyLeadsOnly && user) {
        teamMemberIds = getTeamMemberIds(user.uid);
      }
      
      let userLeads = user ? allCompanies.filter(lead => {
        if (viewMyLeadsOnly) {
          // My Leads: Only show leads assigned to current user
          return lead.assignedTo === user.uid;
        } else {
          // My Team: Show leads assigned to team members OR unassigned leads (exclude current user's leads)
          return !lead.assignedTo || teamMemberIds.includes(lead.assignedTo);
        }
      }) : allCompanies;

      // Apply user filter
      if (selectedUserFilter !== 'all') {
        if (selectedUserFilter === 'unassigned') {
          userLeads = userLeads.filter(lead => !lead.assignedTo);
        } else {
          userLeads = userLeads.filter(lead => lead.assignedTo === selectedUserFilter);
        }
      }
      
      setLeads(userLeads);

      // Cache the data (with size checking and compression for large datasets)
      try {
        const cacheData = { data: allCompanies, timestamp: Date.now() };
        const jsonString = JSON.stringify(cacheData);
        
        // Check if data is too large for localStorage (limit ~5MB)
        if (jsonString.length > 4 * 1024 * 1024) { // 4MB limit to be safe
          console.warn("⚠️ Dataset too large for localStorage caching, skipping cache");
        } else {
          // For large datasets, compress by storing only essential fields
          if (allCompanies.length > 1000) {
            const compressedData = allCompanies.map(company => ({
              id: company.id,
              companyName: company.companyName,
              status: company.status,
              assignedTo: company.assignedTo,
              updatedAt: company.updatedAt,
              calledAt: company.calledAt,
              batchId: company.batchId
            }));
            const compressedCacheData = { data: compressedData, timestamp: Date.now(), compressed: true };
            localStorage.setItem(CACHE_KEY, JSON.stringify(compressedCacheData));
          } else {
            localStorage.setItem(CACHE_KEY, jsonString);
          }
        }
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
          calledAt: doc.data().calledAt?.toDate
            ? doc.data().calledAt.toDate().toISOString()
            : doc.data().calledAt || null,
          contacts: doc.data().contacts || [],
          assignedTo: doc.data().assignedTo || null,
        }));
        
        // Filter leads by current user for fallback collection too
        let teamMemberIds = [];
        if (!viewMyLeadsOnly && user) {
          teamMemberIds = getTeamMemberIds(user.uid);
        }
        
        let userLeadsFallback = user ? leadsData.filter(lead => {
          if (viewMyLeadsOnly) {
            // My Leads: Only show leads assigned to current user
            return lead.assignedTo === user.uid;
          } else {
            // My Team: Show leads assigned to team members OR unassigned leads (exclude current user's leads)
            return !lead.assignedTo || teamMemberIds.includes(lead.assignedTo);
          }
        }) : leadsData;

        // Apply user filter
        if (selectedUserFilter !== 'all') {
          if (selectedUserFilter === 'unassigned') {
            userLeadsFallback = userLeadsFallback.filter(lead => !lead.assignedTo);
          } else {
            userLeadsFallback = userLeadsFallback.filter(lead => lead.assignedTo === selectedUserFilter);
          }
        }
        
        setLeads(userLeadsFallback);

        // Cache the data (with size checking and compression for large datasets)
        try {
          const cacheData = { data: leadsData, timestamp: Date.now() };
          const jsonString = JSON.stringify(cacheData);
          
          // Check if data is too large for localStorage (limit ~5MB)
          if (jsonString.length > 4 * 1024 * 1024) { // 4MB limit to be safe
            console.warn("⚠️ Dataset too large for localStorage caching, skipping cache");
          } else {
            // For large datasets, compress by storing only essential fields
            if (leadsData.length > 1000) {
              const compressedData = leadsData.map(company => ({
                id: company.id,
                companyName: company.companyName,
                status: company.status,
                assignedTo: company.assignedTo,
                updatedAt: company.updatedAt,
                calledAt: company.calledAt,
                batchId: company.batchId
              }));
              const compressedCacheData = { data: compressedData, timestamp: Date.now(), compressed: true };
              localStorage.setItem(CACHE_KEY, JSON.stringify(compressedCacheData));
            } else {
              localStorage.setItem(CACHE_KEY, jsonString);
            }
          }
        } catch (error) {
          console.warn("⚠️ Failed to cache data due to storage quota limit:", error);
        }
      } catch (fallbackError) {
        handleFirestoreIndexError(fallbackError, "fallback fetch");
      }
    } finally {
      setLoading(false);
    }
  }, [user, viewMyLeadsOnly, getTeamMemberIds, selectedUserFilter]);

  // Load data from cache or fetch from Firestore
  const loadData = useCallback(async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp, compressed } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          // If cache is compressed, we need fresh data for full functionality
          if (compressed) {
            await fetchLeads();
            return;
          }
          
          // Filter cached data by current user based on view mode and user filter
          let teamMemberIds = [];
          if (!viewMyLeadsOnly && user) {
            teamMemberIds = getTeamMemberIds(user.uid);
          }
          
          let userLeads = user ? data.filter(lead => {
            if (viewMyLeadsOnly) {
              // My Leads: Only show leads assigned to current user
              return lead.assignedTo === user.uid;
            } else {
              // My Team: Show leads assigned to team members OR unassigned leads (exclude current user's leads)
              return !lead.assignedTo || teamMemberIds.includes(lead.assignedTo);
            }
          }) : data;

          // Apply user filter
          if (selectedUserFilter !== 'all') {
            if (selectedUserFilter === 'unassigned') {
              userLeads = userLeads.filter(lead => !lead.assignedTo);
            } else {
              userLeads = userLeads.filter(lead => lead.assignedTo === selectedUserFilter);
            }
          }

          setLeads(userLeads);
          setLoading(false);
          return;
        }
      }
      // Cache is stale, missing, or compressed - fetch from Firestore
      await fetchLeads();
    } catch (error) {
      console.error("Error loading data:", error);
      // Fallback to fetch
      await fetchLeads();
    }
  }, [fetchLeads, CACHE_DURATION, user, viewMyLeadsOnly, getTeamMemberIds, selectedUserFilter]);

  // Initial fetch on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);
  
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

  // Group leads by date for all tabs (hot, warm, cold, called, onboarded)
  const groupedLeads = useMemo(() => {
    // Only group for specific tabs
    if (!["hot", "warm", "cold", "called", "onboarded"].includes(activeTab)) return null;

    // Don't group if there are too many leads (performance issue) - DISABLED: LeadsTable handles pagination within groups
    // if (leads.length > 50000) {
    //   console.warn(`⚠️ Too many leads (${leads.length}) for grouped view, falling back to paginated view`);
    //   return null;
    // }

    // Don't group cold leads in "My Team" view (too many companies) - ENABLED for performance
    if (!viewMyLeadsOnly && activeTab === "cold") {
      console.warn(`⚠️ Cold tab in "My Team" view not grouped by date for performance, using paginated view`);
      return null;
    }

    const filteredLeads = leads.filter(lead => lead.status === activeTab);

    // Group by date based on status
    const grouped = filteredLeads.reduce((acc, lead) => {
      try {
        let dateField;
        
        // Determine which date field to use based on status
        if (activeTab === "called") {
          // For called leads, use calledAt (when they were marked as called)
          dateField = lead.calledAt;
        } else {
          // For other statuses, use updatedAt (when they were last updated to this status)
          dateField = lead.updatedAt;
        }
        
        const date = dateField ? new Date(dateField).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'Unknown Date';

        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(lead);

      } catch {
        // If date parsing fails, group under 'Unknown Date'
        if (!acc['Unknown Date']) {
          acc['Unknown Date'] = [];
        }
        acc['Unknown Date'].push(lead);
      }
      return acc;
    }, {});

    // Sort dates in descending order (most recent first)
    const sortedGrouped = {};
    Object.keys(grouped)
      .sort((a, b) => {
        if (a === 'Unknown Date') return 1;
        if (b === 'Unknown Date') return -1;
        return new Date(b) - new Date(a);
      })
      .forEach(date => {
        sortedGrouped[date] = grouped[date];
      });

    return sortedGrouped;
  }, [leads, activeTab, viewMyLeadsOnly]);

  // Group leads by status for tab counts (calculate based on what user can actually see)
  const leadsByStatus = useMemo(() => {
    const counts = { hot: 0, warm: 0, cold: 0, called: 0, onboarded: 0 };

    leads.forEach(lead => {
      if (lead.status && counts[lead.status] !== undefined) {
        counts[lead.status]++;
      }
    });

    return counts;
  }, [leads]);

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
            updatedAt: new Date().toISOString(),
            ...assignmentData,
          };
          // Add calledAt timestamp when status changes to "called"
          if (newStatus === "called") {
            updatedCompany.calledAt = new Date().toISOString();
          }
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

      // Add calledAt timestamp when status changes to "called"
      const calledAtData = newStatus === "called" ? { calledAt: new Date().toISOString() } : {};

      setLeads((prevLeads) =>
        prevLeads.map((l) =>
          l.id === leadId
            ? { ...l, status: newStatus, updatedAt: new Date().toISOString(), ...localAssignmentData, ...calledAtData, isTransitioning: false }
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

  const handleUpdateLead = async (leadId, updatedData) => {
    try {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead || !lead.batchId) {
        throw new Error('Lead or batch ID not found');
      }

      // Fetch the batch document
      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (!batchDocSnap.exists()) {
        throw new Error('Batch document not found');
      }

      const batchData = batchDocSnap.data();
      const encodedCompanies = batchData.companies || [];

      // Find the company index in the array
      const companyIndex = parseInt(leadId.split('_').pop()); // Extract index from "batch_39_5" -> 5

      if (companyIndex < 0 || companyIndex >= encodedCompanies.length) {
        throw new Error('Invalid company index');
      }

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
      // Preserve calledAt if it exists and status is not changing to "called"
      if (decodedCompany.calledAt && updatedData.status !== "called") {
        updatedCompany.calledAt = decodedCompany.calledAt;
      }
      // Add calledAt timestamp when status changes to "called" and it doesn't exist
      if (updatedData.status === "called" && !decodedCompany.calledAt) {
        updatedCompany.calledAt = new Date().toISOString();
      }
      // Unicode-safe encoding: encodeURIComponent + btoa
      const updatedJsonString = JSON.stringify(updatedCompany);
      const updatedUriEncoded = encodeURIComponent(updatedJsonString);
      encodedCompanies[companyIndex] = btoa(updatedUriEncoded);

      // Save back to Firestore
      await setDoc(batchDocRef, {
        ...batchData,
        companies: encodedCompanies,
      });

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
        calledAt: updatedData.calledAt || decodedCompany.calledAt, // Preserve existing calledAt
        updatedAt: new Date().toISOString(),
      };

      // Check if we need to add assignment data to local state
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

      return { success: true };
    } catch (error) {
      console.error('Error updating company:', error);
      handleFirestoreIndexError(error, "company update");
      return { success: false, error: error.message };
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

  const handleAssignLead = async (leadId, userId) => {
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
            assignedTo: userId,
            assignedBy: user?.uid,
            assignedAt: new Date().toISOString(),
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
      setLeads((prevLeads) =>
        prevLeads.map((l) =>
          l.id === leadId
            ? { ...l, assignedTo: userId, assignedBy: user?.uid, assignedAt: new Date().toISOString() }
            : l
        )
      );

    } catch (error) {
      handleFirestoreIndexError(error, "lead assignment");
      alert("Failed to assign the lead. Please try again.");
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
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-center min-h-screen">
        <p className="text-gray-600 text-xl">Loading your leads...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Header with View Toggle on Left, Search in Center, Actions on Right */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2">
        {/* View Mode Toggle and User Filter on Left */}
        <div className="flex items-center gap-4 shrink-0 h-8">
          <ViewModeToggle
            viewMyLeadsOnly={viewMyLeadsOnly}
            setViewMyLeadsOnly={setViewMyLeadsOnly}
          />
          <span className="text-xs font-medium text-gray-700">User:</span>
          <select
            value={selectedUserFilter}
            onChange={(e) => setSelectedUserFilter(e.target.value)}
            className="px-2 py-1 border rounded text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-full"
          >
            <option value="all">All Users</option>
            <option value="unassigned">Unassigned</option>
            {Object.values(allUsers)
              .filter(u => {
                if (viewMyLeadsOnly) {
                  return u.uid === user?.uid;
                } else {
                  const teamMemberIds = getTeamMemberIds(user?.uid || '');
                  return teamMemberIds.includes(u.uid || u.id);
                }
              })
              .map(u => (
                <option key={u.uid || u.id} value={u.uid || u.id}>
                  {u.name || u.displayName || 'Unknown User'}
                </option>
              ))
            }
          </select>
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

        {/* Microsoft 365 Connection Status */}
        <div className="flex items-center gap-2 shrink-0 h-8">
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded border">
            {ms365TestingConnection ? (
              <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <div
                className={`w-3 h-3 rounded-full ${
                  ms365ConnectionStatus === 'connected'
                    ? 'bg-green-500'
                    : ms365ConnectionStatus === 'weak'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              ></div>
            )}
            <span className="text-xs text-gray-600">
              {ms365TestingConnection
                ? 'Testing...'
                : ms365ConnectionStatus === 'connected'
                ? 'MS365'
                : ms365ConnectionStatus === 'weak'
                ? 'MS365'
                : 'MS365'
              }
            </span>
            {ms365ConnectionStatus !== 'connected' && !ms365TestingConnection && (
              <button
                onClick={connectToMs365}
                className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                Connect
              </button>
            )}
          </div>
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
          {user?.departments?.includes("admin") && (
            <button
              onClick={() => setShowBulkUploadForm(true)}
              className="px-3 py-1 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md text-xs h-full"
            >
              <CloudUploadIcon className="h-3 w-3 mr-1" />
              Bulk Upload
            </button>
          )}
        </div>
      </div>      <LeadsFilters
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        setActiveTab={setActiveTab}
        leadsByStatus={leadsByStatus}
      />

      <LeadsTable
        leads={filteredLeads}
        groupedLeads={groupedLeads}
        activeTab={activeTab}
        onLeadClick={(lead) => {
          setSelectedLead(lead);
          setShowLeadDetails(true);
        }}
        onStatusChange={handleStatusChange}
        onScheduleMeeting={handleScheduleMeeting}
        onDeleteLead={handleDeleteLead}
        onAssignLead={handleAssignLead}
        currentUserId={user?.uid}
        currentUser={user}
        allUsers={allUsers}
        order={true}
      />

      {/* Company Count Display */}
      <div className="flex justify-between items-center mt-4 px-4 py-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-700">
          Total: {filteredLeads.length} companies loaded
          {selectedUserFilter !== 'all' && (
            <span className="ml-2 text-blue-600">
              (filtered by {selectedUserFilter === 'unassigned' ? 'unassigned leads' : 
                Object.values(allUsers).find(u => (u.uid || u.id) === selectedUserFilter)?.name || 'user'})
            </span>
          )}
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
          onAddContact={async (leadId, contactData) => {
            try {
              const lead = leads.find((l) => l.id === leadId);
              if (!lead || !lead.batchId) {
                throw new Error('Lead or batch ID not found');
              }

              // Fetch the batch document
              const batchDocRef = doc(db, "companyleads", lead.batchId);
              const batchDocSnap = await getDoc(batchDocRef);

              if (!batchDocSnap.exists()) {
                throw new Error('Batch document not found');
              }

              const batchData = batchDocSnap.data();
              const encodedCompanies = batchData.companies || [];

              // Find the company index in the array
              const companyIndex = parseInt(leadId.split('_').pop()); // Extract index from "batch_39_5" -> 5

              if (companyIndex < 0 || companyIndex >= encodedCompanies.length) {
                throw new Error('Invalid company index');
              }

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

              // Update local state
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

              return { success: true };
            } catch (error) {
              console.error('Error adding contact:', error);
              handleFirestoreIndexError(error, "contact update");
              return { success: false, error: error.message };
            }
          }}
          onUpdateLead={handleUpdateLead}
          formatDate={formatDate}
          allUsers={allUsers}
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
            // Refresh today's follow-ups and main leads data when a new follow-up is scheduled
            fetchTodayFollowUps();
            fetchLeads();
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
