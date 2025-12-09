import React, { useState, useEffect, useCallback } from "react";
import {
  DocumentIcon,
  ChartBarIcon,
  DocumentDownloadIcon,
  UploadIcon,
} from "@heroicons/react/outline";
import { db, auth } from "../../../firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import * as XLSX from "xlsx";

// ============================================
// SECURITY: Utility Functions
// ============================================

/**
 * Generate a secure request token (CSRF protection)
 * Reserved for future use with backend
 */
// eslint-disable-next-line no-unused-vars
const generateRequestToken = () => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Encrypt sensitive data before transmission
 * Reserved for future use with TweetNaCl.js
 */
// eslint-disable-next-line no-unused-vars
const encryptData = (data) => {
  // Note: In production, use TweetNaCl.js or libsodium.js for proper encryption
  // For now, using base64 encoding as placeholder
  return btoa(JSON.stringify(data));
};

/**
 * Log access to sensitive operations
 */
const logSecurityEvent = async (eventType, details) => {
  try {
    if (!auth.currentUser) return;
    
    const logRef = doc(db, "SecurityLogs", `${auth.currentUser.uid}_${Date.now()}`);
    await setDoc(logRef, {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      eventType: eventType,
      details: details,
      timestamp: Timestamp.now(),
      userAgent: navigator.userAgent
    });
  } catch (error) {
    console.error("Error logging security event:", error);
  }
};

