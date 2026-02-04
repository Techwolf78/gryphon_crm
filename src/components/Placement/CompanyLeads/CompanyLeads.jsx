import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useDebounce } from 'use-debounce';
import { PlusIcon, CloudUploadIcon } from "@heroicons/react/outline";
import AddLeads from "./AddLeads";
import BulkUploadModal from "./BulkUploadModal";
import BulkAssignModal from "./BulkAssignModal";
import ExcelUploadDelete from "./ExcelUploadDelete";
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
import LeadStatusTabs from "./LeadStatusTabs";
import LeadsTable from "./LeadsTable";
import LeadViewEditModal from "./LeadViewEditModal";
import FollowUpCompany from "./FollowUpCompany";
import PlacementLeadAlert from "../PlacementLeadAlert";
import ViewModeToggle from "./ViewModeToggle";
import LeadFilters from "./LeadFilters";
import FollowupDashboard from "./FollowupDashboard";
import { useAuth } from "../../../context/AuthContext";
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

import { INDUSTRY_OPTIONS } from "../../../utils/constants";

import { logPlacementActivity, AUDIT_ACTIONS } from "../../../utils/placementAuditLogger";
import ViewToggle from "./ViewToggle";
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import BatchSplitModal from "./BatchSplitModal";



  // Utility function to handle Firestore index errors
  const handleFirestoreIndexError = (error, operation = "operation") => {
    console.error(`❌ Firestore Index Error in ${operation}:`, error);
  };

