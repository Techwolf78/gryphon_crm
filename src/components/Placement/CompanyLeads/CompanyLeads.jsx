import React, { useState, useEffect, useCallback, useMemo } from "react";
import AddLeads from "./AddLeads";
import EditLeadModal from "./EditLeadModal";
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
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../../../firebase";
import LeadsHeader from "./LeadsHeader";
import LeadsFilters from "./LeadsFilters";
import LeadsTable from "./LeadsTable";
import LeadDetailsModal from "./LeadDetailsModal";
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
  const [showEditLeadForm, setShowEditLeadForm] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(1000); // Fixed page size of 1000 companies
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);


  // Fetch leads with pagination from Firestore
  const fetchLeads = useCallback(async (page = 1, startDoc = null) => {
    try {
      setLoading(true);

      // Fetch from companyleads collection (batches uploaded via Excel)
      let q;
      if (startDoc && page > 1) {
        q = query(
          collection(db, "companyleads"),
          orderBy("__name__", "desc"), // Always sort descending
          startAfter(startDoc),
          limit(5) // Fetch 5 batches at a time to get ~10,000 companies
        );
      } else {
        q = query(
          collection(db, "companyleads"),
          orderBy("__name__", "desc"), // Always sort descending
          limit(5)
        );
      }

      const querySnapshot = await getDocs(q);

      const allCompanies = [];
      let lastDocument = null;

      querySnapshot.docs.forEach((batchDoc) => {
        const batchData = batchDoc.data();
        const encodedCompanies = batchData.companies || [];

        // Decode Base64 companies and add batch info
        encodedCompanies.forEach((encodedCompany, index) => {
          try {
            const decodedCompany = JSON.parse(atob(encodedCompany));
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

        lastDocument = batchDoc;
      });

      // Check if we have more pages
      const hasMorePages = querySnapshot.docs.length === 5;

      setLeads(allCompanies);
      setLastDoc(lastDocument);
      setHasMore(hasMorePages);
      setCurrentPage(page);

    } catch (error) {
      handleFirestoreIndexError(error, "fetching leads");

      // Fallback to old CompanyLeads collection if new structure fails
      try {
        console.log("🔄 Falling back to old CompanyLeads collection...");
        const q = query(
          collection(db, "CompanyLeads"),
          orderBy("createdAt", "desc"),
          limit(pageSize)
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
        setHasMore(querySnapshot.docs.length === pageSize);
        console.log("✅ Successfully loaded data from fallback collection");
      } catch (fallbackError) {
        handleFirestoreIndexError(fallbackError, "fallback fetch");
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchLeads(1, null);
  }, [fetchLeads]);

  // Refetch when pagination changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchLeads(currentPage, currentPage === 1 ? null : lastDoc);
    }
  }, [currentPage, lastDoc, fetchLeads]);

  // Filter leads based on active tab and search term
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // First filter by status if not showing all
      if (activeTab !== "all" && lead.status !== activeTab) {
        return false;
      }

      // Then filter by search term if present
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          lead.companyName?.toLowerCase().includes(searchLower) ||
          lead.pocName?.toLowerCase().includes(searchLower) ||
          lead.pocLocation?.toLowerCase().includes(searchLower) ||
          lead.pocPhone?.toLowerCase().includes(searchLower) ||
          lead.contacts?.some(
            (contact) =>
              contact.name?.toLowerCase().includes(searchLower) ||
              contact.email?.toLowerCase().includes(searchLower) ||
              contact.phone?.toLowerCase().includes(searchLower)
          )
        );
      }
      return true;
    });
  }, [leads, activeTab, searchTerm]);

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
        const companyIndex = parseInt(leadId.split('_')[1]); // Extract index from "batch_1_5" -> 5

        if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
          // Decode, update, and re-encode the company
          const decodedCompany = JSON.parse(atob(encodedCompanies[companyIndex]));
          const updatedCompany = {
            ...decodedCompany,
            status: newStatus,
          };
          encodedCompanies[companyIndex] = btoa(JSON.stringify(updatedCompany));

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

  const handleEditLead = (lead) => {
    setLeadToEdit(lead);
    setShowEditLeadForm(true);
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
          const companyIndex = parseInt(leadId.split('_')[1]); // Extract index from "batch_1_5" -> 5

          if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
            // Decode, update, and re-encode the company
            const decodedCompany = JSON.parse(atob(encodedCompanies[companyIndex]));
            const updatedCompany = {
              ...decodedCompany,
              ...updatedData,
            };
            encodedCompanies[companyIndex] = btoa(JSON.stringify(updatedCompany));

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
        onSearchChange={setSearchTerm}
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
        onEditLead={handleEditLead}
        onScheduleMeeting={handleScheduleMeeting}
      />

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4 px-4 py-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-700">
          Showing {leads.length} companies (Page {currentPage})
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={!hasMore || loading}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Lead Details Modal */}
      {showLeadDetails && (
        <LeadDetailsModal
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
                  const companyIndex = parseInt(leadId.split('_')[1]); // Extract index from "batch_1_5" -> 5

                  if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
                    // Decode, update contacts, and re-encode the company
                    const decodedCompany = JSON.parse(atob(encodedCompanies[companyIndex]));
                    const existingContacts = decodedCompany.contacts || [];
                    const updatedCompany = {
                      ...decodedCompany,
                      contacts: [...existingContacts, contactData],
                    };
                    encodedCompanies[companyIndex] = btoa(JSON.stringify(updatedCompany));

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
          formatDate={formatDate}
        />
      )}

      {/* Add Company Modal */}
      <AddLeads
        show={showAddLeadForm}
        onClose={() => setShowAddLeadForm(false)}
        onAddLead={handleAddLead}
      />

      {/* Add JD Modal */}
{showAddJDForm && (
  <AddJD
    show={showAddJDForm}
    onClose={() => setShowAddJDForm(false)}
    prefillData={selectedCompanyForJD} // ✅ pass company info to prefill
  />
)}

      {/* Edit Lead Modal */}
      <EditLeadModal
        show={showEditLeadForm}
        onClose={() => setShowEditLeadForm(false)}
        lead={leadToEdit}
        onUpdateLead={handleUpdateLead}
      />

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
