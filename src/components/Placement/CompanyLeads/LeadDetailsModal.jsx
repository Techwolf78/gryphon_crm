import React, { useState } from "react";
import { XIcon, PlusIcon } from "@heroicons/react/outline";
import {
  getDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";

const LeadDetailsModal = ({
  lead,
  onClose,
  onAddContact,
  formatDate
}) => {
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    designation: '',
    linkedin: ''
  });

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
        alert("Contact name is required");
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
        console.error("Lead does not have groupId");
        return;
      }

      // Fetch the group document
      const groupDocRef = doc(db, "companyGroups", lead.groupId);
      const groupDocSnap = await getDoc(groupDocRef);

      if (groupDocSnap.exists()) {
        const groupData = groupDocSnap.data();
        const companies = groupData.companies || [];
        
        // Find the company index in the array
        const companyIndex = companies.findIndex((company, index) => 
          `${lead.groupId}_${index}` === lead.id
        );

        if (companyIndex >= 0) {
          // Update the company contacts
          const existingContacts = companies[companyIndex].contacts || [];
          companies[companyIndex] = {
            ...companies[companyIndex],
            contacts: [...existingContacts, contactData],
            updatedAt: new Date().toISOString(),
          };

          // Save back to Firestore
          await setDoc(groupDocRef, {
            ...groupData,
            companies,
          });

          onAddContact(lead.id, contactData);

          setNewContact({
            name: '',
            email: '',
            phone: '',
            location: '',
            designation: '',
            linkedin: ''
          });
          setShowAddContactForm(false);
        } else {
          console.error("Company not found in group");
        }
      } else {
        console.error("Group document not found");
      }

    } catch (error) {
      console.error("Error adding contact:", error);
    }
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-blue-600 mb-1">LinkedIn</label>
                  {lead.pocLinkedin ? (
                    <a
                      href={lead.pocLinkedin}
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
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1">LinkedIn</label>
                        {contact.linkedin ? (
                          <a
                            href={contact.linkedin}
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

export default LeadDetailsModal;