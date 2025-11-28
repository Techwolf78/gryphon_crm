import React, { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

import {
  FaRegClock,
  FaTimes,
  FaCalendarAlt,
  FaStickyNote,
  FaChevronUp,
  FaChevronDown,
  FaTrash,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaRedo,
  FaHistory,
  FaClock,
} from "react-icons/fa";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

import { logPlacementActivity } from "../../../utils/placementAuditLogger";

// Predefined remarks templates for placement follow-ups
const REMARKS_TEMPLATES = [
  { value: "Call Connected", label: "Call Connected" },
  { value: "Invite mail sent", label: "Invite mail sent" },
  { value: "Call Disconnected", label: "Call Disconnected" },
  { value: "Switched off", label: "Switched off" },
  { value: "Busy", label: "Busy" },
  { value: "Didn't pick", label: "Didn't pick" },
  { value: "Not Hiring", label: "Not Hiring" },
  { value: "Invalid Number", label: "Invalid Number" }
];

const FollowUpCompany = ({ company, onClose, onFollowUpScheduled }) => {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [time, setTime] = useState({
    hours: 12,
    minutes: 0,
    ampm: "AM",
  });
  const [remarks, setRemarks] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const [pastFollowups, setPastFollowups] = useState([]);
  const [calendarError, setCalendarError] = useState(null);
  const [showCalendarWarning, setShowCalendarWarning] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteFollowupKey, setDeleteFollowupKey] = useState(null);
  const [snackbar, setSnackbar] = useState("");
  const [snackbarType, setSnackbarType] = useState("success");
  const [maliciousWarning, setMaliciousWarning] = useState("");
  const timePickerRef = useRef(null);
  const [connecting, setConnecting] = useState(false);

  const { instance, accounts } = useMsal();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const graphScopes = ["User.Read", "Calendars.ReadWrite"];

  // Check if calendar warning should be shown (once per day)
  const shouldShowCalendarWarning = () => {
    const today = dayjs().format('YYYY-MM-DD');
    const lastShown = localStorage.getItem('calendarWarningLastShown');
    return lastShown !== today;
  };

  // Mark calendar warning as shown for today
  const markCalendarWarningShown = () => {
    const today = dayjs().format('YYYY-MM-DD');
    localStorage.setItem('calendarWarningLastShown', today);
  };

  // Close time picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (timePickerRef.current && !timePickerRef.current.contains(event.target)) {
        setShowTimePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPastFollowups = useCallback(async () => {
    if (!company?.id) return;

    try {
      // For companies, follow-ups are stored within the company data in companyleads collection
      const lead = company; // company is passed as lead-like object
      if (!lead || !lead.batchId) return;

      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];
        const companyIndex = parseInt(lead.id.split('_').pop());

        if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
          let jsonString;
          try {
            const uriDecoded = atob(encodedCompanies[companyIndex]);
            jsonString = decodeURIComponent(uriDecoded);
          } catch {
            jsonString = decodeURIComponent(encodedCompanies[companyIndex]);
          }
          const decodedCompany = JSON.parse(jsonString);
          const followups = decodedCompany.followups || [];
          setPastFollowups(followups);
        } else {
          console.error("Invalid company index in fetchPastFollowups:", companyIndex);
        }
      } else {
        console.error("Batch doc not found in fetchPastFollowups");
      }
    } catch (error) {
      console.error("Error fetching past follow-ups:", error);
    }
  }, [company]);

  const handleDeleteFollowup = async (followupKey) => {
    try {
      const lead = company;
      if (!lead || !lead.batchId) return;

      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];
        const companyIndex = parseInt(lead.id.split('_').pop());

        if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
          let jsonString;
          try {
            const uriDecoded = atob(encodedCompanies[companyIndex]);
            jsonString = decodeURIComponent(uriDecoded);
          } catch {
            jsonString = decodeURIComponent(encodedCompanies[companyIndex]);
          }
          const decodedCompany = JSON.parse(jsonString);
          const followups = decodedCompany.followups || [];
          const updatedFollowups = followups.filter(f => f.key !== followupKey);

          const updatedCompany = {
            ...decodedCompany,
            followups: updatedFollowups,
          };
          // Use Unicode-safe encoding: encodeURIComponent + btoa to handle Unicode characters
          const deleteJsonString = JSON.stringify(updatedCompany);
          const deleteUriEncoded = encodeURIComponent(deleteJsonString);
          encodedCompanies[companyIndex] = btoa(deleteUriEncoded);

          await setDoc(batchDocRef, {
            ...batchData,
            companies: encodedCompanies,
          });

          setPastFollowups(updatedFollowups);
          showSnackbar("Follow-up deleted successfully", "success");
        } else {
          console.error("Invalid company index in handleDeleteFollowup:", companyIndex);
        }
      } else {
        console.error("Batch doc not found in handleDeleteFollowup");
      }
    } catch (error) {
      console.error("Error deleting follow-up:", error);
      showSnackbar("Failed to delete follow-up", "error");
    }
    setShowDeleteConfirm(false);
    setDeleteFollowupKey(null);
  };

  useEffect(() => {
    fetchPastFollowups();
  }, [company, fetchPastFollowups]);

  const getAccessToken = async () => {
    if (!accounts || accounts.length === 0) {
      throw new Error("MS365 not connected - please connect your Microsoft account first");
    }

    const request = {
      scopes: graphScopes,
      account: accounts[0],
    };

    try {
      const response = await instance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Try popup authentication
        try {
          const response = await instance.acquireTokenPopup(request);
          return response.accessToken;
        } catch (popupError) {
          console.warn("Popup authentication failed:", popupError);
          throw new Error("MS365 authentication required - please sign in to Microsoft 365");
        }
      }
      throw error;
    }
  };

  const handleConnectM365 = async () => {
    setConnecting(true);
    try {
      const loginRequest = {
        scopes: graphScopes,
      };
      await instance.loginPopup(loginRequest);
      showSnackbar("Successfully connected to Microsoft 365!", "success");
    } catch (error) {
      console.error("M365 connection failed:", error);
      showSnackbar("Failed to connect to Microsoft 365", "error");
    } finally {
      setConnecting(false);
    }
  };

  const createCalendarEvent = async () => {
    setCalendarError(null);

    try {
      const accessToken = await getAccessToken();

      const eventDateTime = dayjs(`${date} ${get24HourTime()}`).format();
      const endDateTime = dayjs(eventDateTime).add(1, 'hour').format();

      const event = {
        subject: `Follow-up with ${company.companyName || company.name}${company.pocName && company.pocName !== 'N/A' ? ` | ${company.pocName}` : ''}${company.pocPhone && company.pocPhone !== 'N/A' ? ` | ${company.pocPhone}` : ''}`,
        body: {
          contentType: "HTML",
          content: remarks || "Scheduled follow-up meeting",
        },
        start: {
          dateTime: eventDateTime,
          timeZone: timezone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timezone,
        },
        location: {
          displayName: "Virtual Meeting",
        },
        attendees: sendInvite ? [{
          emailAddress: {
            address: company.pocMail || company.email,
            name: company.pocName || company.contactPerson,
          },
          type: "required",
        }] : [],
      };

      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to create calendar event");
      }

      const createdEvent = await response.json();

      return createdEvent;
    } catch (error) {
      console.error("Error creating calendar event:", error);
      setCalendarError(error.message);
      throw error;
    }
  };

  const showSnackbar = (msg, type = "success") => {
    setSnackbar(msg);
    setSnackbarType(type);
    setTimeout(() => setSnackbar(""), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!selectedTemplate) {
      showSnackbar("Please select a template", "error");
      return;
    }

    // Check for malicious input before proceeding
    if (maliciousWarning) {
      showSnackbar("Cannot submit: Please remove malicious content from remarks", "error");
      return;
    }

    setLoading(true);

    try {
      const followupData = {
        key: Date.now().toString(),
        date,
        time: getFullTimeString(),
        template: selectedTemplate,
        remarks,
        createdAt: new Date().toISOString(),
        calendarEventCreated: false,
      };

      let calendarEvent = null;

      // Always try to create calendar event (non-critical path)
      try {
        calendarEvent = await createCalendarEvent();
        followupData.calendarEventCreated = true;
        followupData.calendarEventId = calendarEvent.id;
        console.log("Calendar event created successfully:", calendarEvent.id);
      } catch (calendarErr) {
        console.warn("Calendar event creation failed:", calendarErr.message);
        followupData.calendarEventCreated = false;
        followupData.calendarError = calendarErr.message;

        // Only show warning once per day for MS365 connection issues
        if (shouldShowCalendarWarning() && !calendarErr.message.includes("MS365")) {
          setShowCalendarWarning(true);
          markCalendarWarningShown();
        }
      }

      // Save follow-up to company data
      const lead = company;
      if (!lead || !lead.batchId) {
        throw new Error("Invalid company data");
      }

      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];
        const companyIndex = parseInt(lead.id.split('_').pop());

        if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
          let jsonString;
          try {
            const uriDecoded = atob(encodedCompanies[companyIndex]);
            jsonString = decodeURIComponent(uriDecoded);
          } catch {
            jsonString = decodeURIComponent(encodedCompanies[companyIndex]);
          }
          const decodedCompany = JSON.parse(jsonString);
          const followups = decodedCompany.followups || [];
          const updatedFollowups = [followupData, ...followups];

          const updatedCompany = {
            ...decodedCompany,
            followups: updatedFollowups,
          };
          // Use Unicode-safe encoding: encodeURIComponent + btoa to handle Unicode characters
          const updatedJsonString = JSON.stringify(updatedCompany);
          const uriEncoded = encodeURIComponent(updatedJsonString);
          encodedCompanies[companyIndex] = btoa(uriEncoded);

          await setDoc(batchDocRef, {
            ...batchData,
            companies: encodedCompanies,
          });

          // Log the follow-up scheduling activity
          await logPlacementActivity({
            action: 'SCHEDULE_FOLLOWUP',
            leadId: lead.id,
            leadName: lead.companyName || lead.name,
            details: {
              date,
              time: getFullTimeString(),
              remarks,
              calendarEventCreated: followupData.calendarEventCreated,
              sendInvite
            }
          });

          setPastFollowups(updatedFollowups);
          showSnackbar("Follow-up scheduled successfully!", "success");

          // Notify parent component that a follow-up was scheduled
          if (onFollowUpScheduled) {
            onFollowUpScheduled();
          }

          // Auto-close the modal on successful submission
          onClose();

          // Reset form
          setDate(dayjs().format("YYYY-MM-DD"));
          setTime({ hours: 12, minutes: 0, ampm: "AM" });
          setRemarks("");
          setSelectedTemplate("");
          setSendInvite(false);
        } else {
          console.error("Invalid company index:", companyIndex, "for array length:", encodedCompanies.length);
          throw new Error("Company index out of bounds");
        }
      } else {
        console.error("Batch document does not exist for batchId:", lead.batchId);
        throw new Error("Batch document not found");
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      showSnackbar("Failed to schedule follow-up", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarRetry = async () => {
    setIsRetrying(true);
    setRetryAttempts(prev => prev + 1);

    try {
      await createCalendarEvent();
      showSnackbar("Calendar event created successfully!", "success");
      setCalendarError(null);
      setShowCalendarWarning(false);
    } catch (error) {
      console.error("Retry failed:", error);
      if (retryAttempts < 2) {
        showSnackbar("Retry failed, trying again...", "warning");
        setTimeout(() => handleCalendarRetry(), 2000);
      } else {
        showSnackbar("Failed to create calendar event after retries", "error");
        setIsRetrying(false);
      }
    }
  };

  const handleRetryCalendarEvent = async (followup) => {
    try {
      setLoading(true);
      const accessToken = await getAccessToken();

      const eventDateTime = dayjs(`${followup.date} ${followup.time.split(' ')[0]} ${followup.time.split(' ')[1]}`).format();
      const endDateTime = dayjs(eventDateTime).add(1, 'hour').format();

      const event = {
        subject: `Follow-up with ${company.companyName || company.name}${company.pocName && company.pocName !== 'N/A' ? ` | ${company.pocName}` : ''}${company.pocPhone && company.pocPhone !== 'N/A' ? ` | ${company.pocPhone}` : ''}`,
        body: {
          contentType: "HTML",
          content: followup.remarks || "Scheduled follow-up meeting",
        },
        start: {
          dateTime: eventDateTime,
          timeZone: timezone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timezone,
        },
        location: {
          displayName: "Virtual Meeting",
        },
        attendees: sendInvite ? [{
          emailAddress: {
            address: company.pocMail || company.email,
            name: company.pocName || company.contactPerson,
          },
          type: "required",
        }] : [],
      };

      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to create calendar event");
      }

      const createdEvent = await response.json();

      // Update the followup in the database
      const lead = company;
      if (!lead || !lead.batchId) return;

      const batchDocRef = doc(db, "companyleads", lead.batchId);
      const batchDocSnap = await getDoc(batchDocRef);

      if (batchDocSnap.exists()) {
        const batchData = batchDocSnap.data();
        const encodedCompanies = batchData.companies || [];
        const companyIndex = parseInt(lead.id.split('_').pop());

        if (companyIndex >= 0 && companyIndex < encodedCompanies.length) {
          let jsonString;
          try {
            const uriDecoded = atob(encodedCompanies[companyIndex]);
            jsonString = decodeURIComponent(uriDecoded);
          } catch {
            jsonString = decodeURIComponent(encodedCompanies[companyIndex]);
          }
          const decodedCompany = JSON.parse(jsonString);
          const followups = decodedCompany.followups || [];
          const updatedFollowups = followups.map(f => 
            f.key === followup.key 
              ? { ...f, calendarEventCreated: true, calendarEventId: createdEvent.id }
              : f
          );

          const updatedCompany = {
            ...decodedCompany,
            followups: updatedFollowups,
          };
          // Use Unicode-safe encoding: encodeURIComponent + btoa to handle Unicode characters
          const retryJsonString = JSON.stringify(updatedCompany);
          const retryUriEncoded = encodeURIComponent(retryJsonString);
          encodedCompanies[companyIndex] = btoa(retryUriEncoded);

          await setDoc(batchDocRef, {
            ...batchData,
            companies: encodedCompanies,
          });

          setPastFollowups(updatedFollowups);
          showSnackbar("Calendar event created successfully!", "success");
        }
      }
    } catch (error) {
      console.error("Error retrying calendar event:", error);
      showSnackbar("Failed to create calendar event", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleTimePicker = (e) => {
    e.stopPropagation();
    setShowTimePicker(!showTimePicker);
  };

  const handleTimeChange = (field, value) => {
    setTime(prev => ({ ...prev, [field]: value }));
  };

  const increment = (field) => {
    setTime(prev => {
      const newTime = { ...prev };
      if (field === "hours") {
        newTime.hours = newTime.hours === 12 ? 1 : newTime.hours + 1;
      } else if (field === "minutes") {
        newTime.minutes = newTime.minutes === 59 ? 0 : newTime.minutes + 1;
      }
      return newTime;
    });
  };

  const decrement = (field) => {
    setTime(prev => {
      const newTime = { ...prev };
      if (field === "hours") {
        newTime.hours = newTime.hours === 1 ? 12 : newTime.hours - 1;
      } else if (field === "minutes") {
        newTime.minutes = newTime.minutes === 0 ? 59 : newTime.minutes - 1;
      }
      return newTime;
    });
  };

  const toggleAMPM = () => {
    setTime(prev => ({
      ...prev,
      ampm: prev.ampm === "AM" ? "PM" : "AM",
    }));
  };

  const formatTimeValue = (value) => {
    return value.toString().padStart(2, "0");
  };

  const getFullTimeString = () => {
    return `${formatTimeValue(time.hours)}:${formatTimeValue(time.minutes)} ${time.ampm}`;
  };

  const get24HourTime = () => {
    let hours = time.hours;
    if (time.ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (time.ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${formatTimeValue(hours)}:${formatTimeValue(time.minutes)}:00`;
  };

  const getRelativeTime = (dateString) => {
    const followupDate = dayjs(dateString);
    return followupDate.fromNow();
  };

  // Function to detect malicious input patterns
  const detectMaliciousInput = (text) => {
    const maliciousPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi, // Script tags
      /javascript:/gi, // JavaScript URLs
      /on\w+\s*=/gi, // Event handlers
      /<iframe[^>]*>/gi, // Iframes
      /<object[^>]*>/gi, // Object tags
      /<embed[^>]*>/gi, // Embed tags
      /<form[^>]*>/gi, // Form tags
      /<input[^>]*>/gi, // Input tags
      /<meta[^>]*>/gi, // Meta tags
      /<link[^>]*>/gi, // Link tags
      /eval\s*\(/gi, // Eval function calls
      /Function\s*\(/gi, // Function constructor
      /setTimeout\s*\(/gi, // setTimeout with string
      /setInterval\s*\(/gi, // setInterval with string
      /document\./gi, // Direct document access
      /window\./gi, // Direct window access
      /location\./gi, // Direct location access
      /cookie/gi, // Cookie manipulation
      /localStorage/gi, // Local storage access
      /sessionStorage/gi, // Session storage access
      /XMLHttpRequest/gi, // AJAX requests
      /fetch\s*\(/gi, // Fetch API calls
      /import\s*\(/gi, // Dynamic imports
      /require\s*\(/gi, // Require calls
      /process\./gi, // Node.js process access
      /fs\./gi, // File system access
      /child_process/gi, // Child process execution
      /exec\s*\(/gi, // Command execution
      /spawn\s*\(/gi, // Process spawning
      /--drop/gi, // SQL DROP statements
      /--delete/gi, // SQL DELETE statements
      /union\s+select/gi, // SQL injection patterns
      /select\s+.*\s+from/gi, // SQL SELECT patterns
      /insert\s+into/gi, // SQL INSERT patterns
      /update\s+.*\s+set/gi, // SQL UPDATE patterns
      /alter\s+table/gi, // SQL ALTER patterns
      /create\s+table/gi, // SQL CREATE patterns
      /truncate\s+table/gi, // SQL TRUNCATE patterns
      /drop\s+table/gi, // SQL DROP patterns
      /drop\s+database/gi, // SQL DROP database
      /show\s+tables/gi, // SQL SHOW tables
      /show\s+databases/gi, // SQL SHOW databases
      /information_schema/gi, // SQL information schema access
      /load_file/gi, // SQL file loading
      /into\s+outfile/gi, // SQL file writing
      /benchmark\s*\(/gi, // SQL benchmark attacks
      /sleep\s*\(/gi, // SQL time-based attacks
      /waitfor\s+delay/gi, // SQL Server delay attacks
      /xp_cmdshell/gi, // SQL Server command execution
      /sp_executesql/gi, // SQL Server dynamic execution
    ];

    return maliciousPatterns.some(pattern => pattern.test(text));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-54 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden border border-slate-200/50">
        {/* Header */}
        <div className="bg-linear-to-r from-slate-50 to-slate-100 border-b border-slate-200/50 px-6 py-1.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-linear-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center shadow-lg">
                <FaCalendarAlt className="text-white text-sm" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900 tracking-tight">Schedule Follow-up</h1>
                <p className="text-xs text-slate-600">
                  {company.companyName || company.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded flex items-center justify-center transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Close modal"
            >
              <FaTimes size={10} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(95vh-120px)]">
          {/* Company Confirmation Section */}
          <div className="bg-amber-50/50 border border-amber-200/30 rounded p-2 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-amber-100 rounded flex items-center justify-center shrink-0">
                <FaExclamationTriangle className="text-amber-600 text-xs" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  <span className="font-medium text-amber-700">{company.companyName || company.name || 'N/A'}</span>
                  {company.pocName && company.pocName !== 'N/A' && (
                    <>
                      <span className="text-amber-500">•</span>
                      <span className="text-amber-800">{company.pocName}</span>
                    </>
                  )}
                  {company.pocPhone && company.pocPhone !== 'N/A' && (
                    <>
                      <span className="text-amber-500">•</span>
                      <span className="text-amber-800">{company.pocPhone}</span>
                    </>
                  )}
                  {company.pocMail && company.pocMail !== 'N/A' && (
                    <>
                      <span className="text-amber-500">•</span>
                      <span className="text-amber-800 truncate">{company.pocMail}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side - Form */}
            <div className="lg:col-span-2 space-y-4">
              {/* M365 Connection */}
              {accounts.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg py-1 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white flex items-center justify-center">
                        <img src="https://cdn-icons-png.flaticon.com/512/732/732221.png" alt="Microsoft 365" className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-blue-900">Connect Microsoft 365</h3>
                        <p className="text-xs text-blue-700">Enable calendar integration for follow-ups</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectM365}
                      disabled={connecting}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {connecting ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <FaCalendarAlt size={10} />
                          <span>Connect</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <FaCheckCircle className="text-green-600 text-sm" />
                    <span className="text-xs text-green-800 font-medium">Connected to Microsoft 365</span>
                    <span className="text-xs text-green-600">({accounts[0].username})</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">
                      Time
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={toggleTimePicker}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-400 text-left flex items-center justify-between"
                      >
                        <span className="text-slate-900">{getFullTimeString()}</span>
                        <FaRegClock className="text-slate-400" />
                      </button>

                      {showTimePicker && (
                        <div
                          ref={timePickerRef}
                          className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl p-3"
                        >
                          <div className="grid grid-cols-3 gap-3 items-center">
                            <div className="text-center">
                              <label className="block text-xs font-medium text-slate-500 mb-1">Hours</label>
                              <div className="flex flex-col items-center space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => increment("hours")}
                                  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded flex items-center justify-center transition-colors duration-150"
                                >
                                  <FaChevronUp size={8} />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max="12"
                                  value={time.hours}
                                  onChange={(e) => handleTimeChange("hours", parseInt(e.target.value) || 1)}
                                  className="w-10 text-center bg-transparent border-none focus:ring-0 text-base font-semibold text-slate-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => decrement("hours")}
                                  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded flex items-center justify-center transition-colors duration-150"
                                >
                                  <FaChevronDown size={8} />
                                </button>
                              </div>
                            </div>

                            <div className="text-center">
                              <label className="block text-xs font-medium text-slate-500 mb-1">Minutes</label>
                              <div className="flex flex-col items-center space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => increment("minutes")}
                                  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded flex items-center justify-center transition-colors duration-150"
                                >
                                  <FaChevronUp size={8} />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={time.minutes}
                                  onChange={(e) => handleTimeChange("minutes", parseInt(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent border-none focus:ring-0 text-base font-semibold text-slate-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => decrement("minutes")}
                                  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded flex items-center justify-center transition-colors duration-150"
                                >
                                  <FaChevronDown size={8} />
                                </button>
                              </div>
                            </div>

                            <div className="text-center">
                              <label className="block text-xs font-medium text-slate-500 mb-1">AM/PM</label>
                              <button
                                type="button"
                                onClick={toggleAMPM}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded text-sm font-medium transition-all duration-200"
                              >
                                {time.ampm}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Template */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Template <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedTemplate(value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-400"
                    required
                  >
                    <option value="">Select a template</option>
                    {REMARKS_TEMPLATES.map((template) => (
                      <option key={template.value} value={template.value}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remarks */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Remarks
                  </label>
                  <div className="relative">
                    <textarea
                      value={remarks}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue.length <= 250) {
                          // Check for malicious input
                          if (detectMaliciousInput(newValue)) {
                            setMaliciousWarning("Warning: Malicious content detected. Please remove any scripts or potentially harmful content.");
                          } else {
                            setMaliciousWarning("");
                          }
                          setRemarks(newValue);
                        }
                      }}
                      placeholder="Add notes about this follow-up..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-400 resize-none"
                      rows={2}
                    />
                    {maliciousWarning && (
                      <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center">
                        <FaExclamationTriangle className="mr-1 text-red-500" size={10} />
                        {maliciousWarning}
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                      {remarks.length}/250
                    </div>
                  </div>
                </div>

                {/* Calendar Integration */}
                <div className="bg-linear-to-r from-blue-50 to-blue-100 border border-blue-200/50 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                        <FaCalendarAlt className="text-blue-600 text-xs" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">Calendar Integration</h4>
                        <p className="text-xs text-slate-600">Outlook calendar event will be created automatically</p>
                      </div>
                    </div>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendInvite}
                        onChange={(e) => setSendInvite(e.target.checked)}
                        className="w-3 h-3 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-xs font-medium text-slate-700">Send invite to client</span>
                    </label>
                  </div>
                  {sendInvite && (
                    <div className="mt-1 p-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                      Client will receive a meeting invitation email with all details
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || accounts.length === 0}
                    className="px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center font-medium"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Scheduling...
                      </>
                    ) : accounts.length === 0 ? (
                      <>
                        <FaCalendarAlt className="mr-2" />
                        Connect M365 to Schedule
                      </>
                    ) : (
                      <>
                        <FaCalendarAlt className="mr-2" />
                        Schedule Follow-up
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Side - Past Follow-ups */}
            <div className="lg:col-span-1">
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-lg p-3 h-fit">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center">
                    <FaHistory className="mr-2 text-slate-600" />
                    Past Follow-ups
                  </h3>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {pastFollowups.length}
                  </span>
                </div>

                {pastFollowups.length === 0 ? (
                  <div className="text-center py-6">
                    <FaHistory className="mx-auto text-slate-300 text-2xl mb-2" />
                    <p className="text-slate-500 text-sm">No past follow-ups yet</p>
                    <p className="text-slate-400 text-xs mt-1">Schedule your first follow-up to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {pastFollowups.map((followup, index) => (
                      <div
                        key={followup.key || index}
                        className="bg-white border border-slate-200 rounded p-3 hover:shadow-sm transition-all duration-200 hover:border-slate-300"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">
                                {getRelativeTime(`${followup.date} ${followup.time}`)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(followup.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {followup.time}
                          </span>
                        </div>

                        {followup.remarks && (
                          <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                            {followup.remarks}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            {followup.calendarEventCreated ? (
                              <FaCheckCircle className="text-green-500 text-xs" />
                            ) : (
                              <FaClock className="text-amber-500 text-xs" />
                            )}
                            <span className={`text-xs font-medium capitalize ${
                              followup.calendarEventCreated ? 'text-green-700' : 'text-amber-700'
                            }`}>
                              {followup.calendarEventCreated ? 'In Calendar' : 'Pending'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            {!followup.calendarEventCreated && (
                              <button
                                onClick={() => handleRetryCalendarEvent(followup)}
                                disabled={loading}
                                className="text-blue-500 hover:text-blue-700 disabled:text-blue-300 transition-colors duration-200 p-1 hover:bg-blue-50 disabled:hover:bg-transparent rounded"
                                title="Retry calendar event creation"
                              >
                                <FaRedo size={10} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setDeleteFollowupKey(followup.key);
                                setShowDeleteConfirm(true);
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors duration-200 p-1 hover:bg-red-50 rounded"
                              title="Delete follow-up"
                            >
                              <FaTrash size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-54 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200/50">
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                    <FaExclamationTriangle className="text-red-600 text-base" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Delete Follow-up</h3>
                    <p className="text-sm text-slate-600 mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-slate-700 mb-4 leading-relaxed">
                  Are you sure you want to permanently delete this follow-up? This action cannot be undone.
                </p>
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteFollowup(deleteFollowupKey)}
                    className="px-4 py-2 bg-linear-to-r from-red-600 to-red-700 text-white rounded-lg hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200 font-medium flex items-center justify-center"
                  >
                    <FaTrash className="mr-2" size={12} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Snackbar */}
        {snackbar && (
          <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border z-54 flex items-center space-x-3 ${
            snackbarType === "success" ? "bg-green-50 border-green-200 text-green-800" :
            snackbarType === "error" ? "bg-red-50 border-red-200 text-red-800" :
            snackbarType === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              snackbarType === "success" ? "bg-green-100" :
              snackbarType === "error" ? "bg-red-100" :
              snackbarType === "warning" ? "bg-amber-100" : "bg-blue-100"
            }`}>
              {snackbarType === "success" && <FaCheckCircle className="text-green-600 text-sm" />}
              {snackbarType === "error" && <FaTimesCircle className="text-red-600 text-sm" />}
              {snackbarType === "warning" && <FaExclamationTriangle className="text-amber-600 text-sm" />}
              {snackbarType === "info" && <FaInfoCircle className="text-blue-600 text-sm" />}
            </div>
            <span className="text-sm font-medium">{snackbar}</span>
          </div>
        )}

        {/* Calendar Warning */}
        {showCalendarWarning && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-54 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200/50">
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                    <FaExclamationTriangle className="text-amber-600 text-base" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Calendar Event Failed</h3>
                    <p className="text-sm text-slate-600 mt-0.5">Follow-up saved, calendar pending</p>
                  </div>
                </div>
                <p className="text-slate-700 mb-3 leading-relaxed">
                  The follow-up was saved successfully, but we couldn't create the calendar event.
                  {calendarError && calendarError.includes("MS365") ?
                    " Please connect your Microsoft 365 account to enable calendar integration." :
                    " Would you like to retry?"
                  }
                </p>
                {calendarError && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                    <p className="text-sm text-red-700 font-medium">Error Details:</p>
                    <p className="text-sm text-red-600 mt-1">{calendarError}</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => setShowCalendarWarning(false)}
                    className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 font-medium"
                  >
                    Skip for Now
                  </button>
                  <button
                    onClick={handleCalendarRetry}
                    disabled={isRetrying}
                    className="px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center font-medium"
                  >
                    {isRetrying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Retrying...
                      </>
                    ) : (
                      <>
                        <FaRedo className="mr-2" size={12} />
                        Retry
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowUpCompany;
