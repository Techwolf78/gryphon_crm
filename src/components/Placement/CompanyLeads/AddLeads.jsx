import React, { useState, useEffect } from "react";
import { auth, db } from "../../../firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  limit, 
  getDocs, 
  doc, 
  setDoc,
  orderBy
} from "firebase/firestore";
import { XIcon } from "@heroicons/react/outline";

const statusOptions = [
  "Hot",
  "Warm",
  "Cold",
  "Called",
  "Onboarded",
];

function AddLeads({ show, onClose, onAddLead }) {
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [pocName, setPocName] = useState("");
  const [workingSince, setWorkingSince] = useState("");
  const [pocLocation, setPocLocation] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [pocLandline, setPocLandline] = useState("");
  const [pocMail, setPocMail] = useState("");
  const [pocDesignation, setPocDesignation] = useState("");
  const [pocLinkedin, setPocLinkedin] = useState("");
  const [status, setStatus] = useState("Warm");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Designation options for consistency
  const designationOptions = [
    "CEO/Founder", "CTO/Technical Head", "HR Manager", "Recruitment Manager",
    "Talent Acquisition Lead", "Business Development Manager", "Sales Manager",
    "Operations Manager", "Project Manager", "Team Lead", "Senior Developer",
    "Developer", "Intern", "Other"
  ];

  // State for custom "Other" inputs
  const [customIndustry, setCustomIndustry] = useState("");
  const [customDesignation, setCustomDesignation] = useState("");

  // Validate custom fields when dropdown selection changes
  useEffect(() => {
    if (sector === "Other") {
      validateField("customIndustry", customIndustry);
    } else {
      // Clear custom industry error when not "Other"
      setValidationErrors(prev => ({ ...prev, customIndustry: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  useEffect(() => {
    if (pocDesignation === "Other") {
      validateField("customDesignation", customDesignation);
    } else {
      // Clear custom designation error when not "Other"
      setValidationErrors(prev => ({ ...prev, customDesignation: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pocDesignation]);

  // Check for duplicates when email or phone changes
  useEffect(() => {
    const checkForDuplicates = async () => {
      if (pocMail.trim() || pocPhone.trim()) {
        const duplicateCheck = await checkDuplicateContact(pocMail.trim(), pocPhone.trim());
        setDuplicateWarning(duplicateCheck.isDuplicate ? duplicateCheck : null);
      } else {
        setDuplicateWarning(null);
      }
    };
    
    // Debounce the duplicate check
    const timeoutId = setTimeout(checkForDuplicates, 500);
    return () => clearTimeout(timeoutId);
  }, [pocMail, pocPhone]);
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Allow international formats with + and numbers, spaces, hyphens, parentheses
    const phoneRegex = /^[+]?[1-9][\d\s\-()]{8,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateLandline = (landline) => {
    if (!landline) return true; // Optional field
    // Allow formats like: 022-12345678, (022) 12345678, 022 12345678, +91-22-12345678
    const landlineRegex = /^[+]?[\d\s\-()]{6,}$/;
    return landlineRegex.test(landline.replace(/\s/g, ''));
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

  // Industry options for consistency
  const industryOptions = [
    "IT Services", "Software Development", "Consulting", "Manufacturing", 
    "Healthcare", "Education", "Finance", "Retail", "Real Estate", 
    "Construction", "Automotive", "Telecommunications", "Energy", 
    "Transportation", "Agriculture", "Media & Entertainment", "Other"
  ];

  // Update all state setters to track changes and validation
  const updateField = (setter, value, fieldName) => {
    setHasUnsavedChanges(true);
    setter(value);
    
    // Mark field as touched
    if (fieldName) {
      setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    }
    
    // Real-time validation
    if (fieldName) {
      validateField(fieldName, value);
    }
  };

  // Real-time field validation
  const validateField = (fieldName, value) => {
    let error = "";
    
    switch (fieldName) {
      case "companyName":
        if (!value.trim()) error = "Company name is required";
        break;
      case "sector":
        if (!value.trim()) {
          error = "Industry is required";
        } else if (value === "Other" && !customIndustry.trim()) {
          error = "Please specify the industry";
        }
        break;
      case "employeeCount":
        // Company size is now optional, but if provided, validate the range
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
        // Working since is now optional
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
      case "pocLandline":
        if (value && !validateLandline(value)) {
          error = "Please enter a valid landline number";
        }
        break;
      case "pocMail":
        if (value && !validateEmail(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "customIndustry":
        if (sector === "Other" && !value.trim()) {
          error = "Please specify the industry";
        }
        // Clear the sector error when custom industry is filled
        if (sector === "Other" && value.trim()) {
          setValidationErrors(prev => ({ ...prev, sector: "" }));
        }
        break;
      case "customDesignation":
        if (pocDesignation === "Other" && !value.trim()) {
          error = "Please specify the designation";
        }
        // Clear the pocDesignation error when custom designation is filled
        if (pocDesignation === "Other" && value.trim()) {
          setValidationErrors(prev => ({ ...prev, pocDesignation: "" }));
        }
        break;
      case "pocLinkedin":
        if (value && !validateLinkedIn(value)) {
          error = "Please enter a valid LinkedIn URL";
        }
        break;
      default:
        break;
    }
    
    setValidationErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleClose = () => {
    if (
      hasUnsavedChanges &&
      !window.confirm("You have unsaved changes. Are you sure you want to close?")
    ) {
      return;
    }
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setCompanyName("");
    setSector("");
    setEmployeeCount("");
    setCompanyWebsite("");
    setPocName("");
    setWorkingSince("");
    setPocLocation("");
    setPocPhone("");
    setPocLandline("");
    setPocMail("");
    setPocDesignation("");
    setPocLinkedin("");
    setStatus("Warm");
    setHasUnsavedChanges(false);
    setValidationErrors({});
    setTouchedFields({});
    setCustomIndustry("");
    setCustomDesignation("");
    setDuplicateWarning(null);
  };

  const handleAddCompany = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a company.");
      return;
    }

    if (!isFormValid) {
      alert("Please fill all required fields and correct validation errors");
      return;
    }

    // If there's a duplicate warning, ask for confirmation
    if (duplicateWarning) {
      const proceed = window.confirm(duplicateWarning.message);
      if (!proceed) {
        return; // User chose not to proceed
      }
    }

    // Convert to the format expected by the batch system
    const finalIndustry = sector === "Other" ? customIndustry.trim() : sector;
    const finalDesignation = pocDesignation === "Other" ? customDesignation.trim() : pocDesignation;
    
    const companyData = {
      name: companyName,
      contactPerson: pocName,
      designation: finalDesignation,
      phone: pocPhone,
      landline: pocLandline,
      companyUrl: companyWebsite,
      linkedinUrl: pocLinkedin,
      email: pocMail,
      location: pocLocation,
      industry: finalIndustry,
      companySize: employeeCount,
      source: "Manual Add",
      notes: "",
      status: status.toLowerCase() || "warm",
      contacts: [],
      assignedTo: user?.uid || null, // Assign to current user
      assignedBy: user?.uid || null,
      assignedAt: serverTimestamp(),
    };

    // Add status-specific timestamp when company is created
    const currentTimestamp = new Date().toISOString();
    const statusLower = status.toLowerCase();
    if (statusLower === "hot") {
      companyData.hotAt = currentTimestamp;
    } else if (statusLower === "warm") {
      companyData.warmAt = currentTimestamp;
    } else if (statusLower === "cold") {
      companyData.coldAt = currentTimestamp;
    } else if (statusLower === "called") {
      companyData.calledAt = currentTimestamp;
    } else if (statusLower === "onboarded") {
      companyData.onboardedAt = currentTimestamp;
    }

    try {
      // Improved batching strategy with dynamic sizing
      const getOptimalBatchSize = (totalCompanies) => {
        if (totalCompanies < 100) return 5;      // Small scale
        if (totalCompanies < 1000) return 10;    // Medium scale  
        if (totalCompanies < 10000) return 25;   // Large scale
        return 50;                               // Enterprise scale
      };

      // Get total count of companies for dynamic batch sizing
      const totalCompaniesQuery = query(collection(db, "companyleads"));
      const totalSnapshot = await getDocs(totalCompaniesQuery);
      let totalCompanies = 0;
      totalSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.companies && Array.isArray(data.companies)) {
          totalCompanies += data.companies.length;
        }
      });

      const MAX_BATCH_SIZE = getOptimalBatchSize(totalCompanies);
      
      // Query for existing batches that aren't full
      const batchesQuery = query(
        collection(db, "companyleads"),
        where("batchSize", "<", MAX_BATCH_SIZE),
        orderBy("batchSize", "desc"), // Prefer fuller batches for better distribution
        limit(3) // Get a few options
      );
      
      const existingBatches = await getDocs(batchesQuery);
      let batchDocRef;
      let batchData;
      
      if (!existingBatches.empty) {
        // Add to the fullest available batch for optimal space usage
        const existingBatch = existingBatches.docs[0];
        batchDocRef = doc(db, "companyleads", existingBatch.id);
        batchData = existingBatch.data();
        
        // Add new company to existing batch
        batchData.companies.push(btoa(encodeURIComponent(JSON.stringify(companyData))));
        batchData.batchSize += 1;
        batchData.uploadedAt = serverTimestamp();
        
        await setDoc(batchDocRef, batchData);
        console.log(`✅ Added to existing batch: ${existingBatch.id} (now ${batchData.batchSize}/${MAX_BATCH_SIZE} companies)`);
      } else {
        // Create new batch
        batchData = {
          companies: [btoa(encodeURIComponent(JSON.stringify(companyData)))],
          uploadedBy: user.uid,
          uploadedAt: serverTimestamp(),
          batchSize: 1,
          source: "manual_add"
        };
        
        batchDocRef = await addDoc(collection(db, "companyleads"), batchData);
        console.log(`✅ Created new batch: ${batchDocRef.id} (1/${MAX_BATCH_SIZE} companies)`);
      }

      // Create the lead object for local state update
      const newLead = {
        id: `${batchDocRef.id}_${batchData.companies.length - 1}`, // Index of the new company
        batchId: batchDocRef.id,
        ...companyData,
        // Map fields for UI compatibility
        companyName: companyData.name,
        pocName: companyData.contactPerson,
        pocDesignation: companyData.designation,
        pocPhone: companyData.phone,
        pocLandline: companyData.landline,
        companyUrl: companyData.companyUrl,
        companyWebsite: companyData.companyUrl,
        linkedinUrl: companyData.linkedinUrl,
        pocLinkedin: companyData.linkedinUrl,
        pocMail: companyData.email || '',
        pocLocation: companyData.location || '',
        industry: companyData.industry,
        companySize: companyData.companySize,
        source: companyData.source,
        notes: companyData.notes,
        status: companyData.status,
        assignedTo: companyData.assignedTo,
        assignedBy: companyData.assignedBy,
        assignedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contacts: [],
        // Include status-specific timestamps
        hotAt: companyData.hotAt,
        warmAt: companyData.warmAt,
        coldAt: companyData.coldAt,
        calledAt: companyData.calledAt,
        onboardedAt: companyData.onboardedAt,
      };

      if (onAddLead) {
        onAddLead(newLead);
      }
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error adding company:", error);
      alert("Failed to add company. Please try again.");
    }
  };

  // Check for duplicate contacts (same email AND phone)
  const checkDuplicateContact = async (pocEmail, pocPhone) => {
    try {
      // Only check if both email and phone are provided
      if (!pocEmail?.trim() || !pocPhone?.trim()) {
        return { isDuplicate: false };
      }

      // Get all company batches (limit to recent batches for performance)
      const batchesQuery = query(
        collection(db, "companyleads"),
        orderBy("uploadedAt", "desc"),
        limit(10) // Only check the 10 most recent batches
      );
      const batchesSnapshot = await getDocs(batchesQuery);

      for (const batchDoc of batchesSnapshot.docs) {
        const batchData = batchDoc.data();

        if (batchData.companies && Array.isArray(batchData.companies)) {
          for (const encodedCompany of batchData.companies) {
            try {
              // Skip if encodedCompany is not a string or is empty
              if (typeof encodedCompany !== 'string' || !encodedCompany.trim()) {
                continue;
              }

              // Decode the base64 company data with better error handling
              let decodedCompany;
              try {
                const uriDecoded = atob(encodedCompany);
                const jsonString = decodeURIComponent(uriDecoded);
                decodedCompany = JSON.parse(jsonString);
              } catch (decodeError) {
                // If decoding fails, try direct JSON parse (for legacy data)
                try {
                  decodedCompany = JSON.parse(encodedCompany);
                } catch {
                  console.warn("Skipping corrupted company data in batch:", batchDoc.id, decodeError);
                  continue; // Skip this corrupted entry
                }
              }

              // Ensure decodedCompany is an object
              if (!decodedCompany || typeof decodedCompany !== 'object') {
                continue;
              }

              // Check for duplicate email AND phone (both must match)
              const existingEmail = decodedCompany.email || decodedCompany.pocMail || '';
              const existingPhone = decodedCompany.phone || decodedCompany.pocPhone || '';

              const emailMatch = existingEmail.trim().toLowerCase() === pocEmail.trim().toLowerCase();
              const phoneMatch = existingPhone.trim() === pocPhone.trim();

              if (emailMatch && phoneMatch) {
                const companyName = decodedCompany.name || decodedCompany.companyName || 'Unknown Company';
                return {
                  isDuplicate: true,
                  message: `A contact with the same email "${pocEmail}" and phone number "${pocPhone}" already exists in company "${companyName}". Do you want to add this entry anyway?`,
                  duplicateType: 'both',
                  existingCompany: companyName
                };
              }
            } catch (decodeError) {
              console.warn("Error decoding company data:", decodeError);
              // Continue checking other companies
            }
          }
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      return { isDuplicate: false }; // Allow submission if check fails
    }
  };

  const isFormValid = 
    companyName.trim() && 
    sector.trim() &&
    pocName.trim() && 
    pocLocation.trim() && 
    pocPhone.trim() &&
    pocDesignation.trim() &&
    Object.values(validationErrors).every(error => !error) &&
    !duplicateWarning;

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-54 bg-gray-900/60 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-white/20"
           style={{
             boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)'
           }}>
        {/* Header */}
        <div className={`px-4 py-2 ${duplicateWarning ? 'bg-linear-to-r from-red-500 to-red-600' : 'bg-linear-to-r from-blue-500 to-blue-600'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white tracking-tight">Add New Company</h2>
                {duplicateWarning && (
                  <div className="mt-0.5 text-xs text-red-100 opacity-90">
                    ⚠️ Duplicate contact found
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 backdrop-blur-sm"
            >
              <XIcon className="h-3 w-3 text-white" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-3 overflow-y-auto max-h-[calc(100vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Company Information Section */}
            <div className="md:col-span-2">
              <div className="bg-gray-50/50 rounded-lg p-2 border border-gray-100/50 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-xs">Company Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => updateField(setCompanyName, e.target.value, "companyName")}
                      placeholder="e.g. Acme Corporation"
                      className={`w-full px-2 py-1.5 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 shadow-sm ${
                        validationErrors.companyName && touchedFields.companyName ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                      required
                    />
                    {validationErrors.companyName && touchedFields.companyName && (
                      <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.companyName}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      Industry <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={sector}
                      onChange={(e) => updateField(setSector, e.target.value, "sector")}
                      className={`w-full px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 shadow-sm ${
                        validationErrors.sector && touchedFields.sector ? 'border-red-400 bg-red-50' : 'border-gray-200'
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
                    {sector === "Other" && (
                      <input
                        type="text"
                        value={customIndustry}
                        onChange={(e) => updateField(setCustomIndustry, e.target.value, "customIndustry")}
                        onFocus={() => {
                          validateField("customIndustry", customIndustry);
                          setTouchedFields(prev => ({ ...prev, customIndustry: true }));
                        }}
                        placeholder="Please specify the industry"
                        className={`w-full mt-1.5 px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 shadow-sm ${
                          validationErrors.customIndustry && touchedFields.customIndustry ? 'border-red-400 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                    )}
                    {validationErrors.customIndustry && touchedFields.customIndustry && (
                      <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.customIndustry}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      Company Size
                    </label>
                    <input
                      type="number"
                      value={employeeCount}
                      onChange={(e) => updateField(setEmployeeCount, e.target.value, "employeeCount")}
                      placeholder="e.g. 250"
                      className={`w-full px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 shadow-sm ${
                        validationErrors.employeeCount && touchedFields.employeeCount ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {validationErrors.employeeCount && touchedFields.employeeCount && (
                      <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.employeeCount}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      Company Website
                    </label>
                    <input
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => updateField(setCompanyWebsite, e.target.value, "companyWebsite")}
                      placeholder="e.g. https://company.com"
                      className={`w-full px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 shadow-sm ${
                        validationErrors.companyWebsite && touchedFields.companyWebsite ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {validationErrors.companyWebsite && touchedFields.companyWebsite && (
                      <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.companyWebsite}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Person Section */}
            <div className="md:col-span-2">
              <div className="bg-gray-50/50 rounded-lg p-2 border border-gray-100/50 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-xs">Contact Person</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      POC Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pocName}
                      onChange={(e) => updateField(setPocName, e.target.value, "pocName")}
                      placeholder="e.g. John Doe"
                      className={`w-full px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 shadow-sm ${
                        validationErrors.pocName && touchedFields.pocName ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                      required
                    />
                    {validationErrors.pocName && touchedFields.pocName && (
                      <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.pocName}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      POC Designation <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={pocDesignation}
                      onChange={(e) => updateField(setPocDesignation, e.target.value, "pocDesignation")}
                      className={`w-full px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 shadow-sm ${
                        validationErrors.pocDesignation && touchedFields.pocDesignation ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                      required
                    >
                      <option value="">Select Designation</option>
                      {designationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {pocDesignation === "Other" && (
                      <input
                        type="text"
                        value={customDesignation}
                        onChange={(e) => updateField(setCustomDesignation, e.target.value, "customDesignation")}
                        onFocus={() => {
                          validateField("customDesignation", customDesignation);
                          setTouchedFields(prev => ({ ...prev, customDesignation: true }));
                        }}
                        placeholder="Please specify the designation"
                        className={`w-full mt-1.5 px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 shadow-sm ${
                          validationErrors.customDesignation && touchedFields.customDesignation ? 'border-red-400 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                    )}
                    {validationErrors.customDesignation && touchedFields.customDesignation && (
                      <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.customDesignation}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      POC Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pocPhone}
                      onChange={(e) => updateField(setPocPhone, e.target.value, "pocPhone")}
                      placeholder="e.g. +91 9876543210"
                      className={`w-full px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 shadow-sm ${
                        validationErrors.pocPhone && touchedFields.pocPhone ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                      required
                    />
                    {validationErrors.pocPhone && touchedFields.pocPhone && (
                      <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.pocPhone}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      POC Landline
                    </label>
                    <input
                      type="text"
                      value={pocLandline}
                      onChange={(e) => updateField(setPocLandline, e.target.value, "pocLandline")}
                      placeholder="e.g. 022-12345678"
                      className={`w-full px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 shadow-sm ${
                        validationErrors.pocLandline && touchedFields.pocLandline ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {validationErrors.pocLandline && touchedFields.pocLandline && (
                      <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.pocLandline}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      POC Mail
                    </label>
                    <input
                      type="email"
                      value={pocMail}
                      onChange={(e) => updateField(setPocMail, e.target.value, "pocMail")}
                      placeholder="e.g. john@company.com"
                      className={`w-full px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 shadow-sm ${
                        validationErrors.pocMail && touchedFields.pocMail ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {validationErrors.pocMail && touchedFields.pocMail && (
                      <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.pocMail}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      POC Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pocLocation}
                      onChange={(e) => updateField(setPocLocation, e.target.value, "pocLocation")}
                      placeholder="e.g. Mumbai"
                      className={`w-full px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 shadow-sm ${
                        validationErrors.pocLocation && touchedFields.pocLocation ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                      required
                    />
                    {validationErrors.pocLocation && touchedFields.pocLocation && (
                      <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.pocLocation}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      POC LinkedIn
                    </label>
                    <input
                      type="url"
                      value={pocLinkedin}
                      onChange={(e) => updateField(setPocLinkedin, e.target.value, "pocLinkedin")}
                      placeholder="e.g. https://linkedin.com/in/johndoe"
                      className={`w-full px-2.5 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 shadow-sm ${
                        validationErrors.pocLinkedin && touchedFields.pocLinkedin ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {validationErrors.pocLinkedin && touchedFields.pocLinkedin && (
                      <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.pocLinkedin}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="md:col-span-2">
              <div className="bg-gray-50/50 rounded-lg p-2 border border-gray-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-xs">Additional Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      Working Since
                    </label>
                    <input
                      type="date"
                      value={workingSince}
                      onChange={(e) => updateField(setWorkingSince, e.target.value, "workingSince")}
                      className="w-full px-2.5 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => updateField(setStatus, e.target.value)}
                      className="w-full px-2.5 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 shadow-sm"
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
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50/80 px-4 py-2 border-t border-gray-100/50">
          <div className="flex justify-end gap-2">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCompany}
              disabled={!isFormValid}
              className={`px-4 py-1.5 text-sm font-semibold text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-lg transform hover:scale-[1.02] ${
                !isFormValid
                  ? duplicateWarning
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-gray-400 cursor-not-allowed"
                  : "bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              }`}
            >
              Add Company
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddLeads;