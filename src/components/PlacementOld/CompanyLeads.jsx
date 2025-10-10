import React, { useState, useEffect, useCallback } from "react";
import AddLeads from "./AddLeads";
import { collection, getDocs, query, orderBy, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase";
import { DotsVerticalIcon, XIcon, PlusIcon } from "@heroicons/react/outline";

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
  const [activeTab, setActiveTab] = useState('hot');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddLeadForm, setShowAddLeadForm] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    designation: ''
  });

  // Fetch all leads from Firestore
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "CompanyLeads"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const leadsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate().toISOString()
            : new Date().toISOString(),
          updatedAt: doc.data().updatedAt?.toDate
            ? doc.data().updatedAt.toDate().toISOString()
            : new Date().toISOString(),
          contacts: doc.data().contacts || []
        }));
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
  const filteredLeads = leads.filter(lead => {
    // First filter by status if not showing all
    if (activeTab !== 'all' && lead.status !== activeTab) {
      return false;
    }
    
    // Then filter by search term if present
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        (lead.companyName?.toLowerCase().includes(searchLower) || '' ||
        (lead.pocName?.toLowerCase().includes(searchLower) || '' ||
        (lead.pocLocation?.toLowerCase().includes(searchLower) || '') ||
        (lead.pocPhone?.toLowerCase().includes(searchLower) || '') ||
        (lead.contacts?.some(contact => 
          contact.name?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.phone?.toLowerCase().includes(searchLower)
        ))
        )));
    }
    return true;
  });

  // Group leads by status for tab counts
  const leadsByStatus = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});

  const handleAddLead = (newLead) => {
    setLeads(prevLeads => [{
      ...newLead,
      contacts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, ...prevLeads]);
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await updateDoc(doc(db, "CompanyLeads", leadId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      setLeads(leads.map(lead => 
        lead.id === leadId ? {...lead, status: newStatus, updatedAt: new Date().toISOString()} : lead
      ));
      setShowActionMenu(null);
    } catch (error) {
      console.error("Error updating lead status:", error);
    }
  };

  const handleAddContact = async (leadId) => {
    try {
      if (!newContact.name) {
        alert("Contact name is required");
        return;
      }

      const contactData = {
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone,
        location: newContact.location,
        designation: newContact.designation,
        addedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, "CompanyLeads", leadId), {
        contacts: arrayUnion(contactData),
        updatedAt: new Date().toISOString()
      });

      setLeads(leads.map(lead => 
        lead.id === leadId 
          ? { 
              ...lead, 
              contacts: [...lead.contacts, contactData],
              updatedAt: new Date().toISOString()
            } 
          : lead
      ));

      setNewContact({
        name: '',
        email: '',
        phone: '',
        location: '',
        designation: ''
      });
      setShowAddContactForm(false);

    } catch (error) {
      console.error("Error adding contact:", error);
    }
  };

  const toggleActionMenu = (leadId, e) => {
    e.stopPropagation();
    setShowActionMenu(showActionMenu === leadId ? null : leadId);
  };

  const formatDate = useCallback((dateString) => {
    try {
      return dateString ? new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : "-";
    } catch {
      return "-";
    }
  }, []);

  const LeadDetailsModal = ({ lead, onClose }) => {
    if (!lead) return null;

    const handleContactChange = (e) => {
      const { name, value } = e.target;
      setNewContact(prev => ({
        ...prev,
        [name]: value
      }));
    };

    return (
      <div className="fixed inset-0 bg-opacity-50 backdrop-blur flex items-center justify-center z-54 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-semibold">Company Details</h2>
              <p className="text-sm opacity-90 mt-1">{lead.companyName || "Unnamed Company"}</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-1 rounded-full hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close modal"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                  <p className="text-gray-900 font-medium">{lead.companyName || "-"}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Website</label>
                  {lead.companyWebsite ? (
                    <a 
                      href={lead.companyWebsite.startsWith('http') ? lead.companyWebsite : `https://${lead.companyWebsite}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {lead.companyWebsite}
                    </a>
                  ) : (
                    <p className="text-gray-900">-</p>
                  )}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Industry</label>
                  <p className="text-gray-900">{lead.industry || "-"}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Company Size</label>
                  <p className="text-gray-900">{lead.companySize || "-"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Contact Information</h3>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Primary Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-1">Name</label>
                    <p className="text-gray-900">{lead.pocName || "-"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-1">Designation</label>
                    <p className="text-gray-900">{lead.pocDesignation || "-"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-1">Email</label>
                    {lead.pocMail ? (
                      <a 
                        href={`mailto:${lead.pocMail}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {lead.pocMail}
                      </a>
                    ) : (
                      <p className="text-gray-900">-</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-1">Phone</label>
                    {lead.pocPhone ? (
                      <a 
                        href={`tel:${lead.pocPhone}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {lead.pocPhone}
                      </a>
                    ) : (
                      <p className="text-gray-900">-</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-blue-600 mb-1">Location</label>
                    <p className="text-gray-900">{lead.pocLocation || "-"}</p>
                  </div>
                </div>
              </div>

              {lead.contacts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">Additional Contacts ({lead.contacts.length})</h4>
                  {lead.contacts.map((contact, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                          <p className="text-gray-900">{contact.name || "-"}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Designation</label>
                          <p className="text-gray-900">{contact.designation || "-"}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                          {contact.email ? (
                            <a 
                              href={`mailto:${contact.email}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {contact.email}
                            </a>
                          ) : (
                            <p className="text-gray-900">-</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                          {contact.phone ? (
                            <a 
                              href={`tel:${contact.phone}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {contact.phone}
                            </a>
                          ) : (
                            <p className="text-gray-900">-</p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                          <p className="text-gray-900">{contact.location || "-"}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Added On</label>
                          <p className="text-gray-900">{formatDate(contact.addedAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showAddContactForm ? (
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowAddContactForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Contact
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-3">Add New Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Name*</label>
                      <input
                        type="text"
                        name="name"
                        value={newContact.name}
                        onChange={handleContactChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Contact name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Designation</label>
                      <input
                        type="text"
                        name="designation"
                        value={newContact.designation}
                        onChange={handleContactChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Designation"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={newContact.email}
                        onChange={handleContactChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Email address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={newContact.phone}
                        onChange={handleContactChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={newContact.location}
                        onChange={handleContactChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Location"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowAddContactForm(false);
                        setNewContact({
                          name: '',
                          email: '',
                          phone: '',
                          location: '',
                          designation: ''
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddContact(lead.id)}
                      className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center ${
                        newContact.name 
                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                      disabled={!newContact.name}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Contact
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                  <div className="flex items-center">
                    <span className={`inline-block h-2 w-2 rounded-full mr-2 ${
                      lead.status === 'hot' ? 'bg-red-500' : 
                      lead.status === 'warm' ? 'bg-orange-500' : 
                      lead.status === 'cold' ? 'bg-blue-500' : 
                      'bg-green-500'
                    }`}></span>
                    <span className="capitalize text-gray-900">{lead.status || "-"}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Source</label>
                  <p className="text-gray-900 capitalize">{lead.source || "-"}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Created At</label>
                  <p className="text-gray-900">{formatDate(lead.createdAt)}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Last Updated</label>
                  <p className="text-gray-900">{formatDate(lead.updatedAt)}</p>
                </div>
              </div>
            </div>

            {lead.notes && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Notes</h3>
                <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line text-gray-900">
                  {lead.notes}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 sticky bottom-0 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              Close
            </button>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div className="w-full md:max-w-xs">
          <input
            type="text"
            placeholder="Search companies or contacts..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAddLeadForm(true)}
          className="w-full md:w-auto px-4 py-2 text-white rounded-lg font-semibold flex items-center justify-center focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md relative overflow-hidden"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-100 hover:opacity-90 transition-opacity duration-200 z-0"></span>
          <span className="relative z-10 flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
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
              ({leadsByStatus[key] || 0})
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
                  {searchTerm ? "No matching companies found" : `No ${activeTab} companies found`}
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
                    setShowAddContactForm(false);
                  }}
                >
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{lead.companyName || 'N/A'}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {lead.contacts.length > 0 
                        ? `${lead.contacts.length} additional contact${lead.contacts.length > 1 ? 's' : ''}`
                        : 'No additional contacts'}
                    </div>
                  </td>
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
                      aria-label="Actions"
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
