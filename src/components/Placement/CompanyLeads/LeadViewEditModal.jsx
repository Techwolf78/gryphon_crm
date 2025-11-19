import React, { useState, useEffect } from "react";
import { XIcon, PencilIcon, EyeIcon, PlusIcon } from "@heroicons/react/outline";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";

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
  formatDate,
  allUsers = {}
}) => {
  const { user } = useAuth();
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

  // Edit form state - updated to match new data structure
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

  // Validation state
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  // Designation options for consistency
  const designationOptions = [
    "CEO/Founder", "CTO/Technical Head", "HR Manager", "Recruitment Manager",
    "Talent Acquisition Lead", "Business Development Manager", "Sales Manager",
    "Operations Manager", "Project Manager", "Team Lead", "Senior Developer",
    "Developer", "Intern", "Other"
  ];

  // Industry options for consistency
  const industryOptions = [
    "IT Services", "Software Development", "Consulting", "Manufacturing", 
    "Healthcare", "Education", "Finance", "Retail", "Real Estate", 
    "Construction", "Automotive", "Telecommunications", "Energy", 
    "Transportation", "Agriculture", "Media & Entertainment", "Other"
  ];

  // Populate edit form when lead changes
  useEffect(() => {
    if (lead) {
      setEditData({
        companyName: lead.companyName || '',
        industry: lead.industry || '',
        companySize: String(lead.companySize || ''),
        companyWebsite: lead.companyWebsite || '',
        pocName: lead.pocName || '',
        workingSince: lead.workingSince || '',
        pocLocation: lead.pocLocation || '',
        pocPhone: String(lead.pocPhone || ''),
        pocMail: lead.pocMail || '',
        pocDesignation: lead.pocDesignation || '',
        pocLinkedin: lead.pocLinkedin || '',
        status: lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : 'Warm'
      });
      setHasUnsavedChanges(false);
      setValidationErrors({});
      setTouchedFields({});
    }
  }, [lead]);

  // Function to get initials from display name
  const getInitials = (assignedTo, currentUserId) => {
    if (!assignedTo) return 'UN'; // Unassigned
    
    if (assignedTo === currentUserId) {
      // For current user, try to get initials from display name
      if (user?.displayName) {
        const names = user.displayName.trim().split(' ');
        if (names.length >= 2) {
          return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        } else if (names.length === 1) {
          return names[0].substring(0, 2).toUpperCase();
        }
      }
      return 'ME'; // Fallback to ME if no display name
    }
    
    // For other users, try to get initials from allUsers data
    const assignedUser = Object.values(allUsers).find(u => u.uid === assignedTo || u.id === assignedTo);
    if (assignedUser?.displayName || assignedUser?.name) {
      const displayName = assignedUser.displayName || assignedUser.name;
      const names = displayName.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      } else if (names.length === 1) {
        return names[0].substring(0, 2).toUpperCase();
      }
    }
    
    // Fallback to "OT" if user data not found
    return 'OT';
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Allow international formats with + and numbers, spaces, hyphens, parentheses
    const phoneRegex = /^[+]?[1-9][\d\s\-()]{8,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateLinkedIn = (url) => {
    if (!url) return true; // Optional field
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
    return linkedinRegex.test(url);
  };

  const validateWebsite = (url) => {
    if (!url) return true; // Optional field
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateCompanySize = (size) => {
    const num = parseInt(size);
    return num > 0 && num <= 100000; // Reasonable range: 1-100k employees
  };

  // Real-time field validation
  const validateField = (fieldName, value) => {
    let error = "";
    
    switch (fieldName) {
      case "companyName":
        if (!value.trim()) error = "Company name is required";
        break;
      case "industry":
        if (!value.trim()) {
          error = "Industry is required";
        }
        break;
      case "companySize":
        if (value.trim() && !validateCompanySize(value)) {
          error = "Company size must be between 1-100,000";
        }
        break;
      case "companyWebsite":
        if (value && !validateWebsite(value)) {
          error = "Please enter a valid website URL";
        }
        break;
      case "pocName":
        if (!value.trim()) error = "POC name is required";
        break;
      case "workingSince":
        // Optional field - no validation required
        break;
      case "pocLocation":
        if (!value.trim()) error = "POC location is required";
        break;
      case "pocPhone":
        if (!value.trim()) {
          error = "POC phone is required";
        } else if (!validatePhone(value)) {
          error = "Please enter a valid phone number";
        }
        break;
      case "pocMail":
        if (value && !validateEmail(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "pocDesignation":
        // Optional field - no validation required
        break;
      case "pocLinkedin":
        if (value && !validateLinkedIn(value)) {
          error = "Please enter a valid LinkedIn URL";
        }
        break;
    }
    
    setValidationErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  // Update field with validation
  const updateEditField = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
    
    // Mark field as touched
    if (field) {
      setTouchedFields(prev => ({ ...prev, [field]: true }));
    }
    
    // Real-time validation
    if (field) {
      validateField(field, value);
    }
  };

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
        toast.error('Contact name is required', {
          position: "bottom-left",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: false,
          theme: "light",
          className: "text-sm font-medium",
          bodyClassName: "text-sm"
        });
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
          const result = await onAddContact(lead.id, contactData);
          if (result && result.success) {
            toast.success('Contact added successfully!', {
              position: "bottom-left",
              autoClose: 3000,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: false,
              theme: "light",
              className: "text-sm font-medium",
              bodyClassName: "text-sm"
            });
          } else {
            toast.error(`Failed to add contact: ${result?.error || 'Unknown error'}`, {
              position: "bottom-left",
              autoClose: 3000,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: false,
              theme: "light",
              className: "text-sm font-medium",
              bodyClassName: "text-sm"
            });
            return;
          }
        }
      } else {
        // Handle group-based contacts if needed
        toast.error('Group-based contact addition not implemented yet', {
          position: "bottom-left",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: false,
          theme: "light",
          className: "text-sm font-medium",
          bodyClassName: "text-sm"
        });
        return;
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
      toast.error('Failed to add contact. Please try again.', {
        position: "bottom-left",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        theme: "light",
        className: "text-sm font-medium",
        bodyClassName: "text-sm"
      });
    }
  };

  const handleSaveChanges = async () => {
    // Validate all required fields
    const requiredFields = ['companyName', 'industry', 'pocName', 'pocLocation', 'pocPhone'];
    let hasErrors = false;

    requiredFields.forEach(field => {
      validateField(field, editData[field]);
      if (!editData[field] || editData[field].toString().trim() === '') {
        hasErrors = true;
      }
    });

    // Check if there are any validation errors
    const hasValidationErrors = Object.values(validationErrors).some(error => error !== '');

    if (hasErrors || hasValidationErrors) {
      toast.error('Please fill all required fields and correct validation errors', {
        position: "bottom-left",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        theme: "light",
        className: "text-sm font-medium",
        bodyClassName: "text-sm"
      });
      return;
    }

    // Map edit form fields to the data structure expected by Firestore
    const updatedData = {
      name: editData.companyName, // Map companyName to name
      industry: editData.industry,
      companySize: editData.companySize ? parseInt(editData.companySize) : 0,
      companyUrl: editData.companyWebsite, // Map companyWebsite to companyUrl
      contactPerson: editData.pocName, // Map pocName to contactPerson
      workingSince: editData.workingSince,
      location: editData.pocLocation, // Map pocLocation to location
      phone: editData.pocPhone, // Map pocPhone to phone
      email: editData.pocMail, // Map pocMail to email
      designation: editData.pocDesignation, // Map pocDesignation to designation
      linkedinUrl: editData.pocLinkedin, // Map pocLinkedin to linkedinUrl
      status: editData.status.toLowerCase(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (onUpdateLead) {
        const result = await onUpdateLead(lead.id, updatedData);
        if (result && result.success) {
          setHasUnsavedChanges(false);
          setMode('view');
          // Show success message
          toast.success('Company details updated successfully!', {
            position: "bottom-left",
            autoClose: 3000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: false,
            theme: "light",
            className: "text-sm font-medium",
            bodyClassName: "text-sm"
          });
        } else {
          toast.error(`Failed to update company: ${result?.error || 'Unknown error'}`, {
            position: "bottom-left",
            autoClose: 3000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: false,
            theme: "light",
            className: "text-sm font-medium",
            bodyClassName: "text-sm"
          });
        }
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to update company. Please try again.', {
        position: "bottom-left",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        theme: "light",
        className: "text-sm font-medium",
        bodyClassName: "text-sm"
      });
    }
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
        companyName: lead.companyName || '',
        industry: lead.industry || '',
        companySize: String(lead.companySize || ''),
        companyWebsite: lead.companyWebsite || '',
        pocName: lead.pocName || '',
        workingSince: lead.workingSince || '',
        pocLocation: lead.pocLocation || '',
        pocPhone: String(lead.pocPhone || ''),
        pocMail: lead.pocMail || '',
        pocDesignation: lead.pocDesignation || '',
        pocLinkedin: lead.pocLinkedin || '',
        status: lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : 'Warm'
      });
      setHasUnsavedChanges(false);
    }
    setMode(mode === 'view' ? 'edit' : 'view');
  };

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur flex items-center justify-center z-54 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div>
              <h2 className="text-lg font-semibold">
                {mode === 'view' ? 'Company Details' : 'Edit Company'}
              </h2>
              <p className="text-xs opacity-90 mt-0">
                {mode === 'view' ? (lead.companyName || "Unnamed Company") : 'Make changes below'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMode}
              className="p-1.5 rounded-full hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-white flex items-center"
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

        <div className="p-3 space-y-3">
          {mode === 'view' ? (
            // VIEW MODE - Display lead details
            <>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-gray-800 border-b pb-1">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Company Name</label>
                    <p className="text-gray-900 font-medium text-sm">{lead.companyName || "-"}</p>
                  </div>

                  <div className="bg-gray-50 p-2 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Website</label>
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

                  <div className="bg-gray-50 p-2 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Industry</label>
                    <p className="text-gray-900 text-sm">{lead.industry || "-"}</p>
                  </div>

                  <div className="bg-gray-50 p-2 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Company Size</label>
                    <p className="text-gray-900 text-sm">{lead.companySize || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-gray-800 border-b pb-1">Contact Information</h3>

                <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-1 text-sm">Primary Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-blue-600 mb-0.5">Name</label>
                      <p className="text-gray-900 text-sm">{lead.pocName || "-"}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-600 mb-0.5">Designation</label>
                      <p className="text-gray-900 text-sm">{lead.pocDesignation || "-"}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-600 mb-0.5">Email</label>
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
                      <label className="block text-xs font-medium text-blue-600 mb-0.5">Phone</label>
                      {lead.pocPhone ? (
                        <a
                          href={`tel:${lead.pocPhone}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        >
                          {lead.pocPhone}
                        </a>
                      ) : (
                        <p className="text-gray-900 text-sm">-</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-blue-600 mb-0.5">Location</label>
                      <p className="text-gray-900 text-sm">{lead.pocLocation || "-"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-blue-600 mb-0.5">LinkedIn</label>
                      {lead.pocLinkedin ? (
                        <a
                          href={lead.pocLinkedin.startsWith('http') ? lead.pocLinkedin : `https://${lead.pocLinkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        >
                          {lead.pocLinkedin}
                        </a>
                      ) : (
                        <p className="text-gray-900 text-sm">-</p>
                      )}
                    </div>
                  </div>
                </div>

                {lead.contacts && lead.contacts.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="font-medium text-gray-700 text-sm">Additional Contacts ({lead.contacts.length})</h4>
                    {lead.contacts.map((contact, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-3">Add New Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-gray-800 border-b pb-1">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Status</label>
                    <div className="flex items-center">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${
                        lead.status === 'hot' ? 'bg-red-500' :
                        lead.status === 'warm' ? 'bg-orange-500' :
                        lead.status === 'cold' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}></span>
                      <span className="capitalize text-gray-900 text-sm">{lead.status || "-"}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-2 rounded-lg">
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Source</label>
                    <p className="text-gray-900 capitalize text-sm">{lead.source || "-"}</p>
                  </div>

                  <div className="bg-gray-50 p-2 rounded-lg">
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Created At</label>
                    <p className="text-gray-900 text-sm">{formatDate(lead.createdAt)}</p>
                  </div>

                  <div className="bg-gray-50 p-2 rounded-lg">
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Last Updated</label>
                    <p className="text-gray-900 text-sm">{formatDate(lead.updatedAt)}</p>
                  </div>

                  <div className="bg-gray-50 p-2 rounded-lg">
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Assigned To</label>
                    <div className="flex items-center space-x-1.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        {getInitials(lead.assignedTo, user?.uid)}
                      </span>
                      <span className="text-gray-900 text-sm">
                        {lead.assignedTo === user?.uid ? 'You' : 
                         (() => {
                           const assignedUser = Object.values(allUsers).find(u => u.uid === lead.assignedTo || u.id === lead.assignedTo);
                           return assignedUser ? (assignedUser.displayName || assignedUser.name || 'Unknown User') : 'Unassigned';
                         })()}
                      </span>
                    </div>
                  </div>

                  {lead.assignedAt && (
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Assigned At</label>
                      <p className="text-gray-900 text-sm">{formatDate(lead.assignedAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {lead.notes && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-gray-800 border-b pb-1">Notes</h3>
                  <div className="bg-gray-50 p-2 rounded-lg whitespace-pre-line text-gray-900 text-sm">
                    {lead.notes}
                  </div>
                </div>
              )}
            </>
          ) : (
            // EDIT MODE - Editable form fields
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editData.companyName}
                    onChange={(e) => updateEditField('companyName', e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.companyName && touchedFields.companyName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {validationErrors.companyName && touchedFields.companyName && (
                    <span className="text-red-500 text-xs mt-1">{validationErrors.companyName}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editData.industry}
                    onChange={(e) => updateEditField('industry', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.industry && touchedFields.industry ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select Industry</option>
                    {industryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {validationErrors.industry && touchedFields.industry && (
                    <span className="text-red-500 text-xs mt-1">{validationErrors.industry}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    Company Size
                  </label>
                  <input
                    type="number"
                    value={editData.companySize}
                    onChange={(e) => updateEditField('companySize', e.target.value)}
                    placeholder="e.g. 250"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.companySize && touchedFields.companySize ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.companySize && touchedFields.companySize && (
                    <span className="text-red-500 text-xs mt-1">{validationErrors.companySize}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    Company Website
                  </label>
                  <input
                    type="url"
                    value={editData.companyWebsite}
                    onChange={(e) => updateEditField('companyWebsite', e.target.value)}
                    placeholder="e.g. https://company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    POC Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editData.pocName}
                    onChange={(e) => updateEditField('pocName', e.target.value)}
                    placeholder="e.g. John Doe"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.pocName && touchedFields.pocName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {validationErrors.pocName && touchedFields.pocName && (
                    <span className="text-red-500 text-xs mt-1">{validationErrors.pocName}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    Working Since
                  </label>
                  <input
                    type="date"
                    value={editData.workingSince}
                    onChange={(e) => updateEditField('workingSince', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.workingSince && touchedFields.workingSince ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.workingSince && touchedFields.workingSince && (
                    <span className="text-red-500 text-xs mt-1">{validationErrors.workingSince}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    POC Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editData.pocLocation}
                    onChange={(e) => updateEditField('pocLocation', e.target.value)}
                    placeholder="e.g. Mumbai"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.pocLocation && touchedFields.pocLocation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {validationErrors.pocLocation && touchedFields.pocLocation && (
                    <span className="text-red-500 text-xs mt-1">{validationErrors.pocLocation}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    POC Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editData.pocPhone}
                    onChange={(e) => updateEditField('pocPhone', e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.pocPhone && touchedFields.pocPhone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {validationErrors.pocPhone && touchedFields.pocPhone && (
                    <span className="text-red-500 text-xs mt-1">{validationErrors.pocPhone}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    POC Mail
                  </label>
                  <input
                    type="email"
                    value={editData.pocMail}
                    onChange={(e) => updateEditField('pocMail', e.target.value)}
                    placeholder="e.g. john@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    POC Designation
                  </label>
                  <select
                    value={editData.pocDesignation}
                    onChange={(e) => updateEditField('pocDesignation', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.pocDesignation && touchedFields.pocDesignation ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Designation</option>
                    {designationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {validationErrors.pocDesignation && touchedFields.pocDesignation && (
                    <span className="text-red-500 text-xs mt-1">{validationErrors.pocDesignation}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    POC LinkedIn
                  </label>
                  <input
                    type="url"
                    value={editData.pocLinkedin}
                    onChange={(e) => updateEditField('pocLinkedin', e.target.value)}
                    placeholder="e.g. https://linkedin.com/in/johndoe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">
                    Status
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => updateEditField('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

        <div className="bg-gray-50 px-4 py-2 sticky bottom-0 flex justify-end space-x-3">
          {mode === 'edit' && (
            <>
              <button
                onClick={() => {
                  setMode('view');
                  setHasUnsavedChanges(false);
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 backdrop-blur-sm border border-red-200/50 bg-red-100/80 hover:bg-red-200/90 shadow-lg hover:shadow-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={!editData.companyName.trim() || !editData.pocName.trim() || !hasUnsavedChanges}
                title={!hasUnsavedChanges ? "No new changes to save" : ""}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium text-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 backdrop-blur-sm border border-green-200/50 ${
                  editData.companyName.trim() && editData.pocName.trim() && hasUnsavedChanges
                    ? "bg-green-100/80 hover:bg-green-200/90 shadow-lg hover:shadow-xl"
                    : "bg-gray-100/50 cursor-not-allowed text-gray-400"
                }`}
              >
                Save Changes
              </button>
            </>
          )}
          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-gray-100/80 hover:bg-gray-200/90 border border-gray-200/50 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadViewEditModal;