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
// import FollowupAlerts from "../Sales/FollowupAlerts";

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
      setLeads(allCompanies);

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
        }));
        setLeads(leadsData);
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
  }, []);

  // Load data from cache or fetch from Firestore
  const loadData = useCallback(async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log("✅ Loaded data from cache");
          setLeads(data);
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
  }, [fetchLeads, CACHE_DURATION]);

  // Initial fetch on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter leads based on active tab and search term
  const filteredLeads = useMemo(() => {
    // Early return for empty search and "all" tab
    if (!debouncedSearchTerm && activeTab === "all") {
      return leads;
    }

    const searchLower = debouncedSearchTerm ? debouncedSearchTerm.toLowerCase() : '';

    return leads.filter((lead) => {
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
  }, [leads, activeTab, debouncedSearchTerm]);

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
            const updatedCompany = {
              ...decodedCompany,
              ...updatedData,
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

    // Update local state
    setLeads((prevLeads) =>
      prevLeads.map((l) =>
        l.id === leadId
          ? { ...l, ...updatedData, updatedAt: new Date().toISOString() }
          : l
      )
    );

    // Update selectedLead if it's the currently selected lead
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(prev => ({ ...prev, ...updatedData, updatedAt: new Date().toISOString() }));
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <LeadsHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAddLead={() => setShowAddLeadForm(true)}
        onBulkUpload={() => setShowBulkUploadForm(true)}
      />

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
      />

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
