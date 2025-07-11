import React, { useState, useEffect } from "react";
import AddLeads from "./AddLeads";
import { collection, getDocs, query, orderBy, where, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { DotsVerticalIcon, XIcon } from "@heroicons/react/outline";

const statusColorMap = {
  hot: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-300",
    activeBg: "bg-red-100",
    tab: {
      active: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg",
      inactive: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
    }
  },
  warm: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-300",
    activeBg: "bg-orange-100",
    tab: {
      active: "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg",
      inactive: "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
    }
  },
  cold: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-300",
    activeBg: "bg-blue-100",
    tab: {
      active: "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg",
      inactive: "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
    }
  },
  onboarded: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-300",
    activeBg: "bg-green-100",
    tab: {
      active: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg",
      inactive: "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
    }
  }
};

const tabLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  onboarded: "Onboarded"
};

function CompanyLeads() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddLeadForm, setShowAddLeadForm] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);

  // Fetch leads from Firestore
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        let q;
        if (activeTab === 'all') {
          q = query(collection(db, "CompanyLeads"), orderBy("createdAt", "desc"));
        } else {
          q = query(
            collection(db, "CompanyLeads"),
            where("status", "==", activeTab),
            orderBy("createdAt", "desc")
          );
        }
        
        const querySnapshot = await getDocs(q);
        const leadsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate().toISOString()
            : new Date().toISOString()
        }));
        setLeads(leadsData);
      } catch (error) {
        console.error("Error fetching leads: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [activeTab]);

  const filteredLeads = leads.filter(lead => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        (lead.companyName?.toLowerCase().includes(searchLower) || '') ||
        (lead.pocName?.toLowerCase().includes(searchLower) || '') ||
        (lead.pocLocation?.toLowerCase().includes(searchLower) || '') ||
        (lead.pocPhone?.toLowerCase().includes(searchLower) || '')
      );
    }
    return true;
  });

  const handleAddLead = (newLead) => {
    setLeads(prevLeads => [newLead, ...prevLeads]);
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await updateDoc(doc(db, "CompanyLeads", leadId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      setLeads(leads.map(lead => 
        lead.id === leadId ? {...lead, status: newStatus} : lead
      ));
      setShowActionMenu(null);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const toggleActionMenu = (leadId, e) => {
    e.stopPropagation();
    setShowActionMenu(showActionMenu === leadId ? null : leadId);
  };

  const LeadDetailsModal = ({ lead, onClose }) => {
    if (!lead) return null;

    return (
      <div className="fixed inset-0 bg-blur backdrop-blur bg-opacity-50 flex items-center justify-center z-54">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex justify-between items-center sticky top-0">
            <h2 className="text-lg font-semibold">Company Details</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-blue-700 transition">
              <XIcon className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Company Name</label>
                  <p className="mt-1 text-gray-900">{lead.companyName || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Website</label>
                  <p className="mt-1 text-gray-900">{lead.companyWebsite || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Industry</label>
                  <p className="mt-1 text-gray-900">{lead.industry || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Company Size</label>
                  <p className="mt-1 text-gray-900">{lead.companySize || "-"}</p>
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Contact Person</label>
                  <p className="mt-1 text-gray-900">{lead.pocName || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-gray-900">{lead.pocMail || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Phone</label>
                  <p className="mt-1 text-gray-900">{lead.pocPhone || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Location</label>
                  <p className="mt-1 text-gray-900">{lead.pocLocation || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Designation</label>
                  <p className="mt-1 text-gray-900">{lead.pocDesignation || "-"}</p>
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1 capitalize text-gray-900">{lead.status || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Source</label>
                  <p className="mt-1 text-gray-900">{lead.source || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created At</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(lead.createdAt).toLocaleDateString() || "-"}
                  </p>
                </div>
              </div>
            </div>

            {lead.notes && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Notes</label>
                <p className="mt-1 whitespace-pre-line text-gray-900">{lead.notes}</p>
              </div>
            )}
          </div>
        </div>
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

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Top Row - Search and Add Lead Button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search companies..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAddLeadForm(true)}
          className="ml-4 px-4 py-2 text-white rounded-lg font-semibold flex items-center focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md relative overflow-hidden"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-100 hover:opacity-90 transition-opacity duration-200 z-0"></span>
          <span className="relative z-10 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
            Add Company
          </span>
        </button>
      </div>

      {/* Status Filter Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mb-6 pt-4 w-full">
        {Object.keys(tabLabels).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`w-full py-2 rounded-xl text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-[1.02] ${
              activeTab === key
                ? statusColorMap[key]?.tab?.active || 'bg-blue-600 text-white'
                : statusColorMap[key]?.tab?.inactive || 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${
              activeTab === key ? "ring-2 ring-offset-2 ring-opacity-50" : ""
            } ${
              activeTab === key
                ? key === "hot"
                  ? "ring-red-500"
                  : key === "warm"
                  ? "ring-orange-400"
                  : key === "cold"
                  ? "ring-blue-500"
                  : key === "onboarded"
                  ? "ring-green-500"
                  : "ring-gray-500"
                : ""
            }`}
          >
            {tabLabels[key]}{" "}
            <span className="ml-1 text-xs font-bold">
              ({key === 'all' ? leads.length : leads.filter(l => l.status === key).length})
            </span>
          </button>
        ))}
      </div>

      {/* Companies Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Company</th>
              <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Contact</th>
              <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Location</th>
              <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Phone No</th>
              <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-4 text-center text-gray-500">
                  No companies found
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedLead(lead);
                    setShowLeadDetails(true);
                  }}
                >
                  <td className="py-3 px-4 border-b">{lead.companyName || 'N/A'}</td>
                  <td className="py-3 px-4 border-b">
                    {lead.pocName || 'N/A'} <br />
                    <span className="text-sm text-gray-500">{lead.pocMail || 'No email'}</span>
                  </td>
                  <td className="py-3 px-4 border-b">
                    {lead.pocLocation || 'N/A'}
                  </td>
                  <td className="py-3 px-4 border-b">
                    {lead.pocPhone || 'N/A'}
                  </td>
                  <td className="py-3 px-4 border-b relative">
                    <button
                      onClick={(e) => toggleActionMenu(lead.id, e)}
                      className={`p-1 rounded-full hover:bg-gray-200 focus:outline-none transition ${
                        showActionMenu === lead.id
                          ? "bg-gray-200 text-gray-900 shadow-inner"
                          : ""
                      }`}
                    >
                      <DotsVerticalIcon className="h-5 w-5 text-gray-500" />
                    </button>
                    
                    {showActionMenu === lead.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 ring-1 ring-black ring-opacity-5">
                        <div className="py-1">
                          {["hot", "warm", "cold", "onboarded"]
                            .filter(status => status !== lead.status)
                            .map((status) => (
                              <button
                                key={status}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(lead.id, status);
                                }}
                                className={`block w-full text-left px-4 py-2 text-sm ${
                                  statusColorMap[status]?.text || "text-gray-700"
                                } hover:bg-gray-100 transition`}
                              >
                                Mark as {status}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Lead Details Modal */}
      {showLeadDetails && (
        <LeadDetailsModal 
          lead={selectedLead} 
          onClose={() => setShowLeadDetails(false)} 
        />
      )}

      {/* Add Company Modal */}
      <AddLeads 
        show={showAddLeadForm} 
        onClose={() => setShowAddLeadForm(false)}
        onAddLead={handleAddLead}
      />
    </div>
  );
}

export default CompanyLeads;