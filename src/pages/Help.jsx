// ONLY the updated parts are modified. Remaining code is untouched.
import React, { useState, useEffect, useContext, useCallback } from "react";
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [showPopup, setShowPopup] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showRaisedTickets, setShowRaisedTickets] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [remark, setRemark] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshClicks, setRefreshClicks] = useState([]);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
 
 
 
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    priority: "medium",
  });
 
  const isAdmin = user?.department === "Admin";
 
  const handleKnowledgeItemClick = (title) => {
    if (title === "Troubleshooting") {
      setPopupTitle(title);
      setShowPopup(true);
    } else {
      // For other items, show under development popup
      setPopupTitle(title);
      setShowPopup(true);
    }
  };

  const isRateLimited = useCallback(() => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentClicks = refreshClicks.filter(click => click > oneMinuteAgo);
    return recentClicks.length >= 3;
  }, [refreshClicks]);

  const handleRefresh = async () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 1 minute in milliseconds

    // Filter out clicks older than 1 minute
    const recentClicks = refreshClicks.filter(click => click > oneMinuteAgo);

    // Check if already clicked 3 times in the last minute
    if (recentClicks.length >= 3) {
      const oldestRecentClick = Math.min(...recentClicks);
      const timeUntilReset = Math.ceil((oldestRecentClick + 60000 - now) / 1000);
      toast.warning(`Please wait ${timeUntilReset} seconds before refreshing again.`);
      return;
    }

    // Add current click to the array
    setRefreshClicks([...recentClicks, now]);

    setIsRefreshing(true);
    try {
      await fetchTickets();
      toast.success("Tickets refreshed successfully!");
    } catch (error) {
      console.error("Refresh failed:", error);
      toast.error("Failed to refresh tickets");
    } finally {
      setIsRefreshing(false);
    }
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
        console.error("Email notification failed:", emailError);
        // Don't block the status update
        let errorMessage = "Ticket submitted but email notification failed.";
        if (emailError.status === 422) {
          errorMessage =
            "Email configuration error - recipient address may be invalid";
        } else if (emailError.status === 400) {
          errorMessage = "Invalid email parameters";
        }
        toast.warning(errorMessage);
      }      // Reset form
      setTicketForm({
        title: "",
        description: "",
        priority: "medium",
      });
      setShowTicketForm(false);
      fetchTickets();
    } catch (error) {
      console.error("Failed to submit ticket:", error);
      toast.error("Failed to submit ticket. Please try again.");
    }finally {
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
      console.error("Failed to update ticket status:", error);
      toast.error("Failed to update ticket status");
    }
  };
  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user, fetchTickets]);

  // Update countdown timer for rate limiting
  useEffect(() => {
    let interval;
    if (isRateLimited()) {
      interval = setInterval(() => {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const recentClicks = refreshClicks.filter(click => click > oneMinuteAgo);
        if (recentClicks.length >= 3) {
          const oldestRecentClick = Math.min(...recentClicks);
          const remainingMs = (oldestRecentClick + 60000) - now;
          const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
          setRateLimitCountdown(remainingSeconds);
        } else {
          setRateLimitCountdown(0);
        }
      }, 1000);
    } else {
      setRateLimitCountdown(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [refreshClicks, isRateLimited]);

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (location.state?.showTickets) {
      setShowRaisedTickets(true);
    }
  }, [location.state]);
 
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
    <div className="min-h-screen bg-gray-50/50 py-2">
      {/* Under Development Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-54 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl max-w-4xl w-full relative overflow-hidden border border-gray-100 shadow-2xl animate-scaleIn max-h-[90vh] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-500 to-indigo-600"></div>
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
              aria-label="Close popup"
            >
              <FiX className="w-5 h-5" />
            </button>

            {popupTitle === "Troubleshooting" ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 pt-2 pb-20">
                  <div className="flex items-center mb-6 py-2">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                      <FiAlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Troubleshooting Guide
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Common issues and their solutions
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Login & Authentication Issues */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <FiUser className="w-5 h-5 mr-2 text-blue-600" />
                        Login & Authentication Issues
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <h5 className="font-medium text-red-800 mb-1">Login Failed</h5>
                          <p className="text-red-700 text-sm mb-2">Error: "Invalid login credentials" or "Authentication failed"</p>
                          <ul className="text-red-700 text-sm space-y-1">
                            <li>• Check that your email and password are correct</li>
                            <li>• Ensure you're using your work email address</li>
                            <li>• Try clearing your browser cache and cookies</li>
                            <li>• Contact your administrator if account is locked</li>
                          </ul>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <h5 className="font-medium text-yellow-800 mb-1">Session Expired</h5>
                          <p className="text-yellow-700 text-sm mb-2">Error: "Your session has expired" or timeout warnings</p>
                          <ul className="text-yellow-700 text-sm space-y-1">
                            <li>• Sessions automatically expire after 12 hours of inactivity</li>
                            <li>• You'll see a warning 5 minutes before expiration</li>
                            <li>• Click "Stay Logged In" to extend your session</li>
                            <li>• Move your mouse or interact with the page to stay active</li>
                          </ul>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <h5 className="font-medium text-blue-800 mb-1">Microsoft Login Issues</h5>
                          <p className="text-blue-700 text-sm mb-2">Error: "Microsoft authentication failed"</p>
                          <ul className="text-blue-700 text-sm space-y-1">
                            <li>• Ensure your Microsoft account is properly configured</li>
                            <li>• Check if popup blockers are disabled for this site</li>
                            <li>• Try using an incognito/private browsing window</li>
                            <li>• Contact IT support if Microsoft integration is broken</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Network & Connectivity Issues */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <FiSettings className="w-5 h-5 mr-2 text-green-600" />
                        Network & Connectivity Issues
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <h5 className="font-medium text-red-800 mb-1">Connection Lost</h5>
                          <p className="text-red-700 text-sm mb-2">Error: "No internet connection" or "Network error"</p>
                          <ul className="text-red-700 text-sm space-y-1">
                            <li>• Check your internet connection</li>
                            <li>• Try refreshing the page</li>
                            <li>• Wait for the connection status indicator to turn green</li>
                            <li>• Some features may be unavailable offline</li>
                          </ul>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded p-3">
                          <h5 className="font-medium text-orange-800 mb-1">Slow Loading</h5>
                          <p className="text-orange-700 text-sm mb-2">Pages taking too long to load</p>
                          <ul className="text-orange-700 text-sm space-y-1">
                            <li>• Check your internet speed</li>
                            <li>• Try clearing browser cache</li>
                            <li>• Close other browser tabs to free up memory</li>
                            <li>• Use a wired connection instead of Wi-Fi if possible</li>
                          </ul>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <h5 className="font-medium text-yellow-800 mb-1">Rate Limiting</h5>
                          <p className="text-yellow-700 text-sm mb-2">Error: "Rate limit exceeded" or "Too many requests"</p>
                          <ul className="text-yellow-700 text-sm space-y-1">
                            <li>• Wait 1 minute before trying again</li>
                            <li>• Reduce the frequency of your actions</li>
                            <li>• This limit protects system performance</li>
                            <li>• Contact support if you need higher limits</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Data Loading & Display Issues */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <FiGrid className="w-5 h-5 mr-2 text-purple-600" />
                        Data Loading & Display Issues
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <h5 className="font-medium text-red-800 mb-1">Data Not Loading</h5>
                          <p className="text-red-700 text-sm mb-2">Error: "Failed to load data" or blank screens</p>
                          <ul className="text-red-700 text-sm space-y-1">
                            <li>• Check your internet connection</li>
                            <li>• Try refreshing the page</li>
                            <li>• Clear browser cache and reload</li>
                            <li>• Contact support if the issue persists</li>
                          </ul>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <h5 className="font-medium text-blue-800 mb-1">Permission Denied</h5>
                          <p className="text-blue-700 text-sm mb-2">Error: "Access denied" or "Insufficient permissions"</p>
                          <ul className="text-blue-700 text-sm space-y-1">
                            <li>• Verify you have access to this department/section</li>
                            <li>• Contact your administrator to check permissions</li>
                            <li>• Some features require specific department access</li>
                            <li>• Admin users have access to all areas</li>
                          </ul>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <h5 className="font-medium text-green-800 mb-1">Dashboard Not Available</h5>
                          <p className="text-green-700 text-sm mb-2">Error: "Dashboard not found" or blank dashboard</p>
                          <ul className="text-green-700 text-sm space-y-1">
                            <li>• Check if your department is assigned correctly</li>
                            <li>• Try switching between different department tabs</li>
                            <li>• Contact admin to verify department configuration</li>
                            <li>• Some dashboards may be temporarily unavailable</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Notification & Ticket Issues */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <FiMail className="w-5 h-5 mr-2 text-indigo-600" />
                        Notification & Ticket Issues
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <h5 className="font-medium text-yellow-800 mb-1">Email Notifications Not Working</h5>
                          <p className="text-yellow-700 text-sm mb-2">Ticket created but no email received</p>
                          <ul className="text-yellow-700 text-sm space-y-1">
                            <li>• Check your spam/junk folder</li>
                            <li>• Verify the email address in your ticket</li>
                            <li>• Email service may be temporarily unavailable</li>
                            <li>• Contact support if emails consistently fail</li>
                          </ul>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <h5 className="font-medium text-blue-800 mb-1">Bell Icon Not Showing Notifications</h5>
                          <p className="text-blue-700 text-sm mb-2">No notification badge or alerts</p>
                          <ul className="text-blue-700 text-sm space-y-1">
                            <li>• Check the bell icon in the top-right corner</li>
                            <li>• Notifications appear for unresolved tickets</li>
                            <li>• Try refreshing the page to load new notifications</li>
                            <li>• Contact admin if you should be receiving alerts</li>
                          </ul>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <h5 className="font-medium text-red-800 mb-1">Ticket Submission Failed</h5>
                          <p className="text-red-700 text-sm mb-2">Error: "Failed to submit ticket"</p>
                          <ul className="text-red-700 text-sm space-y-1">
                            <li>• Check your internet connection</li>
                            <li>• Ensure all required fields are filled</li>
                            <li>• Title must be less than 100 characters</li>
                            <li>• Description must be less than 2000 characters</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* General Issues */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <FiCheckCircle className="w-5 h-5 mr-2 text-gray-600" />
                        General Issues & Best Practices
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-gray-50 border border-gray-200 rounded p-3">
                          <h5 className="font-medium text-gray-800 mb-1">Browser Compatibility</h5>
                          <p className="text-gray-700 text-sm mb-2">Best browsers and settings</p>
                          <ul className="text-gray-700 text-sm space-y-1">
                            <li>• Use Chrome, Firefox, Safari, or Edge (latest versions)</li>
                            <li>• Enable JavaScript and cookies</li>
                            <li>• Disable popup blockers for this site</li>
                            <li>• Clear cache regularly for best performance</li>
                          </ul>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <h5 className="font-medium text-blue-800 mb-1">Unexpected Errors</h5>
                          <p className="text-blue-700 text-sm mb-2">Application crashes or error messages</p>
                          <ul className="text-blue-700 text-sm space-y-1">
                            <li>• Try refreshing the page first</li>
                            <li>• Clear browser cache and cookies</li>
                            <li>• Try using an incognito/private window</li>
                            <li>• Contact support with error details if it persists</li>
                          </ul>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <h5 className="font-medium text-green-800 mb-1">Performance Tips</h5>
                          <p className="text-green-700 text-sm mb-2">Optimize your experience</p>
                          <ul className="text-green-700 text-sm space-y-1">
                            <li>• Close unused browser tabs</li>
                            <li>• Use a stable internet connection</li>
                            <li>• Avoid multiple simultaneous file uploads</li>
                            <li>• Log out when not using the application</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-blue-900 mb-3">
                        Still Need Help?
                      </h4>
                      <p className="text-blue-800 text-sm mb-3">
                        If none of these solutions work, please contact our support team:
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <a
                          href="mailto:connect@gryphonacademy.co.in"
                          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <FiMail className="w-4 h-4 mr-2" />
                          Email Support
                        </a>
                        <a
                          href="tel:+918605234701"
                          className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <FiPhone className="w-4 h-4 mr-2" />
                          Call Support
                        </a>
                      </div>
                      <p className="text-blue-700 text-xs mt-3">
                        Support Hours: Monday-Saturday, 10AM-7PM IST (24/7 emergency support available)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-end rounded-b-xl">
                  <button
                    onClick={() => setShowPopup(false)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
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
            )}
          </div>
        </div>
      )}
 
      {/* Ticket Form Popup */}
      {showTicketForm && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-54 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl p-4 max-w-md w-full relative overflow-hidden border border-gray-100 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-500 to-indigo-600"></div>
            <button
              onClick={() => setShowTicketForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close popup"
            >
              <FiX className="w-5 h-5" />
            </button>
 
            <div className="pt-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Raise a New Ticket
              </h3>

              <form onSubmit={submitTicket}>
                <div className="mb-3">
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
                <div className="mb-3">
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

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={ticketForm.description}
                    onChange={handleTicketFormChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  ></textarea>
                </div>

                <div className="mb-4">
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
                  className={`w-full px-4 py-2 ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
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
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full relative overflow-hidden border border-gray-100 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-500 to-indigo-600"></div>
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
 
      <div className="w-full">
        {/* Header aligned left */}
        <div className="mb-3">
          <div className="inline-flex items-center justify-start bg-linear-to-br from-blue-100 to-indigo-100 rounded-lg p-2 mb-1 shadow-sm border border-white">
            <FiHelpCircle className="text-blue-600 w-4 h-4" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 leading-tight">
            How can we help?
          </h1>
          <p className="text-xs text-gray-600 max-w-2xl">
            Find answers, guides, and resources to help you get the most out of
            our platform.
          </p>
        </div>
 
        {/* Modified Tabs Section */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            onClick={() => setShowRaisedTickets(false)}
            className={`px-2 py-1.5 font-medium text-sm ${!showRaisedTickets
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Help Center
          </button>
          <button
            onClick={() => setShowRaisedTickets(true)}
            className={`px-2 py-1.5 font-medium text-sm ${showRaisedTickets
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {isAdmin ? "All Tickets" : "My Tickets"}
          </button>
        </div>
 
 
{showRaisedTickets ? (
  <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {isAdmin ? "All Support Tickets" : "My Support Tickets"}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isRateLimited()}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isRefreshing 
                ? 'bg-blue-50 text-blue-400 cursor-not-allowed' 
                : isRateLimited()
                ? 'bg-red-50 text-red-400 cursor-not-allowed'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
            title={isRateLimited() ? `Rate limited - wait ${formatCountdown(rateLimitCountdown)}` : "Refresh tickets"}
          >
            {isRefreshing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowTicketForm(true)}
            className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <FiPlus className="mr-1.5 w-4 h-4" /> New Ticket
          </button>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">
            {isAdmin
              ? "No tickets found"
              : "You haven't created any tickets yet"}
          </p>
          {!isAdmin && (
            <button
              onClick={() => setShowTicketForm(true)}
              className="mt-3 flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto text-sm"
            >
              <FiPlus className="mr-1.5 w-4 h-4" /> Create Your First Ticket
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Title
                </th>
                {isAdmin && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Created By
                  </th>
                )}
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Priority
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] max-w-[250px]">
                  Remark
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 max-w-[180px] truncate">
                    {ticket.title}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {ticket.createdBy}
                    </td>
                  )}
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${ticket.priority === "critical"
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
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${ticket.status === "resolved"
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

                  <td className="px-3 py-3 text-sm text-gray-500 max-w-[250px]">
                    <div className="wrap-break-word">
                      {ticket.remark
                        ? ticket.remark
                        : ticket.status === "resolved"
                          ? `Resolved by ${ticket.resolvedBy?.split("@")[0] || "admin"}`
                          : ticket.status === "can't-resolve"
                            ? "Couldn't resolve"
                            : "Pending resolution"}
                    </div>
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => setActiveTicket(ticket)}
                      className="text-blue-600 hover:text-blue-800 whitespace-nowrap text-sm"
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Contact Support */}
            <div className="space-y-3">
              {/* Contact Card */}
              <div className="bg-white rounded-lg shadow-xs border border-gray-100 overflow-hidden transition-all hover:shadow-sm">
                <div className="p-3">
                  <div className="flex items-center mb-3">
                    <div className="bg-linear-to-br from-blue-50 to-indigo-50 p-2 rounded-lg mr-2 shadow-inner border border-white">
                      <FiMail className="text-blue-600 w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      Contact Support
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {/* Email */}
                    <div className="flex items-start">
                      <div className="p-1.5 bg-blue-50 rounded-md mr-2 shadow-inner border border-white/50">
                        <FiMail className="text-blue-600 w-3 h-3" />
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 mb-0.5">
                          Email
                        </h3>
                        <a
                          href="mailto:connect@gryphonacademy.co.in"
                          className="text-blue-600 hover:text-blue-800 transition-colors font-medium inline-flex items-center text-xs"
                        >
                          connect@gryphonacademy.co.in{" "}
                          <FiExternalLink className="ml-0.5 w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-start">
                      <div className="p-1.5 bg-blue-50 rounded-md mr-2 shadow-inner border border-white/50">
                        <FiPhone className="text-blue-600 w-3 h-3" />
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 mb-0.5">
                          Phone
                        </h3>
                        <a
                          href="tel:+15551234567"
                          className="text-blue-600 hover:text-blue-800 transition-colors font-medium text-xs"
                        >
                          +91 8605234701
                        </a>
                      </div>
                    </div>

                    {/* Support Hours */}
                    <div className="flex items-start">
                      <div className="p-1.5 bg-blue-50 rounded-md mr-2 shadow-inner border border-white/50">
                        <FiClock className="text-blue-600 w-3 h-3" />
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 mb-0.5">
                          Support Hours
                        </h3>
                        <p className="text-gray-700 font-medium text-xs">
                          Mon-Sat, 10AM-7PM IST
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          24/7 emergency support
                        </p>
                      </div>
                    </div>

                    {/* Raise Ticket Button */}
                    <div className="pt-2">
                      <button
                        onClick={() => setShowTicketForm(true)}
                        className="w-full flex items-center justify-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-xs"
                      >
                        <FiPlus className="mr-1 w-3 h-3" /> Raise Ticket
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Knowledge Base and Status */}
            <div className="lg:col-span-2 space-y-4">
              {/* Knowledge Base Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {knowledgeBaseItems.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleKnowledgeItemClick(item.title)}
                    className="bg-white rounded-lg p-3 border border-gray-100 shadow-xs hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-50 p-1.5 rounded-md border border-white/60 shadow-inner">
                        {React.cloneElement(item.icon, { className: "w-3 h-3" })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold text-gray-900 truncate">
                          {item.title}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">{item.desc}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.category}</p>
                  </div>
                ))}
              </div>

              {/* Status Card */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-xs overflow-hidden">
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="absolute h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-75 animate-ping"></div>
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900">
                        System Status
                      </h3>
                      <p className="text-gray-500 text-xs">
                        All systems operational
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                    <span className="inline-flex items-center">
                      <FiCheckCircle className="w-2.5 h-2.5 text-emerald-500 mr-1" />
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
 
 