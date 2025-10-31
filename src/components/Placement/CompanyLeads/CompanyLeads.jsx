import React, { useState, useCallback, useMemo } from "react";
import AddLeads from "./AddLeads";
import AddJD from "../AddJd/AddJD"; // ✅ adjust the relative path

import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase";
import LeadsHeader from "./LeadsHeader";
import LeadsFilters from "./LeadsFilters";
import LeadsTable from "./LeadsTable";
import LeadDetailsModal from "./LeadDetailsModal";

function CompanyLeads({ leads = [], onLeadSelect }) {
  const [activeTab, setActiveTab] = useState("hot");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddLeadForm, setShowAddLeadForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);

  // AddJD modal state
const [showAddJDForm, setShowAddJDForm] = useState(false);
const [selectedCompanyForJD, setSelectedCompanyForJD] = useState(null);


  // `leads` are provided via props (Placement page sets up a real-time listener)

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

  // Group leads by status for tab counts (normalize keys)
  const leadsByStatus = (leads || []).reduce((acc, lead) => {
    const allowed = ["hot", "warm", "cold", "onboarded"];
    const s = (lead.status || "warm").toLowerCase();
    const key = allowed.includes(s) ? s : "warm";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Add lead handling is done by AddLeads (writes to Firestore).
  // The Placement page supplies `leads` via onSnapshot so we don't manage it locally here.

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const lead = (leads || []).find((l) => l.id === leadId);
      if (!lead) return;

      // Update Firestore document — onSnapshot in the parent will update the UI
      await updateDoc(doc(db, "CompanyLeads", leadId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      // Close the dropdown
      setShowActionMenu(null);

      // If marked as onboarded → open AddJD modal
      if (newStatus === "onboarded") {
        setSelectedCompanyForJD(lead); // send company info to AddJD
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

  // No local loading; parent supplies `leads` (may be empty array while loading)

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
          // If parent passed an onLeadSelect handler, prefer that (e.g. navigate to CompanyOpen)
          if (onLeadSelect) {
            onLeadSelect(lead);
            return;
          }
          setSelectedLead(lead);
          setShowLeadDetails(true);
        }}
      />

      {/* Lead Details Modal */}
      {showLeadDetails && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => setShowLeadDetails(false)}
          // LeadDetailsModal writes to Firestore directly; parent onSnapshot will refresh UI
          onAddContact={null}
          formatDate={formatDate}
        />
      )}

      {/* Add Company Modal */}
      <AddLeads
        show={showAddLeadForm}
        onClose={() => setShowAddLeadForm(false)}
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
