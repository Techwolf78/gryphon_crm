import React, { useState, useEffect } from "react";
import { XIcon, PencilIcon, EyeIcon, PlusIcon } from "@heroicons/react/outline";

const statusOptions = [
  "Hot",
  "Warm",
  "Cold",
  "Onboarded",
];

const LeadViewEditModal = ({
  lead,
  onClose,
  onAddContact,
  onUpdateLead,
  formatDate
}) => {
  const [mode, setMode] = useState('view'); // 'view' or 'edit'
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    designation: '',
    linkedin: ''
  });

  // Edit form state
  const [editData, setEditData] = useState({
    companyName: '',
    industry: '',
    companySize: '',
    companyWebsite: '',
    pocName: '',
    workingSince: '',
    pocLocation: '',
    pocPhone: '',
    pocMail: '',
    pocDesignation: '',
    pocLinkedin: '',
    status: 'Warm'
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (lead) {
      setEditData({
        companyName: lead.companyName || lead.name || '',
        industry: lead.industry || lead.sector || '',
        companySize: String(lead.companySize || lead.employeeCount || ''),
        companyWebsite: lead.companyWebsite || lead.companyUrl || '',
        pocName: lead.pocName || lead.contactPerson || '',
        workingSince: lead.workingSince || '',
        pocLocation: lead.pocLocation || lead.location || '',
        pocPhone: String(lead.pocPhone || lead.phone || ''),
        pocMail: lead.pocMail || lead.email || '',
        pocDesignation: lead.pocDesignation || lead.designation || '',
        pocLinkedin: lead.pocLinkedin || lead.linkedinUrl || '',
        status: lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : 'Warm'
      });
      setHasUnsavedChanges(false);
    }
  }, [lead]);

  if (!lead) return null;

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setNewContact(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddContactInternal = async () => {
    try {
      if (!newContact.name) {
        alert('Contact name is required');
        return;
      }

      const contactData = {
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone,
        location: newContact.location,
        designation: newContact.designation,
        linkedin: newContact.linkedin,
        addedAt: new Date().toISOString()
      };

      if (!lead.groupId) {
        // For leads without groupId, add to the lead's contacts array
        if (onAddContact) {
          onAddContact(lead.id, contactData);
        }
      } else {
        // Handle group-based contacts if needed
        alert('Group-based contact addition not implemented yet');
      }

      setNewContact({
        name: '',
        email: '',
        phone: '',
        location: '',
        designation: '',
        linkedin: ''
      });
      setShowAddContactForm(false);
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Failed to add contact. Please try again.');
    }
  };

  const updateEditField = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
    if (!editData.companyName.trim() || !editData.pocName.trim()) {
      alert('Company Name and POC Name are required');
      return;
    }

    const updatedData = {
      companyName: editData.companyName,
      industry: editData.industry,
      companySize: editData.companySize ? parseInt(editData.companySize) : 0,
      companyWebsite: editData.companyWebsite,
      pocName: editData.pocName,
      workingSince: editData.workingSince,
      pocLocation: editData.pocLocation,
      pocPhone: editData.pocPhone,
      pocMail: editData.pocMail,
      pocDesignation: editData.pocDesignation,
      pocLinkedin: editData.pocLinkedin,
      status: editData.status.toLowerCase(),
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateLead) {
      onUpdateLead(lead.id, updatedData);
    }

    setHasUnsavedChanges(false);
    setMode('view');
  };

  const handleClose = () => {
    if (mode === 'edit' && hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to close?")) {
        return;
      }
    }
    onClose();
  };

  const toggleMode = () => {
    if (mode === 'edit' && hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Switch to view mode without saving?")) {
        return;
      }
      // Reset changes
      setEditData({
        companyName: lead.companyName || lead.name || '',
        industry: lead.industry || lead.sector || '',
        companySize: String(lead.companySize || lead.employeeCount || ''),
        companyWebsite: lead.companyWebsite || lead.companyUrl || '',
        pocName: lead.pocName || lead.contactPerson || '',
        workingSince: lead.workingSince || '',
        pocLocation: lead.pocLocation || lead.location || '',
        pocPhone: String(lead.pocPhone || lead.phone || ''),
        pocMail: lead.pocMail || lead.email || '',
        pocDesignation: lead.pocDesignation || lead.designation || '',
        pocLinkedin: lead.pocLinkedin || lead.linkedinUrl || '',
        status: lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : 'Warm'
      });
      setHasUnsavedChanges(false);
    }
    setMode(mode === 'view' ? 'edit' : 'view');
  };

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur flex items-center justify-center z-54 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div>
              <h2 className="text-xl font-semibold">
                {mode === 'view' ? 'Company Details' : 'Edit Company'}
              </h2>
              <p className="text-sm opacity-90 mt-1">
                {mode === 'view' ? (lead.companyName || "Unnamed Company") : 'Make changes below'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMode}
              className="p-2 rounded-full hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-white flex items-center"
              title={mode === 'view' ? 'Switch to Edit Mode' : 'Switch to View Mode'}
            >
              {mode === 'view' ? (
                <PencilIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close modal"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {mode === 'view' ? (
            // VIEW MODE - Display lead details
            <>
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
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-blue-600 mb-1">LinkedIn</label>
                      {lead.pocLinkedin ? (
                        <a
                          href={lead.pocLinkedin.startsWith('http') ? lead.pocLinkedin : `https://${lead.pocLinkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {lead.pocLinkedin}
                        </a>
                      ) : (
                        <p className="text-gray-900">-</p>
                      )}
                    </div>
                  </div>
                </div>

                {lead.contacts && lead.contacts.length > 0 && (
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
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-600 mb-1">LinkedIn</label>
                            {contact.linkedin ? (
                              <a
                                href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {contact.linkedin}
                              </a>
                            ) : (
                              <p className="text-gray-900">-</p>
                            )}
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
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1">LinkedIn</label>
                        <input
                          type="url"
                          name="linkedin"
                          value={newContact.linkedin}
                          onChange={handleContactChange}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="LinkedIn profile URL"
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
                            designation: '',
                            linkedin: ''
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddContactInternal}
                        disabled={!newContact.name}
                        className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center ${
                          newContact.name
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
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
            </>
          ) : (
            // EDIT MODE - Editable form fields
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editData.companyName}
                    onChange={(e) => updateEditField('companyName', e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={editData.industry}
                    onChange={(e) => updateEditField('industry', e.target.value)}
                    placeholder="e.g. IT Services"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Size
                  </label>
                  <input
                    type="number"
                    value={editData.companySize}
                    onChange={(e) => updateEditField('companySize', e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Website
                  </label>
                  <input
                    type="url"
                    value={editData.companyWebsite}
                    onChange={(e) => updateEditField('companyWebsite', e.target.value)}
                    placeholder="e.g. https://company.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    POC Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editData.pocName}
                    onChange={(e) => updateEditField('pocName', e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Working Since
                  </label>
                  <input
                    type="date"
                    value={editData.workingSince}
                    onChange={(e) => updateEditField('workingSince', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    POC Location
                  </label>
                  <input
                    type="text"
                    value={editData.pocLocation}
                    onChange={(e) => updateEditField('pocLocation', e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    POC Phone
                  </label>
                  <input
                    type="text"
                    value={editData.pocPhone}
                    onChange={(e) => updateEditField('pocPhone', e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    POC Mail
                  </label>
                  <input
                    type="email"
                    value={editData.pocMail}
                    onChange={(e) => updateEditField('pocMail', e.target.value)}
                    placeholder="e.g. john@company.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    POC Designation
                  </label>
                  <input
                    type="text"
                    value={editData.pocDesignation}
                    onChange={(e) => updateEditField('pocDesignation', e.target.value)}
                    placeholder="e.g. HR Manager"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    POC LinkedIn
                  </label>
                  <input
                    type="url"
                    value={editData.pocLinkedin}
                    onChange={(e) => updateEditField('pocLinkedin', e.target.value)}
                    placeholder="e.g. https://linkedin.com/in/johndoe"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => updateEditField('status', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 sticky bottom-0 flex justify-end space-x-3">
          {mode === 'edit' && (
            <button
              onClick={handleSaveChanges}
              disabled={!editData.companyName.trim() || !editData.pocName.trim()}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                editData.companyName.trim() && editData.pocName.trim()
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Save Changes
            </button>
          )}
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadViewEditModal;