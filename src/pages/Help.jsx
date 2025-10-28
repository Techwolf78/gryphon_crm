// ONLY the updated parts are modified. Remaining code is untouched.
import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  FiHelpCircle,
  FiMail,
  FiPhone,
  FiClock,
  FiUser,
  FiSettings,
  FiBook,
  FiX,
  FiExternalLink,
  FiCheckCircle,
  FiPlus,
  FiAlertCircle,
  FiCheck,
  FiArchive,
  FiGrid,
} from "react-icons/fi";
import { AuthContext } from "../context/AuthContext";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import emailjs from "@emailjs/browser";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
 
emailjs.init("CXYkFqg_8EWTsrN8M");
 
const Help = () => {
  const { user } = useContext(AuthContext);
  const [showPopup, setShowPopup] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showRaisedTickets, setShowRaisedTickets] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [remark, setRemark] = useState("");
 
 
 
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    priority: "medium",
  });
 
  const isAdmin = user?.department === "Admin";
 
  const handleKnowledgeItemClick = (title) => {
    setPopupTitle(title);
    setShowPopup(true);
  };
 
  const handleTicketFormChange = (e) => {
    const { name, value } = e.target;
    setTicketForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };
 
  const validateForm = () => {
    const errors = {};
    if (!ticketForm.title.trim()) errors.title = "Title is required";
    if (ticketForm.title.length > 100)
      errors.title = "Title too long (max 100 chars)";
    if (!ticketForm.description.trim())
      errors.description = "Description is required";
    if (ticketForm.description.length > 2000)
      errors.description = "Description too long";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
 
  const submitTicket = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
 
    setIsSubmitting(true);
    try {
      // Add ticket to Firestore
      const docRef = await addDoc(collection(db, "tickets"), {
        ...ticketForm,
        createdBy: user.email,
        createdByName: user.name || user.email,
        status: "not-resolved",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
 
      // Send email using EmailJS
      try {
        await emailjs.send(
          "service_0khg6af",
          "support_ticket_template",
          {
            from_name: user.name || user.email,
            from_email: user.email, // sender's email
            ticket_title: ticketForm.title,
            ticket_description: ticketForm.description,
            ticket_priority: ticketForm.priority,
            ticket_id: docRef.id,
            ticket_status: "not-resolved",
            date: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            year: new Date().getFullYear(),
            // reply_to should match your EmailJS template settings
            reply_to: user.email,
          },
          {
            publicKey: "CXYkFqg_8EWTsrN8M",
          }
        );
        toast.success(
          "Ticket submitted successfully! Our team will contact you soon."
        );
      } catch (emailError) {
 
        let errorMessage = "Ticket submitted but email notification failed";
 
        if (emailError.status === 422) {
          errorMessage =
            "Email configuration error - recipient address may be invalid";
        } else if (emailError.status === 400) {
          errorMessage = "Invalid email parameters";
        }
 
        toast.warning(errorMessage);
      }
 
      // Reset form
      setTicketForm({
        title: "",
        description: "",
        priority: "medium",
      });
      setShowTicketForm(false);
      fetchTickets();
    } catch (error) {
 
      toast.error("Failed to submit ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
 
  const fetchTickets = useCallback(async () => {
    try {
      let q;
      if (isAdmin) {
        q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
      } else {
        q = query(
          collection(db, "tickets"),
          where("createdBy", "==", user.email),
          orderBy("createdAt", "desc")
        );
      }
 
      const querySnapshot = await getDocs(q);
 
      // This is a valid empty state - no need to show error
      if (querySnapshot.empty) {
        setTickets([]);
        return;
      }
 
      const ticketsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to JS Date
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      setTickets(ticketsData);
    } catch (error) {
 
      // Only show toast for actual errors, not empty collections
      if (error.code !== "permission-denied") {
        // You might want to handle permission errors differently
        toast.error("Failed to load tickets");
      }
    }
  }, [isAdmin, user?.email]);
 
  const updateTicketStatus = async (ticketId, status) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, {
        status,
        updatedAt: serverTimestamp(),
        resolvedBy: isAdmin ? user.email : null,
        remark: isAdmin ? remark : "",
      });
 
 
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId
            ? {
              ...ticket,
              status,
              updatedAt: new Date(),
              remark,
            }
            : ticket
        )
      );
 
      toast.success(`Ticket marked as ${status.replace("-", " ")}`);
      setActiveTicket(null);
      setRemark("");
    } catch (error) {
 
      toast.error("Failed to update ticket status");
    }
  };
  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user, fetchTickets]);
 
  const knowledgeBaseItems = [
    {
      icon: <FiSettings className="w-5 h-5" />,
      title: "System Settings",
      desc: "Configure application preferences and integrations",
      category: "Configuration",
    },
    {
      icon: <FiHelpCircle className="w-5 h-5" />,
      title: "Troubleshooting",
      desc: "Solve common issues and error messages",
      category: "Support",
    },
    {
      icon: <FiUser className="w-5 h-5" />,
      title: "User Management",
      desc: "Add, remove, and manage team members",
      category: "Administration",
    },
    {
      icon: <FiBook className="w-5 h-5" />,
      title: "Getting Started",
      desc: "New user onboarding guide",
      category: "Guides",
    },
  ];
 
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Under Development Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-54 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl p-6 max-w-md w-full relative overflow-hidden border border-gray-100 shadow-2xl animate-scaleIn">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close popup"
            >
              <FiX className="w-5 h-5" />
            </button>
 
            <div className="text-center pt-2">
              <div className="w-16 h-16 mx-auto mb-4 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-spin-slow [animation-duration:3s]"></div>
                <div className="relative bg-blue-500 rounded-full p-3 text-white">
                  <FiSettings className="w-6 h-6" />
                </div>
              </div>
 
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {popupTitle}
              </h3>
              <p className="text-gray-600 mb-4">
                This feature is currently under active development.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Our engineering team is working hard to deliver this
                functionality. We'll notify you as soon as it's available.
              </p>
 
              <button
                onClick={() => setShowPopup(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Ticket Form Popup */}
      {showTicketForm && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-54 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl p-6 max-w-md w-full relative overflow-hidden border border-gray-100 shadow-2xl animate-scaleIn">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <button
              onClick={() => setShowTicketForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close popup"
            >
              <FiX className="w-5 h-5" />
            </button>
 
            <div className="pt-2">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Raise a New Ticket
              </h3>
 
              <form onSubmit={submitTicket}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={ticketForm.email || user?.email || ""}
                    onChange={handleTicketFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!!user?.email}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={ticketForm.title}
                    onChange={handleTicketFormChange}
                    className={`w-full px-3 py-2 border ${formErrors.title ? "border-red-500" : "border-gray-300"
                      } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                  {formErrors.title && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.title}
                    </p>
                  )}
                </div>
 
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={ticketForm.description}
                    onChange={handleTicketFormChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  ></textarea>
                </div>
 
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={ticketForm.priority}
                    onChange={handleTicketFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
 
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full px-5 py-2.5 ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    } text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Ticket'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
 
      {/* Ticket Details Popup */}
      {activeTicket && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full relative overflow-hidden border border-gray-100 shadow-2xl animate-scaleIn">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <button
              onClick={() => setActiveTicket(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close popup"
            >
              <FiX className="w-5 h-5" />
            </button>
 
            <div className="pt-2">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  {activeTicket.title}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${activeTicket.priority === "critical"
                    ? "bg-red-100 text-red-800"
                    : activeTicket.priority === "high"
                      ? "bg-orange-100 text-orange-800"
                      : activeTicket.priority === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                >
                  {activeTicket.priority}
                </span>
              </div>
 
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <span>Created by: {activeTicket.createdBy}</span>
                <span className="mx-2">•</span>
                <span>
                  Status:
                  <span
                    className={`ml-1 ${activeTicket.status === "resolved"
                      ? "text-green-600"
                      : activeTicket.status === "can't-resolve"
                        ? "text-gray-600"
                        : "text-red-600"
                      }`}
                  >
                    {activeTicket.status.replace("-", " ")}
                  </span>
                </span>
              </div>
 
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Description:
                </h4>
                <p className="text-gray-700 whitespace-pre-line">
                  {activeTicket.description}
                </p>
                {activeTicket.status === "not-resolved" && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Remark
                    </label>
                    <textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a remark here..."
                    ></textarea>
                  </div>
                )}
 
              </div>
              {isAdmin && activeTicket.status === "not-resolved" && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => updateTicketStatus(activeTicket.id, "resolved")}
                    className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <FiCheck className="mr-2" /> Mark as Resolved
                  </button>
                  <button
                    onClick={() => updateTicketStatus(activeTicket.id, "can't-resolve")}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <FiArchive className="mr-2" /> Can't Resolve
                  </button>
                  <button
                    onClick={() => updateTicketStatus(activeTicket.id, "not-resolved")}
                    className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <FiAlertCircle className="mr-2" /> Not Resolved
                  </button>
                </div>
              )}
 
            </div>
          </div>
        </div>
      )}
 
      <div className="">
        {/* Header aligned left */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-start bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-5 mb-4 shadow-sm border border-white">
            <FiHelpCircle className="text-blue-600 w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            How can we help?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Find answers, guides, and resources to help you get the most out of
            our platform.
          </p>
        </div>
 
        {/* Modified Tabs Section */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setShowRaisedTickets(false)}
            className={`px-4 py-2 font-medium ${!showRaisedTickets
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Help Center
          </button>
          <button
            onClick={() => setShowRaisedTickets(true)}
            className={`px-4 py-2 font-medium ${showRaisedTickets
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {isAdmin ? "All Tickets" : "My Tickets"}
          </button>
        </div>
 
 
{showRaisedTickets ? (
  <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {isAdmin ? "All Support Tickets" : "My Support Tickets"}
        </h2>
        <button
          onClick={() => setShowTicketForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="mr-2" /> New Ticket
        </button>
      </div>
 
      {tickets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {isAdmin
              ? "No tickets found"
              : "You haven't created any tickets yet"}
          </p>
          {!isAdmin && (
            <button
              onClick={() => setShowTicketForm(true)}
              className="mt-4 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <FiPlus className="mr-2" /> Create Your First Ticket
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Title
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Created By
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px] max-w-[300px]">
                  Remark
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-[200px] truncate">
                    {ticket.title}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.createdBy}
                    </td>
                  )}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${ticket.priority === "critical"
                        ? "bg-red-100 text-red-800"
                        : ticket.priority === "high"
                          ? "bg-orange-100 text-orange-800"
                          : ticket.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${ticket.status === "resolved"
                          ? "bg-green-100 text-green-800"
                          : ticket.status === "can't-resolve"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-red-100 text-red-800"
                          }`}
                      >
                        {ticket.status.replace("-", " ")}{" "}
                        {ticket.status !== "not-resolved" && ticket.resolvedBy
                          ? `(by ${ticket.resolvedBy.split("@")[0]})`
                          : ""}
                      </span>
                    </div>
                  </td>
 
                  <td className="px-4 py-4 text-sm text-gray-500 max-w-[300px]">
                    <div className="break-words">
                      {ticket.remark
                        ? ticket.remark
                        : ticket.status === "resolved"
                          ? `Resolved by ${ticket.resolvedBy?.split("@")[0] || "admin"}`
                          : ticket.status === "can't-resolve"
                            ? "Couldn't resolve"
                            : "Pending resolution"}
                    </div>
                  </td>
 
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => setActiveTicket(ticket)}
                      className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
) : (
  // ... remaining code remains the same ...
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Contact Support */}
            <div className="space-y-6">
              {/* Contact Card */}
              <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden transition-all hover:shadow-sm">
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-xl mr-4 shadow-inner border border-white">
                      <FiMail className="text-blue-600 w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Contact Support
                    </h2>
                  </div>
 
                  <div className="space-y-5">
                    {/* Email */}
                    <div className="flex items-start">
                      <div className="p-2.5 bg-blue-50 rounded-xl mr-3 shadow-inner border border-white/50">
                        <FiMail className="text-blue-600 w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Email
                        </h3>
                        <a
                          href="mailto:connect@gryphonacademy.co.in"
                          className="text-blue-600 hover:text-blue-800 transition-colors font-medium inline-flex items-center"
                        >
                          connect@gryphonacademy.co.in{" "}
                          <FiExternalLink className="ml-1 w-4 h-4" />
                        </a>
                      </div>
                    </div>
 
                    {/* Phone */}
                    <div className="flex items-start">
                      <div className="p-2.5 bg-blue-50 rounded-xl mr-3 shadow-inner border border-white/50">
                        <FiPhone className="text-blue-600 w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Phone
                        </h3>
                        <a
                          href="tel:+15551234567"
                          className="text-blue-600 hover:text-blue-800 transition-colors font-medium"
                        >
                          +91 8605234701
                        </a>
                      </div>
                    </div>
 
                    {/* Support Hours */}
                    <div className="flex items-start">
                      <div className="p-2.5 bg-blue-50 rounded-xl mr-3 shadow-inner border border-white/50">
                        <FiClock className="text-blue-600 w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Support Hours
                        </h3>
                        <p className="text-gray-700 font-medium">
                          Monday-Saturday, 10AM-7PM IST
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          Emergency support available 24/7 for critical issues
                        </p>
                      </div>
                    </div>
 
                    {/* Raise Ticket Button */}
                    <div className="pt-4">
                      <button
                        onClick={() => setShowTicketForm(true)}
                        className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <FiPlus className="mr-2" /> Raise a Ticket
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
 
            {/* Right Column - Knowledge Base and Status */}
            <div className="lg:col-span-2 space-y-6">
              {/* Knowledge Base Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {knowledgeBaseItems.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleKnowledgeItemClick(item.title)}
                    className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="bg-blue-50 p-2.5 rounded-xl border border-white/60 shadow-inner">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="text-md font-semibold text-gray-900">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{item.category}</p>
                  </div>
                ))}
              </div>
 
              {/* Status Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative mt-1">
                      <div className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75 animate-ping"></div>
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        System Status
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        All systems operational
                      </p>
                    </div>
                  </div>
 
                  <div className="flex items-center text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
                    <span className="inline-flex items-center">
                      <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500 mr-1.5" />
                      Last updated:{" "}
                      {new Date().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};
 
export default Help;
 
 