function CompanyLeads() {
  const { user } = useAuth();
  const { instance, accounts } = useMsal();
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['hot', 'warm', 'cold', 'called', 'onboarded', 'dead'].includes(tab)) {
      return tab;
    }
    const saved = localStorage.getItem("companyLeadsActiveTab");
    return saved || "hot";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddLeadForm, setShowAddLeadForm] = useState(false);
  const [leads, setLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showBulkUploadForm, setShowBulkUploadForm] = useState(false);
  const [showExcelScanner, setShowExcelScanner] = useState(false);

  // Bulk Assign modal state
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  // Meeting modal state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedCompanyForMeeting, setSelectedCompanyForMeeting] = useState(null);

  // Followup alerts state - start with empty array, will be populated dynamically
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [showTodayFollowUpAlert, setShowTodayFollowUpAlert] = useState(false);
  const [reminderPopup, setReminderPopup] = useState(null);

  // Follow-ups dashboard state
  const [showFollowUpsDashboard, setShowFollowUpsDashboard] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('show') === 'followupdashboard';
  });

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Show toast function - memoized to prevent recreation
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  // AddJD modal state
const [showAddJDForm, setShowAddJDForm] = useState(false);
const [selectedCompanyForJD, setSelectedCompanyForJD] = useState(null);

  // View mode state with localStorage persistence
  const [viewMyLeadsOnly, setViewMyLeadsOnly] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    if (view === 'myteam') return false;
    if (view === 'myleads') return true;
    const saved = localStorage.getItem("placementViewMyLeadsOnly");
    return saved !== null ? JSON.parse(saved) : true; // Default to "My Leads" view
  });

  // View mode state for date vs table view
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem("placementViewMode");
    return saved || "date"; // Default to "date" view
  });

  // User filter state
  const [selectedUserFilter, setSelectedUserFilter] = useState('all'); // 'all', 'unassigned', or user UID

  // Additional filter states
  const [companyFilter, setCompanyFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [dateFilterType, setDateFilterType] = useState('single');
  const [singleDate, setSingleDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter modal state
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Microsoft 365 connection state
  const [ms365ConnectionStatus, setMs365ConnectionStatus] = useState('disconnected');
  const [ms365TestingConnection, setMs365TestingConnection] = useState(false);

  // Users state for hierarchical team logic
  const [allUsers, setAllUsers] = useState({});

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStatuses, setExportStatuses] = useState(['hot', 'warm', 'called', 'onboarded']); // Default selected statuses (cold only available for myleads)

  // Batch Split modal state
  const [showBatchSplitModal, setShowBatchSplitModal] = useState(false);



  // Debounced search term for performance
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  // Debounced search logging with longer delay to avoid logging every keystroke
  const [debouncedSearchForLogging] = useDebounce(searchTerm, 2000);



  // Log search activity when debounced search changes
  useEffect(() => {
    if (debouncedSearchForLogging.trim()) {
      logPlacementActivity({
        userId: user?.uid,
        userName: user?.displayName || user?.name || "Unknown User",
        action: AUDIT_ACTIONS.SEARCH_PERFORMED,
        companyId: null,
        companyName: null,
        details: `Searched for: "${debouncedSearchForLogging}"`,
        changes: { searchTerm: debouncedSearchForLogging },
        sessionId: sessionStorage.getItem('sessionId') || 'unknown'
      });
    }
  }, [debouncedSearchForLogging, user]);

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

  // Persist active tab changes
  useEffect(() => {
    localStorage.setItem("companyLeadsActiveTab", activeTab);
  }, [activeTab]);

  // Persist view mode changes
  useEffect(() => {
    localStorage.setItem("placementViewMode", viewMode);
  }, [viewMode]);

  // Test MS365 connection on component mount and when accounts change
  useEffect(() => {
    testMs365Connection();
  }, [testMs365Connection]);

  // Fetch all users for hierarchical team logic
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersQuery = query(collection(db, "users"));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = {};
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          const userUid = userData.uid || doc.id;
          usersData[userUid] = { ...userData, id: userUid, uid: userUid };
          usersData[userUid].name = userData.displayName || userData.name || userData.email || "Unknown User";
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
    // All users can see leads from all other users (complete transparency)
    return Object.values(users)
      .filter(u => u.uid !== managerUid)
      .map(u => u.uid || u.id);
  }, [allUsers]);

  // Fetch today's follow-ups from all companies
  const fetchTodayFollowUps = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      const allFollowUps = [];

      // Filter allLeads to get only leads assigned to the current user
      let userAccessibleLeads = allLeads;
      if (user) {
        userAccessibleLeads = allLeads.filter(lead => lead.assignedTo === user.uid);
      }

      // Extract follow-ups from each accessible lead
      userAccessibleLeads.forEach(lead => {
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
              template: followup.template,
              assignedTo: lead.assignedTo,
              leadId: lead.id,
              followupKey: followup.key
            });
          }
        });
      });

      // Check localStorage for already shown alerts for today
      const shownAlertsKey = `shownFollowUpAlerts_${user.uid}_${today}`;
      const shownAlerts = JSON.parse(localStorage.getItem(shownAlertsKey) || '[]');

      // Filter out follow-ups that have already been shown today
      const newFollowUps = allFollowUps.filter(followup => !shownAlerts.includes(followup.id));

      setTodayFollowUps(allFollowUps); // Keep all follow-ups for display

      // Show alert only for new follow-ups
      setShowTodayFollowUpAlert(newFollowUps.length > 0);

      // If there are new follow-ups, store them in localStorage after showing
      if (newFollowUps.length > 0) {
        const updatedShownAlerts = [...shownAlerts, ...newFollowUps.map(f => f.id)];
        localStorage.setItem(shownAlertsKey, JSON.stringify(updatedShownAlerts));
      }

    } catch (error) {
      console.error("Error fetching today's follow-ups:", error);
    }
  }, [allLeads, user]);

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
        if (Array.isArray(encodedCompanies)) {
          // Array structure
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
                pocLandline: decodedCompany.landline || decodedCompany.pocLandline || '',
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
                warmAt: decodedCompany.warmAt || null,
                coldAt: decodedCompany.coldAt || null,
                hotAt: decodedCompany.hotAt || null,
                onboardedAt: decodedCompany.onboardedAt || null,
                createdAt: decodedCompany.createdAt || new Date().toISOString(),
                updatedAt: decodedCompany.updatedAt || new Date().toISOString(),
                contacts: decodedCompany.contacts || [],
              });
            } catch (error) {
              console.error(`❌ Error decoding company ${index} in batch ${batchDoc.id}:`, error);
            }
          });
        } else {
          // Map structure (e.g., batch_9)
          Object.entries(encodedCompanies).forEach(([key, encodedCompany]) => {
            const index = parseInt(key);
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
                pocLandline: decodedCompany.landline || decodedCompany.pocLandline || '',
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
                warmAt: decodedCompany.warmAt || null,
                coldAt: decodedCompany.coldAt || null,
                hotAt: decodedCompany.hotAt || null,
                onboardedAt: decodedCompany.onboardedAt || null,
                createdAt: decodedCompany.createdAt || new Date().toISOString(),
                updatedAt: decodedCompany.updatedAt || new Date().toISOString(),
                contacts: decodedCompany.contacts || [],
              });
            } catch (error) {
              console.error(`❌ Error decoding company ${index} in batch ${batchDoc.id}:`, error);
            }
          });
        }
      });

      // Set all leads before filtering
      setAllLeads(allCompanies);

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
          warmAt: doc.data().warmAt?.toDate
            ? doc.data().warmAt.toDate().toISOString()
            : doc.data().warmAt || null,
          coldAt: doc.data().coldAt?.toDate
            ? doc.data().coldAt.toDate().toISOString()
            : doc.data().coldAt || null,
          hotAt: doc.data().hotAt?.toDate
            ? doc.data().hotAt.toDate().toISOString()
            : doc.data().hotAt || null,
          onboardedAt: doc.data().onboardedAt?.toDate
            ? doc.data().onboardedAt.toDate().toISOString()
            : doc.data().onboardedAt || null,
          contacts: doc.data().contacts || [],
          assignedTo: doc.data().assignedTo || null,
        }));
        
        // Set all leads before filtering
        setAllLeads(leadsData);

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

  // Backfill warmAt timestamps for existing warm leads
  const backfillWarmAtTimestamps = useCallback(async () => {
    try {
      console.log("Starting backfill of warmAt timestamps...");

      // Fetch ALL batch documents from companyleads collection
      const q = query(collection(db, "companyleads"), orderBy("__name__", "desc"));
      const querySnapshot = await getDocs(q);

      let updatedCount = 0;
      let totalBatches = querySnapshot.docs.length;
      console.log(`Processing ${totalBatches} batch documents...`);

      for (const batchDoc of querySnapshot.docs) {
        const batchData = batchDoc.data();
        const encodedCompanies = batchData.companies || [];
        let hasUpdates = false;
        let batchWarmLeads = 0;
        let batchUpdated = 0;

        console.log(`Processing batch ${batchDoc.id} with ${encodedCompanies.length} companies...`);

        // Decode and check each company
        const updatedCompanies = encodedCompanies.map(encodedCompany => {
          try {
            const uriDecoded = atob(encodedCompany);
            const jsonString = decodeURIComponent(uriDecoded);
            const decodedCompany = JSON.parse(jsonString);

            // Count warm leads in this batch
            if (decodedCompany.status === "warm") {
              batchWarmLeads++;
              console.log(`Found warm lead: ${decodedCompany.name || decodedCompany.companyName}, warmAt: ${decodedCompany.warmAt}, updatedAt: ${decodedCompany.updatedAt}`);
            }

            // If lead is warm and doesn't have warmAt, set it to updatedAt or current timestamp
            if (decodedCompany.status === "warm" && !decodedCompany.warmAt) {
              // Use updatedAt if available, otherwise use current timestamp as fallback
              const timestampToUse = decodedCompany.updatedAt || new Date().toISOString();
              decodedCompany.warmAt = timestampToUse;
              hasUpdates = true;
              updatedCount++;
              batchUpdated++;
              console.log(`Backfilled warmAt for ${decodedCompany.name || decodedCompany.companyName} using ${decodedCompany.updatedAt ? 'updatedAt' : 'current timestamp'}`);
            }

            // Re-encode
            const updatedJsonString = JSON.stringify(decodedCompany);
            const updatedUriEncoded = encodeURIComponent(updatedJsonString);
            return btoa(updatedUriEncoded);
          } catch (error) {
            console.error(`Error processing company in batch ${batchDoc.id}:`, error);
            return encodedCompany; // Return unchanged if error
          }
        });

        console.log(`Batch ${batchDoc.id}: ${batchWarmLeads} warm leads, ${batchUpdated} updated`);

        // Save back to Firestore if there were updates
        if (hasUpdates) {
          await setDoc(batchDoc.ref, {
            ...batchData,
            companies: updatedCompanies,
          });
          console.log(`Saved updates for batch ${batchDoc.id}`);
        }
      }

      console.log(`Backfill completed. Updated ${updatedCount} warm leads across ${totalBatches} batches.`);
      if (updatedCount > 0) {
        // Refresh the data
        await fetchLeads();
      }
    } catch (error) {
      console.error("Error during backfill:", error);
    }
  }, [fetchLeads]);

  // Expose backfill function to window for manual execution
  useEffect(() => {
    window.backfillWarmAt = backfillWarmAtTimestamps;
  }, [backfillWarmAtTimestamps]);

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
  
  // Effect to handle COLD status availability based on current view mode
  useEffect(() => {
    if (!viewMyLeadsOnly) {
      // Remove cold from selected statuses when in "My Team" view
      setExportStatuses(prev => prev.filter(status => status !== 'cold'));
    }
  }, [viewMyLeadsOnly]);

  // Fetch today's follow-ups when allLeads is loaded
  useEffect(() => {
    if (allLeads.length > 0) {
      fetchTodayFollowUps();
    }
  }, [allLeads, fetchTodayFollowUps]);
  
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
    if (!debouncedSearchTerm && activeTab === "all" && selectedUserFilter === 'all' && !companyFilter.trim() && !phoneFilter.trim() && !industryFilter.trim()) {
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
    const companyFilterLower = companyFilter.trim().toLowerCase();
    const phoneFilterValue = phoneFilter.trim();

    const filtered = leads.filter((lead) => {
      // First filter by status if not showing all
      if (activeTab !== "all" && lead.status !== activeTab) {
        return false;
      }

      // Filter by user assignment
      if (selectedUserFilter !== 'all') {
        if (selectedUserFilter === 'unassigned') {
          if (lead.assignedTo) return false; // Exclude assigned leads
        } else {
          if (lead.assignedTo !== selectedUserFilter) return false; // Only show leads assigned to selected user
        }
      }

      // Filter by company name
      if (companyFilterLower) {
        const companyName = (lead.companyName || '').toLowerCase().trim();
        if (companyName !== companyFilterLower) {
          return false;
        }
      }

      // Filter by phone number
      if (phoneFilterValue) {
        const pocPhone = String(lead.pocPhone || '').trim();
        if (pocPhone !== phoneFilterValue.trim()) {
          return false;
        }
      }

      // Filter by industry
      if (industryFilter.trim()) {
        const industry = (lead.industry || '').toLowerCase().trim();
        const filterValue = industryFilter.trim().toLowerCase();
        if (filterValue === 'other') {
          // For "Other", include leads whose industry is not in the predefined options (excluding "Other")
          const predefinedIndustries = INDUSTRY_OPTIONS.filter(opt => opt.toLowerCase() !== 'other').map(opt => opt.toLowerCase());
          if (predefinedIndustries.includes(industry)) {
            return false;
          }
        } else {
          if (industry !== filterValue) {
            return false;
          }
        }
      }

      // Filter by date
      if (dateFilterType && ((dateFilterType === 'single' && singleDate) || (dateFilterType === 'range' && startDate && endDate))) {
        const getDateField = (lead) => {
          if (activeTab === "called" || activeTab === "dialed") return lead.calledAt;
          if (activeTab === "warm") return lead.warmAt;
          if (activeTab === "cold") return lead.coldAt;
          if (activeTab === "hot") return lead.hotAt;
          if (activeTab === "onboarded") return lead.onboardedAt;
          if (activeTab === "dead") return lead.deadAt;
          return lead.updatedAt;
        };

        const dateField = getDateField(lead);
        if (!dateField) return false;

        const leadDate = new Date(dateField).toISOString().split('T')[0]; // YYYY-MM-DD

        if (dateFilterType === 'single') {
          if (leadDate !== singleDate) return false;
        } else {
          if (leadDate < startDate || leadDate > endDate) return false;
        }
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
  }, [leads, activeTab, debouncedSearchTerm, selectedUserFilter, companyFilter, phoneFilter, industryFilter, dateFilterType, singleDate, startDate, endDate, calculateCompletenessScore]);

  const formatDate = useCallback((dateString) => {
    if (dateString === 'Unknown Date') return 'Unknown Date';
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
  const groupedLeads = useMemo(() => {
    // Only group for specific tabs and when view mode is "date"
    if (viewMode !== "date" || !["hot", "warm", "cold", "called", "onboarded", "deleted"].includes(activeTab)) return null;

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

    // Use filteredLeads instead of all leads to respect applied filters
    const leadsToGroup = filteredLeads.filter(lead => activeTab === 'called' ? (lead.status === 'called' || lead.status === 'dialed') : lead.status === activeTab);

    // Group by date based on status
    const grouped = leadsToGroup.reduce((acc, lead) => {
      try {
        // Check for upcoming follow-ups first
        let upcomingFollowUpDate = null;
        if (lead.followups && Array.isArray(lead.followups)) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const upcomingFollowUps = lead.followups
            .filter(f => f.date && new Date(f.date) >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
          if (upcomingFollowUps.length > 0) {
            upcomingFollowUpDate = upcomingFollowUps[0].createdAt;
          }
        }

        let dateField;
        
        // If there's an upcoming follow-up, use that date for grouping
        if (upcomingFollowUpDate) {
          dateField = upcomingFollowUpDate;
        } else {
          // Determine which date field to use based on status
          if (activeTab === "called" || activeTab === "dialed") {
            // For called leads, use calledAt (when they were marked as called)
            dateField = lead.calledAt;
          } else if (activeTab === "warm") {
            // For warm leads, use warmAt (when they were marked as warm)
            dateField = lead.warmAt;
          } else if (activeTab === "cold") {
            // For cold leads, use coldAt (when they were marked as cold)
            dateField = lead.coldAt;
          } else if (activeTab === "hot") {
            // For hot leads, use hotAt (when they were marked as hot)
            dateField = lead.hotAt;
          } else if (activeTab === "onboarded") {
            // For onboarded leads, use onboardedAt (when they were marked as onboarded)
            dateField = lead.onboardedAt;
          } else if (activeTab === "deleted") {
            // For deleted leads, use deletedAt (when they were marked as deleted)
            dateField = lead.deletedAt;
          } else {
            // For other statuses, use updatedAt (when they were last updated to this status)
            dateField = lead.updatedAt;
          }
        }
        
        let date;
        if (dateField) {
          date = new Date(dateField).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } else if (lead.assignedAt) {
          date = new Date(lead.assignedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } else {
          date = 'Unknown Date';
        }

        // Debug logging for all tabs to see date grouping
        // console.log(`${activeTab} lead: ${lead.companyName}, dateField: ${dateField}, assignedAt: ${lead.assignedAt}, grouped under: ${date}`);

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
  }, [filteredLeads, activeTab, viewMyLeadsOnly, viewMode]);

  // Group leads by status for tab counts (filtered by current view mode)
  const leadsByStatus = useMemo(() => {
    const counts = { hot: 0, warm: 0, cold: 0, called: 0, onboarded: 0, dead: 0 };

    // Apply the same view mode filtering as fetchLeads
    let teamMemberIds = [];
    if (!viewMyLeadsOnly && user) {
      teamMemberIds = getTeamMemberIds(user.uid, allUsers);
    }

    let userLeads = user ? leads.filter(lead => {
      if (viewMyLeadsOnly) {
        return lead.assignedTo === user.uid;
      } else {
        return !lead.assignedTo || lead.assignedTo === user.uid || teamMemberIds.includes(lead.assignedTo);
      }
    }) : leads;

    userLeads.forEach(lead => {
      if (lead.status && counts[lead.status] !== undefined) {
        counts[lead.status]++;
      }
    });

    return counts;
  }, [leads, viewMyLeadsOnly, user, allUsers, getTeamMemberIds]);

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
      const normalizedStatus = newStatus.toLowerCase();
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

      // Log the status change activity
      logPlacementActivity({
        userId: user?.uid,
        userName: user?.displayName || user?.name || "Unknown User",
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        companyId: leadId,
        companyName: lead.companyName || lead.name || "Unknown Company",
        details: `Changed status from "${lead.status}" to "${newStatus}"`,
        changes: { oldStatus: lead.status, newStatus },
        sessionId: sessionStorage.getItem('sessionId') || 'unknown'
      });

      // Fetch the batch document
      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];
        const companyIndex = parseInt(leadId.split('_').pop()); // Extract index from "batch_39_5" -> 5

        let updated = false;
        if (Array.isArray(encodedCompanies)) {
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
              status: normalizedStatus,
              updatedAt: new Date().toISOString(),
              ...assignmentData,
            };
            // Add status-specific timestamp when status changes
            if (normalizedStatus === "called") {
              updatedCompany.calledAt = new Date().toISOString();
            } else if (normalizedStatus === "warm") {
              updatedCompany.warmAt = new Date().toISOString();
            } else if (normalizedStatus === "cold") {
              updatedCompany.coldAt = new Date().toISOString();
            } else if (normalizedStatus === "hot") {
              updatedCompany.hotAt = new Date().toISOString();
            } else if (normalizedStatus === "onboarded") {
              updatedCompany.onboardedAt = new Date().toISOString();
            } else if (normalizedStatus === "dead") {
              updatedCompany.deadAt = new Date().toISOString();
            }
            // Unicode-safe encoding: encodeURIComponent + btoa
            const updatedJsonString = JSON.stringify(updatedCompany);
            const updatedUriEncoded = encodeURIComponent(updatedJsonString);
            encodedCompanies[companyIndex] = btoa(updatedUriEncoded);
            updated = true;
          }
        } else {
          // Map structure
          const key = companyIndex.toString();
          if (encodedCompanies[key]) {
            // Decode, update, and re-encode the company (Unicode-safe)
            const uriDecoded = atob(encodedCompanies[key]);
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
              status: normalizedStatus,
              updatedAt: new Date().toISOString(),
              ...assignmentData,
            };
            // Add status-specific timestamp when status changes
            if (normalizedStatus === "called") {
              updatedCompany.calledAt = new Date().toISOString();
            } else if (normalizedStatus === "warm") {
              updatedCompany.warmAt = new Date().toISOString();
            } else if (normalizedStatus === "cold") {
              updatedCompany.coldAt = new Date().toISOString();
            } else if (normalizedStatus === "hot") {
              updatedCompany.hotAt = new Date().toISOString();
            } else if (normalizedStatus === "onboarded") {
              updatedCompany.onboardedAt = new Date().toISOString();
            } else if (normalizedStatus === "dead") {
              updatedCompany.deadAt = new Date().toISOString();
            }
            // Unicode-safe encoding: encodeURIComponent + btoa
            const updatedJsonString = JSON.stringify(updatedCompany);
            const updatedUriEncoded = encodeURIComponent(updatedJsonString);
            encodedCompanies[key] = btoa(updatedUriEncoded);
            updated = true;
          }
        }

        if (updated) {
          // Save back to Firestore
          try {
            await setDoc(batchDocRef, {
              ...batchData,
              companies: encodedCompanies,
            });
          } catch (error) {
            if (error.message && error.message.includes('size exceeds')) {
              // Split the batch due to size limit
              const totalCompanies = encodedCompanies.length;
              const mid = Math.floor(totalCompanies / 2);
              const firstHalf = encodedCompanies.slice(0, mid);
              const secondHalf = encodedCompanies.slice(mid);

              // Create new batch
              const newBatchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const newBatchData = {
                companies: firstHalf,
                createdAt: new Date().toISOString(),
              };
              await setDoc(doc(db, "companyleads", newBatchId), newBatchData);

              // Update old batch with second half
              const updatedBatchData = {
                ...batchData,
                companies: secondHalf,
              };
              await setDoc(batchDocRef, updatedBatchData);

              // Refresh data to update batchIds and local state
              fetchLeads();
              console.log('Batch split due to size limit');
            } else {
              throw error;
            }
          }
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
      const calledAtData = normalizedStatus === "called" ? { calledAt: new Date().toISOString() } : {};
      const warmAtData = normalizedStatus === "warm" ? { warmAt: new Date().toISOString() } : {};
      const coldAtData = normalizedStatus === "cold" ? { coldAt: new Date().toISOString() } : {};
      const hotAtData = normalizedStatus === "hot" ? { hotAt: new Date().toISOString() } : {};
      const onboardedAtData = normalizedStatus === "onboarded" ? { onboardedAt: new Date().toISOString() } : {};
      const deadAtData = normalizedStatus === "dead" ? { deadAt: new Date().toISOString() } : {};

      setLeads((prevLeads) =>
        prevLeads.map((l) =>
          l.id === leadId
            ? { ...l, status: normalizedStatus, updatedAt: new Date().toISOString(), ...localAssignmentData, ...calledAtData, ...warmAtData, ...coldAtData, ...hotAtData, ...onboardedAtData, ...deadAtData, isTransitioning: false }
            : l
        )
      );

      // Switch to "called" tab when status is changed to "called"
      if (normalizedStatus === "called") {
        setActiveTab("called");
      }

      // ✅ If marked as onboarded → open AddJD modal
      if (normalizedStatus === "onboarded") {
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
    // Log the schedule meeting activity
    logPlacementActivity({
      userId: user?.uid,
      userName: user?.displayName || user?.name || "Unknown User",
      action: AUDIT_ACTIONS.SCHEDULE_FOLLOWUP,
      companyId: company.id,
      companyName: company.companyName || company.name || "Unknown Company",
      details: `Opened follow-up scheduling modal for ${company.companyName || company.name || "Unknown Company"}`,
      sessionId: sessionStorage.getItem('sessionId') || 'unknown'
    });

    setSelectedCompanyForMeeting(company);
    setShowMeetingModal(true);
  };

  const handleUpdateLead = async (leadId, updatedData) => {
    try {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead || !lead.batchId) {
        throw new Error('Lead or batch ID not found');
      }

      // Decode the current company data to compare changes
      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (!batchDocSnap.exists()) {
        throw new Error('Batch document not found');
      }

      const batchData = batchDocSnap.data();
      const encodedCompanies = batchData.companies || [];
      const companyIndex = parseInt(leadId.split('_').pop());

      let validIndex = false;
      if (Array.isArray(encodedCompanies)) {
        validIndex = companyIndex >= 0 && companyIndex < encodedCompanies.length;
      } else {
        validIndex = encodedCompanies[companyIndex.toString()] !== undefined;
      }

      if (!validIndex) {
        throw new Error('Invalid company index');
      }

      // Decode current company data for comparison
      let currentUriDecoded, currentJsonString, currentCompany;
      if (Array.isArray(encodedCompanies)) {
        currentUriDecoded = atob(encodedCompanies[companyIndex]);
        currentJsonString = decodeURIComponent(currentUriDecoded);
        currentCompany = JSON.parse(currentJsonString);
      } else {
        const key = companyIndex.toString();
        currentUriDecoded = atob(encodedCompanies[key]);
        currentJsonString = decodeURIComponent(currentUriDecoded);
        currentCompany = JSON.parse(currentJsonString);
      }

      // Compare changes and create detailed description
      const changes = {};
      const changeDescriptions = [];

      // Field mapping for better display names
      const fieldLabels = {
        name: 'Company Name',
        companyName: 'Company Name',
        contactPerson: 'Contact Person',
        pocName: 'Contact Person',
        designation: 'Designation',
        pocDesignation: 'Designation',
        phone: 'Phone',
        pocPhone: 'Phone',
        email: 'Email',
        pocMail: 'Email',
        location: 'Location',
        pocLocation: 'Location',
        companyUrl: 'Company Website',
        companyWebsite: 'Company Website',
        linkedinUrl: 'LinkedIn URL',
        pocLinkedin: 'LinkedIn URL',
        industry: 'Industry',
        companySize: 'Company Size',
        status: 'Status',
        workingSince: 'Working Since'
      };

      // Check each field for changes
      Object.keys(updatedData).forEach(key => {
        const oldValue = currentCompany[key];
        const newValue = updatedData[key];

        // Only log if there's an actual change
        if (oldValue !== newValue && newValue !== undefined) {
          const fieldName = fieldLabels[key] || key;
          changes[key] = {
            old: oldValue || 'Not set',
            new: newValue || 'Not set'
          };
          changeDescriptions.push(`${fieldName}: "${oldValue || 'Not set'}" → "${newValue || 'Not set'}"`);
        }
      });

      // Create detailed description
      const details = changeDescriptions.length > 0
        ? `Updated: ${changeDescriptions.join(', ')}`
        : 'Updated lead information';

      // Log the update activity with detailed changes
      logPlacementActivity({
        userId: user?.uid,
        userName: user?.displayName || user?.name || "Unknown User",
        action: AUDIT_ACTIONS.UPDATE_LEAD,
        companyId: leadId,
        companyName: lead.companyName || lead.name || "Unknown Company",
        details: details,
        changes: changes,
        sessionId: sessionStorage.getItem('sessionId') || 'unknown'
      });

      // Continue with the update logic using the already fetched data
      // Decode, update, and re-encode the company (Unicode-safe)
      let updateUriDecoded, updateJsonString, updateDecodedCompany;
      if (Array.isArray(encodedCompanies)) {
        updateUriDecoded = atob(encodedCompanies[companyIndex]);
        updateJsonString = decodeURIComponent(updateUriDecoded);
        updateDecodedCompany = JSON.parse(updateJsonString);
      } else {
        const key = companyIndex.toString();
        updateUriDecoded = atob(encodedCompanies[key]);
        updateJsonString = decodeURIComponent(updateUriDecoded);
        updateDecodedCompany = JSON.parse(updateJsonString);
      }
      
      // If the lead is currently unassigned, assign it to the current user
      const isCurrentlyUnassigned = !updateDecodedCompany.assignedTo;
      const assignmentData = isCurrentlyUnassigned && user ? {
        assignedTo: user.uid,
        assignedBy: user.uid,
        assignedAt: new Date().toISOString(),
      } : {};
      
      const updatedCompany = {
        ...updateDecodedCompany,
        ...updatedData,
        ...assignmentData,
      };
      // Preserve calledAt if it exists and status is not changing to "called"
      if (updateDecodedCompany.calledAt && updatedData.status !== "called") {
        updatedCompany.calledAt = updateDecodedCompany.calledAt;
      }
      // Preserve status timestamps
      if (updateDecodedCompany.warmAt && updatedData.status !== "warm") {
        updatedCompany.warmAt = updateDecodedCompany.warmAt;
      }
      if (updateDecodedCompany.coldAt && updatedData.status !== "cold") {
        updatedCompany.coldAt = updateDecodedCompany.coldAt;
      }
      if (updateDecodedCompany.hotAt && updatedData.status !== "hot") {
        updatedCompany.hotAt = updateDecodedCompany.hotAt;
      }
      if (updateDecodedCompany.onboardedAt && updatedData.status !== "onboarded") {
        updatedCompany.onboardedAt = updateDecodedCompany.onboardedAt;
      }
      if (updateDecodedCompany.deletedAt && updatedData.status !== "deleted") {
        updatedCompany.deletedAt = updateDecodedCompany.deletedAt;
      }
      // Add status timestamps when status changes
      if (updatedData.status === "called" && !updateDecodedCompany.calledAt) {
        updatedCompany.calledAt = new Date().toISOString();
      }
      if (updatedData.status === "warm" && !updateDecodedCompany.warmAt) {
        updatedCompany.warmAt = new Date().toISOString();
      }
      if (updatedData.status === "cold" && !updateDecodedCompany.coldAt) {
        updatedCompany.coldAt = new Date().toISOString();
      }
      if (updatedData.status === "hot" && !updateDecodedCompany.hotAt) {
        updatedCompany.hotAt = new Date().toISOString();
      }
      if (updatedData.status === "onboarded" && !updateDecodedCompany.onboardedAt) {
        updatedCompany.onboardedAt = new Date().toISOString();
      }
      // Unicode-safe encoding: encodeURIComponent + btoa
      const updatedJsonString = JSON.stringify(updatedCompany);
      const updatedUriEncoded = encodeURIComponent(updatedJsonString);
      if (Array.isArray(encodedCompanies)) {
        encodedCompanies[companyIndex] = btoa(updatedUriEncoded);
      } else {
        const key = companyIndex.toString();
        encodedCompanies[key] = btoa(updatedUriEncoded);
      }

      // Save back to Firestore
      try {
        await setDoc(batchDocRef, {
          ...batchData,
          companies: encodedCompanies,
        });
      } catch (error) {
        if (error.message && error.message.includes('size exceeds')) {
          // Split the batch due to size limit
          const totalCompanies = encodedCompanies.length;
          const mid = Math.floor(totalCompanies / 2);
          const firstHalf = encodedCompanies.slice(0, mid);
          const secondHalf = encodedCompanies.slice(mid);

          // Create new batch
          const newBatchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newBatchData = {
            companies: firstHalf,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, "companyleads", newBatchId), newBatchData);

          // Update old batch with second half
          const updatedBatchData = {
            ...batchData,
            companies: secondHalf,
          };
          await setDoc(batchDocRef, updatedBatchData);

          // Refresh data to update batchIds and local state
          fetchLeads();
          console.log('Batch split due to size limit');
        } else {
          throw error;
        }
      }

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
        pocLandline: updatedData.landline,
        industry: updatedData.industry,
        companySize: updatedData.companySize,
        status: updatedData.status,
        workingSince: updatedData.workingSince,
        calledAt: updatedData.calledAt || updateDecodedCompany.calledAt, // Preserve existing calledAt
        warmAt: updatedData.warmAt || updateDecodedCompany.warmAt,
        coldAt: updatedData.coldAt || updateDecodedCompany.coldAt,
        hotAt: updatedData.hotAt || updateDecodedCompany.hotAt,
        onboardedAt: updatedData.onboardedAt || updateDecodedCompany.onboardedAt,
        deletedAt: updatedData.deletedAt || updateDecodedCompany.deletedAt,
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
    console.log('Move to dead - Starting for leadId:', leadId);
    try {
      const lead = leads.find((l) => l.id === leadId);
      console.log('Move to dead - Lead data:', lead);
      if (!lead || !lead.batchId) return;

      // Confirm deletion - now it's actually marking as dead
      if (!window.confirm(`Are you sure you want to mark this lead as dead? It will be moved to the Dead tab.`)) {
        return;
      }
      console.log('Move to dead - User confirmed, proceeding with update');

      // Log the delete activity
      logPlacementActivity({
        userId: user?.uid,
        userName: user?.displayName || user?.name || "Unknown User",
        action: AUDIT_ACTIONS.DELETE_LEAD,
        companyId: leadId,
        companyName: lead.companyName || lead.name || "Unknown Company",
        details: `Marked lead as dead`,
        sessionId: sessionStorage.getItem('sessionId') || 'unknown'
      });

      // Fetch the batch document
      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];

        // Find the company index in the array
        const companyIndex = parseInt(leadId.split('_').pop()); // Extract index from "batch_39_5" -> 5

        let updated = false;
        if (Array.isArray(encodedCompanies)) {
          if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
            // Decode, update status to "deleted", and re-encode the company (Unicode-safe)
            const uriDecoded = atob(encodedCompanies[companyIndex]);
            const jsonString = decodeURIComponent(uriDecoded);
            const decodedCompany = JSON.parse(jsonString);

            const updatedCompany = {
              ...decodedCompany,
              status: "dead",
              deadAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            console.log('Array structure - Updated company data for lead', leadId, ':', updatedCompany);
            // Unicode-safe encoding: encodeURIComponent + btoa
            const updatedJsonString = JSON.stringify(updatedCompany);
            const updatedUriEncoded = encodeURIComponent(updatedJsonString);
            encodedCompanies[companyIndex] = btoa(updatedUriEncoded);
            updated = true;
          }
        } else {
          // Map structure
          const key = companyIndex.toString();
          if (encodedCompanies[key]) {
            // Decode, update status to "deleted", and re-encode the company (Unicode-safe)
            const uriDecoded = atob(encodedCompanies[key]);
            const jsonString = decodeURIComponent(uriDecoded);
            const decodedCompany = JSON.parse(jsonString);

            const updatedCompany = {
              ...decodedCompany,
              status: "dead",
              deadAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            console.log('Map structure - Updated company data for lead', leadId, ':', updatedCompany);
            // Unicode-safe encoding: encodeURIComponent + btoa
            const updatedJsonString = JSON.stringify(updatedCompany);
            const updatedUriEncoded = encodeURIComponent(updatedJsonString);
            encodedCompanies[key] = btoa(updatedUriEncoded);
            updated = true;
          }
        }

        if (updated) {
          // Save back to Firestore
          try {
            await setDoc(batchDocRef, {
              ...batchData,
              companies: encodedCompanies,
            });
          } catch (error) {
            if (error.message && error.message.includes('size exceeds')) {
              // Split the batch due to size limit
              const totalCompanies = encodedCompanies.length;
              const mid = Math.floor(totalCompanies / 2);
              const firstHalf = encodedCompanies.slice(0, mid);
              const secondHalf = encodedCompanies.slice(mid);

              // Create new batch
              const newBatchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const newBatchData = {
                companies: firstHalf,
                createdAt: new Date().toISOString(),
              };
              await setDoc(doc(db, "companyleads", newBatchId), newBatchData);

              // Update old batch with second half
              const updatedBatchData = {
                ...batchData,
                companies: secondHalf,
              };
              await setDoc(batchDocRef, updatedBatchData);

              // Refresh data to update batchIds and local state
              fetchLeads();
              console.log('Batch split due to size limit');
            } else {
              throw error;
            }
          }
        }
      }

      // Update local state - change status to "dead" instead of removing
      setLeads((prevLeads) =>
        prevLeads.map((l) =>
          l.id === leadId
            ? { ...l, status: "dead", deadAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : l
        )
      );

      // Switch to "dead" tab
      setActiveTab("dead");
      console.log('Move to dead - Successfully completed for leadId:', leadId);
    } catch (error) {
      handleFirestoreIndexError(error, "lead deletion");
      alert("Failed to mark the lead as dead. Please try again.");
    }
  };

  const handleAssignLead = async (leadId, user) => {
    try {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead || !lead.batchId) return;

      const userId = user.uid || user.id;
      const assigneeName = user.displayName || user.name || "Unknown User";

      // Log the assignment activity
      logPlacementActivity({
        userId: user?.uid,
        userName: user?.displayName || user?.name || "Unknown User",
        action: AUDIT_ACTIONS.ASSIGN_LEAD,
        companyId: leadId,
        companyName: lead.companyName || lead.name || "Unknown Company",
        details: `Assigned lead to ${assigneeName}`,
        changes: { assignedTo: userId, assigneeName },
        sessionId: sessionStorage.getItem('sessionId') || 'unknown'
      });

      // Fetch the batch document
      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];

        // Find the company index in the array
        const companyIndex = parseInt(leadId.split('_').pop()); // Extract index from "batch_39_5" -> 5

        let updated = false;
        if (Array.isArray(encodedCompanies)) {
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
            updated = true;
          }
        } else {
          // Map structure
          const key = companyIndex.toString();
          if (encodedCompanies[key]) {
            // Decode, update, and re-encode the company (Unicode-safe)
            const uriDecoded = atob(encodedCompanies[key]);
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
            encodedCompanies[key] = btoa(updatedUriEncoded);
            updated = true;
          }
        }

        if (updated) {
          // Save back to Firestore
          try {
            await setDoc(batchDocRef, {
              ...batchData,
              companies: encodedCompanies,
            });
          } catch (error) {
            if (error.message && error.message.includes('size exceeds')) {
              // Split the batch due to size limit
              const totalCompanies = encodedCompanies.length;
              const mid = Math.floor(totalCompanies / 2);
              const firstHalf = encodedCompanies.slice(0, mid);
              const secondHalf = encodedCompanies.slice(mid);

              // Create new batch
              const newBatchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const newBatchData = {
                companies: firstHalf,
                createdAt: new Date().toISOString(),
              };
              await setDoc(doc(db, "companyleads", newBatchId), newBatchData);

              // Update old batch with second half
              const updatedBatchData = {
                ...batchData,
                companies: secondHalf,
              };
              await setDoc(batchDocRef, updatedBatchData);

              // Refresh data to update batchIds and local state
              fetchLeads();
              console.log('Batch split due to size limit');
            } else {
              throw error;
            }
          }
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

  const handleBulkAssign = async (assignments, assignmentDate) => {
    // Update local state with the new assignments
    setLeads((prevLeads) =>
      prevLeads.map((lead) => {
        const assignment = assignments.find(a => a.leadId === lead.id);
        if (assignment) {
          return {
            ...lead,
            assignedTo: assignment.userId,
            assignedBy: user?.uid,
            assignedAt: new Date(assignmentDate).toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return lead;
      })
    );
    // Refresh data from Firestore to ensure consistency
    await fetchLeads();
  };

  // Filter follow-ups based on view mode (My Leads vs My Team)
  const filteredFollowUps = useMemo(() => {
    if (!user) {
      return []; // No follow-ups if no user
    }

    // fetchTodayFollowUps already filters based on view mode, so just return todayFollowUps
    return todayFollowUps;
  }, [todayFollowUps, user]);

  // Export leads report function
  const exportLeadsReport = useCallback((viewMode = 'myteam', selectedStatuses = ['hot', 'warm', 'called', 'onboarded', 'dead']) => {
    try {
      // Filter leads based on view mode
      let filteredLeads = leads;
      if (viewMode === 'myleads') {
        // My Leads: Only show leads assigned to current user
        filteredLeads = leads.filter(lead => lead.assignedTo === user?.uid);
      } else {
        // My Team: Show leads assigned to team members OR unassigned leads
        const teamMemberIds = user ? getTeamMemberIds(user.uid) : [];
        filteredLeads = leads.filter(lead => !lead.assignedTo || teamMemberIds.includes(lead.assignedTo));
      }

      // Group leads by status
      const leadsByStatus = {
        hot: [],
        warm: [],
        cold: [],
        called: [],
        onboarded: [],
        deleted: []
      };

      // Use filtered leads for the report
      filteredLeads.forEach(lead => {
        const status = lead.status || 'cold';
        if (leadsByStatus[status] && selectedStatuses.includes(status)) {
          leadsByStatus[status].push(lead);
        }
      });

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Status order for sheets
      const statusOrder = ['hot', 'warm', 'cold', 'called', 'onboarded', 'deleted'];

      statusOrder.forEach(status => {
        const statusLeads = leadsByStatus[status];
        if (statusLeads.length === 0) return;

        // Prepare data for this status
        const exportData = statusLeads.map(lead => {
          // Format follow-ups as numbered list
          let remarks = '';
          if (lead.followups && lead.followups.length > 0) {
            // Sort follow-ups by date ascending (oldest first)
            const sortedFollowups = lead.followups.sort((a, b) => new Date(a.date) - new Date(b.date));
            remarks = sortedFollowups.map((followup, index) => {
              const date = new Date(followup.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
              return `${index + 1}. ${date} - ${followup.template || 'No template'}`;
            }).join('\n');
          } else {
            remarks = lead.notes || 'No remarks';
          }

          // Get assigned user name
          const assignedUserData = Object.values(allUsers).find(u => 
            u.uid === lead.assignedTo || 
            u.id === lead.assignedTo || 
            u.email === lead.assignedTo
          );
          const assignedUser = lead.assignedTo ? 
            (assignedUserData?.displayName || 
             assignedUserData?.name || 
             assignedUserData?.email || 
             `${assignedUserData?.firstName || ''} ${assignedUserData?.lastName || ''}`.trim() || 
             'Unknown') : 
            'Unassigned';

          return {
            'Company Name': lead.companyName || lead.name || '',
            'Contact Person': lead.pocName || lead.contactPerson || '',
            'Designation': lead.pocDesignation || lead.designation || '',
            'Contact Details': lead.pocPhone || lead.phone || '',
            'Email ID': lead.pocMail || lead.email || '',
            'CTC': lead.ctc || '',
            'Remarks': remarks,
            'ASSGN': assignedUser
          };
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        const colWidths = [
          { wch: 25 }, // Company Name
          { wch: 20 }, // Contact Person
          { wch: 20 }, // Designation
          { wch: 15 }, // Contact Details
          { wch: 25 }, // Email ID
          { wch: 15 }, // CTC
          { wch: 40 }, // Remarks
          { wch: 15 }  // ASSGN
        ];
        ws['!cols'] = colWidths;

        // Get range and apply styling
        const range = XLSX.utils.decode_range(ws['!ref']);
        const totalRows = range.e.r + 1;
        const totalCols = range.e.c + 1;

        // Freeze header row
        ws['!freeze'] = { xSplit: 0, ySplit: 1 };

        // Apply styling
        for (let R = 0; R <= totalRows; ++R) {
          for (let C = 0; C < totalCols; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) continue;

            // Header row styling
            if (R === 0) {
              ws[cellAddress].s = {
                font: { 
                  bold: true, 
                  sz: 12, 
                  color: { rgb: "FFFFFF" },
                  name: "Calibri"
                },
                alignment: { 
                  horizontal: "center", 
                  vertical: "center",
                  wrapText: true
                },
                fill: { 
                  fgColor: { rgb: "1E40AF" },
                  patternType: "solid"
                },
                border: {
                  top: { style: "medium", color: { rgb: "1E40AF" } },
                  bottom: { style: "medium", color: { rgb: "1E40AF" } },
                  left: { style: "thin", color: { rgb: "1E40AF" } },
                  right: { style: "thin", color: { rgb: "1E40AF" } }
                }
              };
            } else {
              // Data rows styling
              const isEvenRow = (R - 1) % 2 === 0;
              
              ws[cellAddress].s = {
                font: { 
                  sz: 11, 
                  color: { rgb: "374151" },
                  name: "Calibri"
                },
                alignment: { 
                  vertical: "center",
                  wrapText: C === 6 // Remarks column
                },
                border: {
                  top: { style: "thin", color: { rgb: "E5E7EB" } },
                  bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                  left: { style: "thin", color: { rgb: "E5E7EB" } },
                  right: { style: "thin", color: { rgb: "E5E7EB" } }
                }
              };

              // Alternating row colors
              if (isEvenRow) {
                ws[cellAddress].s.fill = { 
                  fgColor: { rgb: "F9FAFB" },
                  patternType: "solid"
                };
              } else {
                ws[cellAddress].s.fill = { 
                  fgColor: { rgb: "FFFFFF" },
                  patternType: "solid"
                };
              }

              // Column-specific alignment
              if (C === 0 || C === 1 || C === 2 || C === 6) { // Text columns - left align
                ws[cellAddress].s.alignment = { 
                  horizontal: "left", 
                  vertical: "center",
                  wrapText: C === 6
                };
              } else if (C === 3) { // Contact Details - left align
                ws[cellAddress].s.alignment = { 
                  horizontal: "left", 
                  vertical: "center" 
                };
              } else { // Other columns - center align
                ws[cellAddress].s.alignment = { 
                  horizontal: "center", 
                  vertical: "center" 
                };
              }
            }
          }
        }

        // Add worksheet to workbook with status name
        const sheetName = status.charAt(0).toUpperCase() + status.slice(1) + ` (${statusLeads.length})`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      // Generate and download file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filename = `placement_leads_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, filename);

      showToast('Leads report exported successfully!', 'success');

      // Log export activity
      logPlacementActivity({
        userId: user?.uid,
        userName: user?.displayName || user?.name || "Unknown User",
        action: AUDIT_ACTIONS.VIEW_LEAD,
        companyId: null,
        companyName: null,
        details: `Exported leads report with ${filteredLeads.length} leads in view mode "${viewMode}" and statuses: ${selectedStatuses.join(', ')}`,
        sessionId: sessionStorage.getItem('sessionId') || 'unknown'
      });

    } catch (error) {
      console.error('Error exporting leads report:', error);
      showToast('Failed to export leads report', 'error');
    }
  }, [leads, allUsers, user, showToast, getTeamMemberIds]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-center min-h-screen">
        <p className="text-gray-600 text-xl">Loading your leads...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Header controls - only show when leads table is visible */}
      {!showFollowUpsDashboard && (
        <>
          {/* Header with View Toggle on Left, Search in Center, Actions on Right */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2">
            {/* View Mode Toggle and Filters on Left */}
            <div className="flex items-center gap-4 shrink-0 h-8">
              <ViewModeToggle
                viewMyLeadsOnly={viewMyLeadsOnly}
                setViewMyLeadsOnly={(value) => {
                  // Log view mode change
                  logPlacementActivity({
                    userId: user?.uid,
                    userName: user?.displayName || user?.name || "Unknown User",
                    action: AUDIT_ACTIONS.FILTER_APPLIED,
                    companyId: null,
                    companyName: null,
                    details: `Changed view mode to: ${value ? 'My Leads Only' : 'All Leads'}`,
                    changes: { viewMyLeadsOnly: value },
                    sessionId: sessionStorage.getItem('sessionId') || 'unknown'
                  });
                  setViewMyLeadsOnly(value);
                  // Update URL
                  const url = new URL(window.location);
                  url.searchParams.set('view', value ? 'myleads' : 'myteam');
                  window.history.replaceState(null, '', url);
                }}
              />
              <ViewToggle
                viewMode={viewMode}
                setViewMode={setViewMode}
              />
              <LeadFilters
                filters={{ selectedUserFilter, companyFilter, phoneFilter, industryFilter, dateFilterType, singleDate, startDate, endDate }}
                setFilters={(newFilters) => {
                  // Log filter application
                  logPlacementActivity({
                    userId: user?.uid,
                    userName: user?.displayName || user?.name || "Unknown User",
                    action: AUDIT_ACTIONS.FILTER_APPLIED,
                    companyId: null,
                    companyName: null,
                    details: `Applied filters: User=${newFilters.selectedUserFilter || 'all'}, Company="${newFilters.companyFilter || ''}", Phone="${newFilters.phoneFilter || ''}", Industry="${newFilters.industryFilter || ''}", Date Type="${newFilters.dateFilterType || 'single'}", Single Date="${newFilters.singleDate || ''}", Start Date="${newFilters.startDate || ''}", End Date="${newFilters.endDate || ''}"`,
                    changes: newFilters,
                    sessionId: sessionStorage.getItem('sessionId') || 'unknown'
                  });

                  setSelectedUserFilter(newFilters.selectedUserFilter || 'all');
                  setCompanyFilter(newFilters.companyFilter || '');
                  setPhoneFilter(newFilters.phoneFilter || '');
                  setIndustryFilter(newFilters.industryFilter || '');
                  setDateFilterType(newFilters.dateFilterType || 'single');
                  setSingleDate(newFilters.singleDate || '');
                  setStartDate(newFilters.startDate || '');
                  setEndDate(newFilters.endDate || '');
                }}
                isFilterOpen={isFilterOpen}
                setIsFilterOpen={setIsFilterOpen}
                allUsers={allUsers}
                leads={leads}
                activeTab={activeTab}
                viewMyLeadsOnly={viewMyLeadsOnly}
                currentUser={user}
                getTeamMemberIds={getTeamMemberIds}
              />
            </div>

            {/* Search in Center */}
            <div className="flex-1 flex justify-center max-w-md h-8">
              <input
                type="text"
                placeholder="Search companies or contacts..."
                className="w-full px-3 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs h-full"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
              />
            </div>

            {/* Microsoft 365 Connection Status */}
            <div className="flex items-center gap-2 shrink-0 h-8">
              <div className="flex items-center gap-2 px-2 py-1 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50">
                {ms365TestingConnection ? (
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <div
                    className={`w-3 h-3 rounded-full ${
                      ms365ConnectionStatus === 'connected'
                        ? 'bg-green-500 shadow-green-500/30 shadow-lg'
                        : ms365ConnectionStatus === 'weak'
                        ? 'bg-yellow-500 shadow-yellow-500/30 shadow-lg'
                        : 'bg-red-500 shadow-red-500/30 shadow-lg'
                    }`}
                  ></div>
                )}
                <img 
                  src="https://cdn-icons-png.flaticon.com/512/732/732221.png" 
                  alt="Microsoft Logo" 
                  title="Microsoft 365"
                  className="w-3 h-3 rounded-sm object-cover" 
                />
                {ms365ConnectionStatus !== 'connected' && !ms365TestingConnection && (
                  <button
                    onClick={connectToMs365}
                    className="ml-1 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md transition-all duration-200"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons on Right */}
            <div className="flex gap-1 shrink-0 h-8">
              <button
                onClick={() => {
                  const newState = !showFollowUpsDashboard;
                  setShowFollowUpsDashboard(newState);
                  const url = new URL(window.location);
                  if (newState) {
                    url.searchParams.set('show', 'followupdashboard');
                  } else {
                    url.searchParams.delete('show');
                  }
                  window.history.replaceState(null, '', url);
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md transition-all duration-200 text-xs h-full"
              >
                Followups
              </button>
              <button
                onClick={() => setShowAddLeadForm(true)}
                className="px-3 py-1 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center justify-center hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md transition-all duration-200 text-xs h-full"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Add Company
              </button>
              {user && (user?.departments?.includes("admin") || 
                         user?.departments?.includes("Admin") || 
                         user?.department === "admin" || 
                         user?.department === "Admin" ||
                         user?.role === "admin" || 
                         user?.role === "Admin") && (
                <button
                  onClick={() => setShowBulkUploadForm(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md text-xs h-full"
                >
                  <CloudUploadIcon className="h-3 w-3 mr-1" />
                  
                </button>
              )}
              {user && (user?.departments?.includes("admin") || 
                         user?.departments?.includes("Admin") || 
                         user?.department === "admin" || 
                         user?.department === "Admin" ||
                         user?.role === "admin" || 
                         user?.role === "Admin") && (
                <button
                  onClick={() => setShowExcelScanner(true)}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center hover:bg-red-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md text-xs h-full"
                >
                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  
                </button>
              )}
              {user && (user?.role === "Director" || user?.role === "Head") && !viewMyLeadsOnly && (
                <button
                  onClick={() => setShowBulkAssignModal(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md text-xs h-full"
                >
                  Bulk Assign
                </button>
              )}
              {user && (user?.departments?.includes("admin") || 
                         user?.departments?.includes("Admin") || 
                         user?.department === "admin" || 
                         user?.department === "Admin" ||
                         user?.role === "admin" || 
                         user?.role === "Admin") && (
                <button
                  onClick={() => setShowBatchSplitModal(true)}
                  title="Split Batches"
                  className="px-2 py-1 bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-md text-xs h-full"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Status tabs - only show when leads table is visible */}
          <LeadStatusTabs
            activeTab={activeTab}
            onTabChange={(tab) => {
              // Log tab change activity
              logPlacementActivity({
                userId: user?.uid,
                userName: user?.displayName || user?.name || "Unknown User",
                action: AUDIT_ACTIONS.FILTER_APPLIED,
                companyId: null,
                companyName: null,
                details: `Changed tab filter to: ${tab}`,
                changes: { tabFilter: tab },
                sessionId: sessionStorage.getItem('sessionId') || 'unknown'
              });
              setActiveTab(tab);
              // Update URL
              const url = new URL(window.location);
              url.searchParams.set('tab', tab);
              window.history.replaceState(null, '', url);
            }}
            setActiveTab={setActiveTab}
            leadsByStatus={leadsByStatus}
          />
        </>
      )}



      {/* Conditionally render LeadsTable or FollowupDashboard */}
      {showFollowUpsDashboard ? (
        <FollowupDashboard
          allLeads={allLeads}
          allUsers={allUsers}
          user={user}
          showDashboard={showFollowUpsDashboard}
          onClose={() => {
            setShowFollowUpsDashboard(false);
            const url = new URL(window.location);
            url.searchParams.delete('show');
            window.history.replaceState(null, '', url);
          }}
          onRefresh={async () => {
            setLoading(true);
            await fetchLeads();
            await fetchTodayFollowUps();
            setLoading(false);
          }}
          onScheduleMeeting={handleScheduleMeeting}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <LeadsTable
          leads={filteredLeads}
          groupedLeads={groupedLeads}
          activeTab={activeTab}
          onLeadClick={(lead) => {
            // Log the view activity
            logPlacementActivity({
              userId: user?.uid,
              userName: user?.displayName || user?.name || "Unknown User",
              action: AUDIT_ACTIONS.VIEW_LEAD,
              companyId: lead.id,
              companyName: lead.companyName || lead.name || "Unknown Company",
              details: `Viewed lead details for ${lead.companyName || lead.name || "Unknown Company"}`,
              sessionId: sessionStorage.getItem('sessionId') || 'unknown'
            });

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
          formatDate={formatDate}
          order={true}
          showCheckboxes={false}
          selectedLeads={[]}
          onSelectionChange={() => {}}
        />
      )}

      {/* Company Count Display - only show when leads table is visible */}
      {!showFollowUpsDashboard && (
        <div className="flex justify-between items-center mt-4 px-4 py-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-700">
            Total: {filteredLeads.length} companies loaded
            {selectedUserFilter !== 'all' && (
              <span className="ml-2 text-blue-600">
                (filtered by {selectedUserFilter === 'unassigned' ? 'unassigned leads' : 
                  Object.values(allUsers).find(u => (u.uid || u.id) === selectedUserFilter)?.name || 'user'})
              </span>
            )}
            {companyFilter.trim() && (
              <span className="ml-2 text-green-600">
                (company: "{companyFilter.trim()}")
              </span>
            )}
            {phoneFilter.trim() && (
              <span className="ml-2 text-blue-600">
                (phone: "{phoneFilter.trim()}")
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              title="Export leads report with follow-ups"
            >
              Export Report
            </button>
            <button
              onClick={async () => {
                // Log refresh action
                logPlacementActivity({
                  userId: user?.uid,
                  userName: user?.displayName || user?.name || "Unknown User",
                  action: AUDIT_ACTIONS.VIEW_LEAD,
                  companyId: null,
                  companyName: null,
                  details: `Refreshed leads data`,
                  sessionId: sessionStorage.getItem('sessionId') || 'unknown'
                });

                setLoading(true);
                await fetchLeads();
              }}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              title="Refresh data from server"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

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

              // Log contact addition
              await logPlacementActivity({
                action: 'ADD_CONTACT',
                leadId: leadId,
                leadName: lead.companyName || lead.name,
                details: `Added contact: ${contactData.name || 'Unknown'} (${contactData.email || contactData.phone || 'No contact info'})`,
                changes: contactData
              });

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

              let validIndex = false;
              if (Array.isArray(encodedCompanies)) {
                validIndex = companyIndex >= 0 && companyIndex < encodedCompanies.length;
              } else {
                validIndex = encodedCompanies[companyIndex.toString()] !== undefined;
              }

              if (!validIndex) {
                throw new Error('Invalid company index');
              }

              // Decode, update contacts, and re-encode the company (Unicode-safe)
              let uriDecoded, jsonString, decodedCompany;
              if (Array.isArray(encodedCompanies)) {
                uriDecoded = atob(encodedCompanies[companyIndex]);
                jsonString = decodeURIComponent(uriDecoded);
                decodedCompany = JSON.parse(jsonString);
              } else {
                const key = companyIndex.toString();
                uriDecoded = atob(encodedCompanies[key]);
                jsonString = decodeURIComponent(uriDecoded);
                decodedCompany = JSON.parse(jsonString);
              }
              const existingContacts = decodedCompany.contacts || [];
              const updatedCompany = {
                ...decodedCompany,
                contacts: [...existingContacts, contactData],
              };
              // Unicode-safe encoding: encodeURIComponent + btoa
              const updatedJsonString = JSON.stringify(updatedCompany);
              const updatedUriEncoded = encodeURIComponent(updatedJsonString);
              if (Array.isArray(encodedCompanies)) {
                encodedCompanies[companyIndex] = btoa(updatedUriEncoded);
              } else {
                const key = companyIndex.toString();
                encodedCompanies[key] = btoa(updatedUriEncoded);
              }

              // Save back to Firestore
              try {
                await setDoc(batchDocRef, {
                  ...batchData,
                  companies: encodedCompanies,
                });
              } catch (error) {
                if (error.message && error.message.includes('size exceeds')) {
                  // Split the batch due to size limit
                  const totalCompanies = encodedCompanies.length;
                  const mid = Math.floor(totalCompanies / 2);
                  const firstHalf = encodedCompanies.slice(0, mid);
                  const secondHalf = encodedCompanies.slice(mid);

                  // Create new batch
                  const newBatchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  const newBatchData = {
                    companies: firstHalf,
                    createdAt: new Date().toISOString(),
                  };
                  await setDoc(doc(db, "companyleads", newBatchId), newBatchData);

                  // Update old batch with second half
                  const updatedBatchData = {
                    ...batchData,
                    companies: secondHalf,
                  };
                  await setDoc(batchDocRef, updatedBatchData);

                  // Refresh data to update batchIds and local state
                  fetchLeads();
                  console.log('Batch split due to size limit');
                } else {
                  throw error;
                }
              }

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
        allUsers={allUsers}
        currentUser={user}
      />

      {/* Excel Scanner Modal */}
      {showExcelScanner && (
        <div className="fixed inset-0 z-54 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-linear-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-semibold text-white">Excel Upload Scanner</h2>
              <button
                onClick={() => setShowExcelScanner(false)}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <ExcelUploadDelete />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      <BulkAssignModal
        show={showBulkAssignModal}
        onClose={() => setShowBulkAssignModal(false)}
        unassignedLeads={leads.filter(lead => !lead.assignedTo)}
        allUsers={allUsers}
        onAssign={handleBulkAssign}
        currentUser={user}
        onRefresh={fetchLeads}
        showToast={showToast}
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

      {/* iPhone-style Toast */}
      {toast.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-60 transition-all duration-500 ease-out opacity-100 translate-y-0">
          <div className="px-6 py-4 rounded-2xl shadow-xl backdrop-blur-md border max-w-sm mx-auto bg-green-100 text-black border-green-300 shadow-green-500/20">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full animate-pulse bg-green-500"></div>
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0  bg-opacity-25 backdrop-blur-sm flex items-center justify-center z-54">
          <div className="bg-white rounded-2xl shadow-lg p-4 max-w-xs w-full mx-4">
            {/* Header */}
            <div className="text-center mb-3">
              <div className="w-6 h-6 bg-gray-100 rounded-lg mx-auto mb-1.5 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Export Leads Report</h3>
              <p className="text-xs text-gray-500">Generate Excel report with follow-ups</p>
            </div>

            {/* View Mode Selection */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Current View</label>
              <div className="bg-gray-50 rounded-lg p-2 flex gap-1.5">
                <div className="flex items-center justify-between p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 flex-1">
                  <div className="flex items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mr-1.5 ${!viewMyLeadsOnly ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                    <span className="text-xs font-medium text-gray-900">My Team</span>
                  </div>
                  {!viewMyLeadsOnly && (
                    <div className="text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded font-medium">Active</div>
                  )}
                </div>
                <div className="flex items-center justify-between p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 flex-1">
                  <div className="flex items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mr-1.5 ${viewMyLeadsOnly ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                    <span className="text-xs font-medium text-gray-900">My Leads</span>
                  </div>
                  {viewMyLeadsOnly && (
                    <div className="text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded font-medium">Active</div>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Export includes leads from current view
              </p>
            </div>

            {/* Status Selection */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Select Statuses</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'hot', label: 'HOT' },
                  { value: 'warm', label: 'WARM' },
                  { value: 'called', label: 'CALLED' },
                  { value: 'onboarded', label: 'ONBOARDED' },
                  { value: 'cold', label: 'COLD' }
                ].map((status) => {
                  const isDisabled = status.value === 'cold' && !viewMyLeadsOnly;
                  return (
                    <label key={status.value} className={`flex items-center p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                      isDisabled
                        ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                        : exportStatuses.includes(status.value)
                          ? 'bg-gray-100 border-gray-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={exportStatuses.includes(status.value)}
                        disabled={isDisabled}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExportStatuses([...exportStatuses, status.value]);
                          } else {
                            setExportStatuses(exportStatuses.filter(s => s !== status.value));
                          }
                        }}
                        className="w-3 h-3 text-gray-600 bg-white border-gray-300 rounded focus:ring-gray-500 focus:ring-1 mr-1.5"
                      />
                      <span className={`text-xs font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                        {status.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-3 py-2 text-gray-600 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 active:scale-95 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  exportLeadsReport(viewMyLeadsOnly ? 'myleads' : 'myteam', exportStatuses);
                  setShowExportModal(false);
                }}
                disabled={exportStatuses.length === 0}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 text-xs ${
                  exportStatuses.length === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-800 text-white hover:bg-gray-900'
                }`}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      <BatchSplitModal
        showBatchSplitModal={showBatchSplitModal}
        setShowBatchSplitModal={setShowBatchSplitModal}
        fetchLeads={fetchLeads}
        showToast={showToast}
        user={user}
      />



    </div>    
  );
}

export default CompanyLeads;