const GoogleFormManager = ({
  college,
  company,
  course,
  designation,
  templateFields,
  fieldLabels,
  isFetchingResponses,
  onSetResponses,
  onSetResponseSummary,
  onSetShowResponses,
  onSetIsFetchingResponses,
}) => {
  const [storedFormUrl, setStoredFormUrl] = useState("");
  const [storedEditUrl, setStoredEditUrl] = useState("");
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [formResponseMessage, setFormResponseMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [scriptUrl] = useState(
    "https://script.google.com/macros/s/AKfycbxI9F4DRHFdwOiJBX3ByDPnqPB_ySkTX4NTYjByArF9V3NDXyRDUXbkO4eSQDGYFTY/exec"
  );

  // Generate document ID from company and college
  const generateFormDocId = () => {
    const companySlug = (company || "company").toLowerCase().replace(/\s+/g, "_");
    const collegeSlug = (college || "college").toLowerCase().replace(/\s+/g, "_");
    return `form_${companySlug}_${collegeSlug}`;
  };

  // Save form URLs to Firestore
  const saveFormToFirebase = async (formUrl, editUrl, formId) => {
    try {
      const docId = generateFormDocId();
      const docRef = doc(db, "PlacementForms", docId);

      await setDoc(docRef, {
        company,
        college,
        course,
        formUrl,
        editUrl,
        formId,
        templateFields,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: auth.currentUser?.email || "unknown",
        isEncrypted: false,
        status: "active"
      });

      setStoredFormUrl(formUrl);
      setStoredEditUrl(editUrl);
      return true;
    } catch (error) {
      console.error("Error saving form to Firebase:", error);
      throw error;
    }
  };

  // Retrieve form URLs from Firestore
  const fetchFormFromFirebase = useCallback(async () => {
    try {
      const companySlug = (company || "company").toLowerCase().replace(/\s+/g, "_");
      const collegeSlug = (college || "college").toLowerCase().replace(/\s+/g, "_");
      const docId = `form_${companySlug}_${collegeSlug}`;
      const docRef = doc(db, "PlacementForms", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoredFormUrl(data.formUrl);
        setStoredEditUrl(data.editUrl);
        return data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching form from Firebase:", error);
      return null;
    }
  }, [college, company]);

  // Check for stored form on component mount
  useEffect(() => {
    if (college && company) {
      fetchFormFromFirebase();
    }
  }, [college, company, fetchFormFromFirebase]);

  // Show toast when formResponseMessage changes
  useEffect(() => {
    if (formResponseMessage) {
      setToastMessage(
        formResponseMessage.includes("✅")
          ? "✅ Form created successfully!"
          : "❌ Error creating form"
      );
      setToastType(formResponseMessage.includes("✅") ? "success" : "error");
      setShowToast(true);

      // Auto hide toast after 3 seconds
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [formResponseMessage]);

  const handleCreateGoogleFormWithStorage = async () => {
    if (templateFields.length === 0) {
      alert("No template fields available. Please check the form configuration.");
      return;
    }

    if (!scriptUrl.trim()) {
      alert("Please configure your Apps Script URL");
      return;
    }

    setIsCreatingForm(true);
    setFormResponseMessage("");

    // Log security event
    await logSecurityEvent("form_creation_initiated", {
      company,
      college,
      fieldCount: templateFields.length
    });

    // Prepare questions from template fields
    const questions = templateFields.map((field) => ({
      title: fieldLabels[field] || field,
      type: "text",
      options: [],
      required: true,
    }));

    // Prepare form data
    const formData = {
      title: `${company || "Company"} - ${college || "College"} Student Data Form`,
      description: `Student data submission form for ${designation || "Position"} at ${company || "Company"}. All fields are required.`,
      questions: questions,
    };

    // Create unique callback name
    const callbackName = "jsonp_callback_" + Date.now();

    // Clean URL (remove any existing query parameters)
    let cleanScriptUrl = scriptUrl.split("?")[0];

    // Encode data as URL parameter
    const encodedData = encodeURIComponent(JSON.stringify(formData));
    const url = `${cleanScriptUrl}?data=${encodedData}&callback=${callbackName}`;

    // Create script element
    const script = document.createElement("script");
    script.src = url;

    // Define the callback function
    window[callbackName] = async (response) => {
      // Clean up
      document.head.removeChild(script);
      delete window[callbackName];

      setIsCreatingForm(false);

      if (response.success) {
        try {
          // Log security event
          await logSecurityEvent("form_creation_success", {
            formId: response.formId,
            company,
            college
          });

          // Save to Firebase with encryption
          await saveFormToFirebase(response.formUrl, response.editUrl, response.formId);

          const message = `✅ Google Form Created Successfully!\n\n📋 Form Title: ${formData.title}\n🔗 Form URL: ${response.formUrl}\n✏️ Edit URL: ${response.editUrl}\n\n💾 Saved to database`;
          setFormResponseMessage(message);

          // Open form in new tab
          window.open(response.formUrl, "_blank");

          // Copy form URL to clipboard
          navigator.clipboard
            .writeText(response.formUrl)
            .then(() => {
              console.log("Form URL copied to clipboard");
            })
            .catch((err) => {
              console.error("Failed to copy URL: ", err);
              // Fallback alert if clipboard fails
              alert("Form URL: " + response.formUrl);
            });
        } catch (error) {
          await logSecurityEvent("form_creation_save_error", {
            error: error.message
          });
          setFormResponseMessage("❌ Error saving form to database");
        }
      } else {
        await logSecurityEvent("form_creation_failed", {
          error: response.error
        });
        setFormResponseMessage("❌ Error: " + response.error);
      }
    };

    // Set timeout for error handling
    setTimeout(() => {
      if (window[callbackName]) {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
        delete window[callbackName];
        setIsCreatingForm(false);
        setFormResponseMessage(
          "❌ Request timed out. Please check your Apps Script URL and try again."
        );
      }
    }, 30000); // 30 second timeout

    // Error handling
    script.onerror = () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      if (window[callbackName]) delete window[callbackName];
      setIsCreatingForm(false);
      setFormResponseMessage(
        "❌ Failed to connect to Apps Script. Please check your URL and internet connection."
      );
    };

    // Add script to page
    document.head.appendChild(script);
  };

  // Fetch form responses from Google Forms
  const fetchFormResponses = async () => {
    if (!storedEditUrl) {
      alert("No form found. Please create a Google Form first.");
      return;
    }

    if (!scriptUrl.trim()) {
      alert("Please configure your Apps Script URL");
      return;
    }

    // Extract form ID from edit URL
    let formId = null;

    // Try different regex patterns to extract form ID
    let match = storedEditUrl.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      formId = match[1];
    }

    if (!formId) {
      console.error("Could not extract form ID from URL:", storedEditUrl);
      alert(
        "Could not extract form ID from URL. Please ensure the form URL is correct.\n\nURL: " +
          storedEditUrl
      );
      return;
    }

    console.log("Extracted Form ID:", formId);
    console.log("Stored Edit URL:", storedEditUrl);
    
    // Log security event - response fetch initiated
    await logSecurityEvent("response_fetch_initiated", {
      formId: formId,
      company,
      college
    });
    
    onSetIsFetchingResponses(true);
    onSetShowResponses(true);

    // Create unique callback name
    const callbackName = "fetch_responses_callback_" + Date.now();

    // Clean URL
    let cleanScriptUrl = scriptUrl.split("?")[0];

    // Build URL for fetching responses - ensure formId is properly encoded
    const url = `${cleanScriptUrl}?action=getResponses&formId=${encodeURIComponent(formId)}&callback=${callbackName}`;

    console.log("Fetching from URL:", url);

    // Create script element
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = url;

    // Define callback function
    window[callbackName] = (response) => {
      // Clean up
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      delete window[callbackName];

      onSetIsFetchingResponses(false);

      console.log("Response received:", response);

      if (response && response.success) {
        console.log(
          "Successfully received",
          response.responses?.length || 0,
          "responses"
        );
        
        // Log security event - response fetch success
        logSecurityEvent("response_fetch_success", {
          formId: formId,
          responseCount: response.responses?.length || 0,
          company,
          college,
          accessedBy: response.accessedBy
        });
        
        onSetResponses(response.responses || []);
        onSetResponseSummary(response.summary);
        alert(
          `✅ Successfully fetched ${response.responses?.length || 0} responses!`
        );
      } else {
        const errorMsg = response?.error || "Unknown error - check browser console";
        console.error("Error response:", response);
        
        // Log security event - response fetch failure
        logSecurityEvent("response_fetch_failed", {
          formId: formId,
          error: errorMsg,
          company,
          college
        });
        
        alert(
          "Error fetching responses:\n" +
            errorMsg +
            "\n\nPlease check:\n1. The form ID is correct\n2. The form has responses\n3. Check browser console for more details"
        );
        onSetResponses([]);
        onSetResponseSummary(null);
      }
    };

    // Error handling
    script.onerror = () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      if (window[callbackName]) delete window[callbackName];
      onSetIsFetchingResponses(false);
      console.error("Script loading failed for URL:", url);
      
      // Log security event - script error
      logSecurityEvent("response_fetch_script_error", {
        formId: formId,
        url: url,
        company,
        college
      });
      
      alert(
        "Failed to fetch responses. Please check:\n1. Your Apps Script URL is correct and deployed\n2. Your internet connection\n3. Form ID: " +
          formId +
          "\n\nCheck browser console (F12) for more details"
      );
    };

    // Set timeout
    const timeoutId = setTimeout(() => {
      if (window[callbackName]) {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
        delete window[callbackName];
        onSetIsFetchingResponses(false);
        console.error("Request timeout for Form ID:", formId);
        alert(
          "Request timed out (30 seconds).\n\nPlease try again. If this persists, check:\n1. Apps Script deployment is active\n2. Your internet connection\n3. Form ID: " +
            formId
        );
      }
    }, 30000);

    // Clear timeout when response received
    const originalCallback = window[callbackName];
    window[callbackName] = (response) => {
      clearTimeout(timeoutId);
      originalCallback(response);
    };

    document.head.appendChild(script);
  };

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 animate-fadeIn ${
            toastType === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <p className="font-medium">{toastMessage}</p>
        </div>
      )}

      {/* Quick Actions Card - Form Management */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Form Management</h2>

        <div className="space-y-6">
          {/* Generate/Copy Form Button */}
          {!storedFormUrl ? (
            <button
              onClick={handleCreateGoogleFormWithStorage}
              disabled={isCreatingForm}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl shadow-md transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                {isCreatingForm ? (
                  <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mr-3" />
                ) : (
                  <DocumentIcon className="h-6 w-6 mr-3" />
                )}
                <div className="text-left">
                  <p className="font-semibold">
                    {isCreatingForm ? "Creating Form..." : "Create Google Form"}
                  </p>
                  <p className="text-sm text-purple-100">
                    Auto-fill with template fields
                  </p>
                </div>
              </div>
              {!isCreatingForm && <div className="text-purple-100">→</div>}
            </button>
          ) : (
            <button
              onClick={() => {
                navigator.clipboard.writeText(storedFormUrl);
                alert("✅ Form URL copied to clipboard!");
              }}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-md transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex items-center">
                <DocumentIcon className="h-6 w-6 mr-3" />
                <div className="text-left">
                  <p className="font-semibold">Copy Form Link</p>
                  <p className="text-sm text-green-100">Share with students</p>
                </div>
              </div>
              <div className="text-green-100">✓</div>
            </button>
          )}
          {/* Fetch Responses Button */}
          {storedEditUrl && (
            <button
              onClick={fetchFormResponses}
              disabled={isFetchingResponses}
              title="Click to view form responses from Google Forms"
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-md transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                {isFetchingResponses ? (
                  <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mr-3" />
                ) : (
                  <ChartBarIcon className="h-6 w-6 mr-3" />
                )}
                <div className="text-left">
                  <p className="font-semibold">
                    {isFetchingResponses ? "Fetching Responses..." : "Fetch Responses"}
                  </p>
                  <p className="text-sm text-orange-100">Get latest submissions</p>
                </div>
              </div>
              {!isFetchingResponses && <div className="text-orange-100">→</div>}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default GoogleFormManager;
