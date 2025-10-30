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
  updateDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import LeadsHeader from "./LeadsHeader";
import LeadsFilters from "./LeadsFilters";
import LeadsTable from "./LeadsTable";
import LeadDetailsModal from "./LeadDetailsModal";

function CompanyLeads() {
  const [activeTab, setActiveTab] = useState("hot");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddLeadForm, setShowAddLeadForm] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showEditLeadForm, setShowEditLeadForm] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);
  const [showBulkUploadForm, setShowBulkUploadForm] = useState(false);

  // AddJD modal state
const [showAddJDForm, setShowAddJDForm] = useState(false);
const [selectedCompanyForJD, setSelectedCompanyForJD] = useState(null);


  // Fetch all leads from Firestore
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);

        // First, check if there's a bulk document with all companies
        const bulkDocRef = doc(db, "CompanyLeads", "bulk");
        const bulkDocSnap = await getDoc(bulkDocRef);

        if (bulkDocSnap.exists() && bulkDocSnap.data().companies) {
          // Use data from bulk document
          const companies = bulkDocSnap.data().companies;
          const leadsData = companies.map((company, index) => ({
            id: `bulk_${index}`, // Use bulk_ prefix for IDs from bulk document
            ...company,
            createdAt: company.createdAt || new Date().toISOString(),
            updatedAt: company.updatedAt || new Date().toISOString(),
            contacts: company.contacts || [],
          }));
          setLeads(leadsData);
          setIsBulkMode(true);
        } else {
          // Fall back to individual documents
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
          setIsBulkMode(false);
        }
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

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
    if (!lead) return;

    if (isBulkMode) {
      // Update the bulk document
      const bulkDocRef = doc(db, "CompanyLeads", "bulk");
      const bulkDocSnap = await getDoc(bulkDocRef);

      if (bulkDocSnap.exists()) {
        const companies = bulkDocSnap.data().companies;
        const leadIndex = parseInt(leadId.replace('bulk_', ''));

        if (leadIndex >= 0 && leadIndex < companies.length) {
          companies[leadIndex] = {
            ...companies[leadIndex],
            status: newStatus,
            updatedAt: new Date().toISOString(),
          };

          await setDoc(bulkDocRef, { companies });
        }
      }
    } else {
      // Update individual document
      await updateDoc(doc(db, "CompanyLeads", leadId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
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
    console.error("Error updating lead status:", error);
  }
};

  const handleEditLead = (lead) => {
    setLeadToEdit(lead);
    setShowEditLeadForm(true);
  };

  const handleUpdateLead = (leadId, updatedData) => {
    if (isBulkMode) {
      // Update the bulk document
      const updateBulkDocument = async () => {
        try {
          const bulkDocRef = doc(db, "CompanyLeads", "bulk");
          const bulkDocSnap = await getDoc(bulkDocRef);

          if (bulkDocSnap.exists()) {
            const companies = bulkDocSnap.data().companies;
            const leadIndex = parseInt(leadId.replace('bulk_', ''));

            if (leadIndex >= 0 && leadIndex < companies.length) {
              companies[leadIndex] = {
                ...companies[leadIndex],
                ...updatedData,
                updatedAt: new Date().toISOString(),
              };

              await setDoc(bulkDocRef, { companies });
            }
          }
        } catch (error) {
          console.error("Error updating bulk document:", error);
        }
      };
      updateBulkDocument();
    } else {
      // Update individual document
      const updateIndividualDocument = async () => {
        try {
          await updateDoc(doc(db, "CompanyLeads", leadId), {
            ...updatedData,
            updatedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error updating individual document:", error);
        }
      };
      updateIndividualDocument();
    }

    // Update local state
    setLeads((prevLeads) =>
      prevLeads.map((l) =>
        l.id === leadId
          ? { ...l, ...updatedData, updatedAt: new Date().toISOString() }
          : l
      )
    );
  };

  const handleBulkAddLeads = (newLeads) => {
    setLeads((prevLeads) => [
      ...newLeads.map(lead => ({
        ...lead,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      ...prevLeads,
    ]);
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
      />

      {/* Lead Details Modal */}
      {showLeadDetails && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => setShowLeadDetails(false)}
          onAddContact={(leadId, contactData) => {
            if (isBulkMode) {
              // Update the bulk document
              const updateBulkContacts = async () => {
                try {
                  const bulkDocRef = doc(db, "CompanyLeads", "bulk");
                  const bulkDocSnap = await getDoc(bulkDocRef);

                  if (bulkDocSnap.exists()) {
                    const companies = bulkDocSnap.data().companies;
                    const leadIndex = parseInt(leadId.replace('bulk_', ''));

                    if (leadIndex >= 0 && leadIndex < companies.length) {
                      const existingContacts = companies[leadIndex].contacts || [];
                      companies[leadIndex] = {
                        ...companies[leadIndex],
                        contacts: [...existingContacts, contactData],
                        updatedAt: new Date().toISOString(),
                      };

                      await setDoc(bulkDocRef, { companies });
                    }
                  }
                } catch (error) {
                  console.error("Error updating bulk contacts:", error);
                }
              };
              updateBulkContacts();
            }

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
        onBulkAddLeads={handleBulkAddLeads}
      />

    </div>

    
  );
}

export default CompanyLeads;
