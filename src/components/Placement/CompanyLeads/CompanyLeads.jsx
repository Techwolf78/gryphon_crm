import React, { useState, useEffect, useCallback, useMemo } from "react";
import AddLeads from "./AddLeads";
import AddJD from "../AddJd/AddJD"; // ✅ adjust the relative path

import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
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
  const [selectedLead, setSelectedLead] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);

  // AddJD modal state
const [showAddJDForm, setShowAddJDForm] = useState(false);
const [selectedCompanyForJD, setSelectedCompanyForJD] = useState(null);


  // Fetch all leads from Firestore
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "CompanyLeads"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const leadsData = querySnapshot.docs.map((doc) => {
          const data = doc.data() || {};
          // Normalize status to expected keys (hot, warm, cold, onboarded)
          const rawStatus = data.status || "warm";
          const status = String(rawStatus).toLowerCase();

          return {
            id: doc.id,
            ...data,
            status,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate().toISOString()
              : new Date().toISOString(),
            contacts: data.contacts || [],
          };
        });
        setLeads(leadsData);
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
  // Ensure we only count known statuses and normalize keys
  const leadsByStatus = leads.reduce((acc, lead) => {
    const allowed = ["hot", "warm", "cold", "onboarded"];
    const s = (lead.status || "warm").toLowerCase();
    const key = allowed.includes(s) ? s : "warm";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const handleAddLead = (newLead) => {
    setLeads((prevLeads) => [
      {
        ...newLead,
        status: (newLead.status || "warm").toLowerCase(),
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

    // Update Firestore document
    await updateDoc(doc(db, "CompanyLeads", leadId), {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    // Update local state
    setLeads((prevLeads) =>
      prevLeads.map((l) =>
        l.id === leadId
          ? { ...l, status: newStatus, updatedAt: new Date().toISOString() }
          : l
      )
    );

    // Close the dropdown
    setShowActionMenu(null);

    // ✅ If marked as onboarded → open AddJD modal
    if (newStatus === "onboarded") {
      setSelectedCompanyForJD(lead);  // send company info to AddJD
      setShowAddJDForm(true);
    }
  } catch (error) {
    console.error("Error updating lead status:", error);
  }
};


  const toggleActionMenu = (leadId, e) => {
    e.stopPropagation();
    setShowActionMenu(showActionMenu === leadId ? null : leadId);
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
      />

      <LeadsFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        setActiveTab={setActiveTab}
        leadsByStatus={leadsByStatus}
      />

      <LeadsTable
        leads={filteredLeads}
        activeTab={activeTab}
        searchTerm={searchTerm}
        showActionMenu={showActionMenu}
        onToggleActionMenu={toggleActionMenu}
        onStatusChange={handleStatusChange}
        onLeadClick={(lead) => {
          setSelectedLead(lead);
          setShowLeadDetails(true);
        }}
      />

      {/* Lead Details Modal */}
      {showLeadDetails && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => setShowLeadDetails(false)}
          onAddContact={(leadId, contactData) => {
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


    </div>

    
  );
}

export default CompanyLeads;
