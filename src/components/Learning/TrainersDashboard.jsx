import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, orderBy, where, deleteDoc, doc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db } from "../../firebase";
import AddTrainer from "./AddTrainer.jsx";
import EditTrainer from "./EditTrainer.jsx";
import DeleteTrainer from "./DeleteTrainer.jsx";
import TrainerLeadDetails from "./TrainerLeadDetails.jsx";
import { FiPlusCircle, FiEdit, FiTrash2, FiChevronLeft, FiCheck, FiX, FiBell, FiFilter, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import TrainersDashboardTour from "../tours/TrainersDashboardTour";
import SendRequestModal from './SendRequestModal';
import { useAuth } from "../../context/AuthContext";

const DOMAIN_COLORS = {
  Technical: "bg-blue-100 border border-blue-300 text-blue-800",
  "Soft skills": "bg-green-100 border border-green-300 text-green-800",
  Aptitude: "bg-purple-100 border border-purple-300 text-purple-800",
  Tools: "bg-yellow-100 border border-yellow-300 text-yellow-800",
};

function TrainersDashboard() {
  const [trainers, setTrainers] = useState([]);
  // Load ALL trainers once (dataset < 500) then operate purely client-side
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddTrainer, setShowAddTrainer] = useState(false);
  const [showEditTrainer, setShowEditTrainer] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [showDeleteTrainer, setShowDeleteTrainer] = useState(false);
  const [trainerToDelete, setTrainerToDelete] = useState(null);
  const [showTrainerDetails, setShowTrainerDetails] = useState(false);
  const [trainerDetailsData, setTrainerDetailsData] = useState(null);

  const [showSendRequest, setShowSendRequest] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [deleteRequests, setDeleteRequests] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedPaymentType, setSelectedPaymentType] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [showDomainSection, setShowDomainSection] = useState(false);
  const [showPaymentSection, setShowPaymentSection] = useState(false);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const didInitRef = useRef(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const { user } = useAuth();
  const isPrivileged = ["director", "head"].includes(user?.role?.toLowerCase());
  useEffect(() => {
    const loadAll = async () => {
      try {
        setError(null);
        const q = query(collection(db, "trainers"), orderBy("trainerId"));
        const snapshot = await getDocs(q);
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTrainers(all);
      } catch (err) {
        console.error("Fetch trainers failed:", err);
        setError("Failed to fetch trainers. Try again.");
      } finally {
        setInitialLoading(false);
      }
    };
    if (!didInitRef.current) {
      didInitRef.current = true;
      // Initialize search term from URL or localStorage
      const urlQ = searchParams.get("q");
      if (urlQ !== null) {
        setSearchTerm(urlQ);
      } else {
        const stored = localStorage.getItem("trainersSearch") || "";
        if (stored) setSearchTerm(stored);
      }
      loadAll();
    }
  }, [searchParams]);

  // Persist search term to URL & localStorage
  useEffect(() => {
    // Avoid unnecessary URL updates
    const currentQ = searchParams.get("q") || "";
    if (searchTerm) {
      if (currentQ !== searchTerm) setSearchParams({ q: searchTerm });
    } else if (currentQ) {
      setSearchParams({});
    }
    localStorage.setItem("trainersSearch", searchTerm || "");
  }, [searchTerm, searchParams, setSearchParams]);
  // No remote searching; purely client-side filter now.

  useEffect(() => {
    if (isPrivileged) {
      console.log('Fetching requests for privileged user');
      const fetchRequests = async () => {
        try {
          const q = query(collection(db, "trainer_delete_requests"), where("status", "==", "pending"));
          const snapshot = await getDocs(q);
          const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          console.log('Fetched requests:', reqs);
          setDeleteRequests(reqs);
        } catch (err) {
          console.error("Failed to fetch requests:", err);
        }
      };
      fetchRequests();
    }
  }, [isPrivileged]);

  useEffect(() => {
    if (showNotifications) {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target) && buttonRef.current && !buttonRef.current.contains(event.target)) {
          setShowNotifications(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  useEffect(() => {
    if (showFilters) {
      const handleClickOutside = (event) => {
        if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
          setShowFilters(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilters]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const uniqueDomains = React.useMemo(() => {
    const domains = new Set();
    trainers.forEach(trainer => {
      const doms = Array.isArray(trainer.domain) ? trainer.domain : trainer.domain ? trainer.domain.split(',').map(d => d.trim()) : [];
      doms.forEach(d => domains.add(d));
    });
    return Array.from(domains).sort();
  }, [trainers]);

  const filteredTrainers = trainers.filter((trainer) => {
    const matchesSearch = [trainer.name, trainer.trainerId, trainer.domain]
      .map((f) => (f || "").trim())
      .some((f) => f.includes(searchTerm.trim()));
    const trainerDomains = Array.isArray(trainer.domain) ? trainer.domain : trainer.domain ? trainer.domain.split(',').map(d => d.trim()) : [];
    const matchesDomain = selectedDomain === "All" || trainerDomains.some(d => d.trim() === selectedDomain.trim());
    const matchesPayment = selectedPaymentType === "All" || trainer.paymentType === selectedPaymentType;
    return matchesSearch && matchesDomain && matchesPayment;
  });

  const sortedTrainers = [...filteredTrainers].sort((a, b) => {
    const numA = parseInt((a.trainerId || "").replace("GA-T", ""), 10);
    const numB = parseInt((b.trainerId || "").replace("GA-T", ""), 10);
    return sortOrder === "asc" ? numA - numB : numB - numA;
  });

  const handleBack = () => {
    navigate('/dashboard/learning-development');
  };

  const handleTrainerAdded = (newTrainerOrArray) => {
    if (Array.isArray(newTrainerOrArray)) {
      setTrainers((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const additions = newTrainerOrArray.filter((t) => !existingIds.has(t.id));
        return [...prev, ...additions];
      });
    toast.success(`${newTrainerOrArray.length} trainer(s) imported`);
    } else if (newTrainerOrArray && newTrainerOrArray.id) {
      setTrainers((prev) => [...prev, newTrainerOrArray]);
    toast.success("Trainer added");
    }
    setShowAddTrainer(false);
  };

  const handleTrainerUpdated = (updatedTrainer) => {
    if (updatedTrainer && updatedTrainer.id) {
      setTrainers((prev) =>
        prev.map((t) => (t.id === updatedTrainer.id ? { ...t, ...updatedTrainer } : t))
      );
    toast.success("Trainer updated");
    }
    setShowEditTrainer(false);
  };

  const handleTrainerDeleted = (deletedId) => {
    if (deletedId) {
      setTrainers((prev) => prev.filter((t) => t.id !== deletedId));
    toast.success("Trainer deleted");
    }
    setShowDeleteTrainer(false);
  };

  const handleApprove = async (request) => {
    try {
      await deleteDoc(doc(db, 'trainers', request.trainerId));
      await deleteDoc(doc(db, 'trainer_delete_requests', request.id));
      setTrainers(prev => prev.filter(t => t.id !== request.trainerId));
      setDeleteRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success('Trainer deleted');
    } catch {
      toast.error('Failed to delete trainer');
    }
  };

  const handleReject = async (request) => {
    try {
      await deleteDoc(doc(db, 'trainer_delete_requests', request.id));
      setDeleteRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success('Request rejected');
    } catch {
      toast.error('Failed to reject request');
    }
  };

  const renderSpecializations = (trainer) => {
    let specs = [];

    if (Array.isArray(trainer.specialization)) {
      specs = [...trainer.specialization];
    } else if (typeof trainer.specialization === "string") {
      specs = trainer.specialization.split(",").map((s) => s.trim());
    }

    if (Array.isArray(trainer.otherSpecialization)) {
      specs = [...specs, ...trainer.otherSpecialization];
    } else if (typeof trainer.otherSpecialization === "string") {
      specs = [
        ...specs,
        ...trainer.otherSpecialization.split(",").map((s) => s.trim()),
      ];
    }

    return (
      <div className="flex flex-wrap gap-1">
        {specs
          .filter((s) => s && s.length > 0)
          .map((spec, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-800"
            >
              {spec}
            </span>
          ))}
      </div>
    );
  };

  const getDomainColor = (domain) => {
    const normalized = (domain || "").toLowerCase();
    if (normalized.includes("technical")) return DOMAIN_COLORS.Technical;
    if (normalized.includes("soft")) return DOMAIN_COLORS["Soft skills"];
    if (normalized.includes("aptitude")) return DOMAIN_COLORS.Aptitude;
    if (normalized.includes("tools")) return DOMAIN_COLORS.Tools;
    return "bg-gray-100 border border-gray-300 text-gray-800"; // default with border
  };

  const renderDomains = (trainer) => {
    const domains = [];
    if (Array.isArray(trainer.domain)) domains.push(...trainer.domain);
    else if (typeof trainer.domain === "string")
      domains.push(...trainer.domain.split(",").map((s) => s.trim()));

    return (
      <div className="flex flex-wrap gap-1">
        {domains
          .filter((d) => d && d.length > 0)
          .map((d, i) => (
            <span
              key={i}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getDomainColor(d)}`}
            >
              {d}
            </span>
          ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen text-sm">
      <TrainersDashboardTour userId={user?.uid} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-blue-800" data-tour="trainers-header">
          Trainers Management
        </h1>
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-2 py-1 bg-[#267BFD] text-white rounded-full hover:bg-[#1e60c6] transition text-sm"
        >
          <FiChevronLeft className="text-base" />
          Back
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 overflow-hidden">
        {/* Search + Add */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                placeholder="Search trainers..."
                className="w-full pl-8 pr-8 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-tour="trainers-search"
              />
              <svg
                className="absolute left-2 top-2 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-2 h-4 w-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label="Clear search"
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter Button */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-green-200 hover:bg-green-300 text-gray-800 px-3 py-1.5 rounded-lg transition-colors duration-150 focus:outline-none flex items-center gap-2 text-sm"
                aria-label="Filter trainers"
                title="Filter trainers"
              >
                <FiFilter className="w-4 h-4" />
                {(selectedDomain !== "All" || selectedPaymentType !== "All") && (
                  <span className="hidden sm:inline">
                    {selectedDomain !== "All" ? selectedDomain : ""}
                    {selectedDomain !== "All" && selectedPaymentType !== "All" ? ", " : ""}
                    {selectedPaymentType !== "All" ? selectedPaymentType.replace("Per ", "") : ""}
                  </span>
                )}
              </button>
              {showFilters && (
                <div
                  ref={filterDropdownRef}
                  className="absolute top-full mt-2 w-fit min-w-40 max-w-56 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto transition-all duration-150 ease-out"
                  role="menu"
                  aria-labelledby="filter-button"
                >
                  <div className="relative">
                    {/* Arrow pointer */}
                    <div className="absolute -top-2 left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white shadow-sm"></div>
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
                      <h3 className="text-xs font-semibold text-gray-900" id="filter-heading">Filters</h3>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-0.5 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        aria-label="Close filter"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {/* Content */}
                    <div className="p-1">
                      <div className="mb-2">
                        <button
                          onClick={() => setShowDomainSection(!showDomainSection)}
                          className="w-full text-left flex items-center justify-between px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded"
                        >
                          Domain
                          {showDomainSection ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />}
                        </button>
                        {showDomainSection && (
                          <div className="mt-1">
                            <button
                              onClick={() => { setSelectedDomain("All"); setShowFilters(false); }}
                              className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors duration-150 ${selectedDomain === "All" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-700 hover:bg-gray-50"}`}
                              role="menuitem"
                            >
                              All Domains
                            </button>
                            {uniqueDomains.map(domain => (
                              <button
                                key={domain}
                                onClick={() => { setSelectedDomain(domain); setShowFilters(false); }}
                                className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors duration-150 ${selectedDomain === domain ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-700 hover:bg-gray-50"}`}
                                role="menuitem"
                              >
                                {domain}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <button
                          onClick={() => setShowPaymentSection(!showPaymentSection)}
                          className="w-full text-left flex items-center justify-between px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded"
                        >
                          Payment Type
                          {showPaymentSection ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />}
                        </button>
                        {showPaymentSection && (
                          <div className="mt-1">
                            <button
                              onClick={() => { setSelectedPaymentType("All"); setShowFilters(false); }}
                              className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors duration-150 ${selectedPaymentType === "All" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-700 hover:bg-gray-50"}`}
                              role="menuitem"
                            >
                              All Types
                            </button>
                            <button
                              onClick={() => { setSelectedPaymentType("Per Hour"); setShowFilters(false); }}
                              className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors duration-150 ${selectedPaymentType === "Per Hour" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-700 hover:bg-gray-50"}`}
                              role="menuitem"
                            >
                              Per Hour
                            </button>
                            <button
                              onClick={() => { setSelectedPaymentType("Per Day"); setShowFilters(false); }}
                              className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors duration-150 ${selectedPaymentType === "Per Day" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-700 hover:bg-gray-50"}`}
                              role="menuitem"
                            >
                              Per Day
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Filter Button */}
            {(selectedDomain !== "All" || selectedPaymentType !== "All") && (
              <button
                onClick={() => { setSelectedDomain("All"); setSelectedPaymentType("All"); }}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 flex items-center gap-1 text-xs"
                aria-label="Clear all filters"
              >
                <FiX className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isPrivileged && (
              <div className="relative">
                <button
                  ref={buttonRef}
                  id="notifications-button"
                  onClick={() => {
                    console.log('Notifications clicked');
                    setShowNotifications(!showNotifications);
                  }}
                  className="relative bg-blue-200 hover:bg-blue-300 text-gray-800 p-2 rounded-lg transition-colors duration-150 focus:outline-none"
                  aria-label={`Notifications (${deleteRequests.length} pending)`}
                  title="Notifications"
                >
                  <FiBell className="w-5 h-5" />
                  {deleteRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {deleteRequests.length > 9 ? '9+' : deleteRequests.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full mt-2 w-80 sm:w-80 sm:right-0 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto transition-all duration-150 ease-out"
                    role="menu"
                    aria-labelledby="notifications-button"
                  >
                    {console.log('Rendering dropdown, requests:', deleteRequests)}
                    <div className="relative">
                      {/* Arrow pointer */}
                      <div className="absolute -top-2 right-6 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white shadow-sm"></div>
                      
                      {/* Header */}
                      <div className="flex items-center justify-between p-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
                        <h3 className="text-sm font-medium text-gray-900" id="notifications-heading">Delete Requests</h3>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-0.5 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          aria-label="Close notifications"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </div>
                      
                      {/* Content */}
                      <div className="p-2">
                        {deleteRequests.length === 0 ? (
                          <div className="text-center py-6">
                            <div className="text-gray-400 mb-2">
                              <FiCheck className="w-6 h-6 mx-auto" />
                            </div>
                            <p className="text-gray-500 text-xs">No pending requests.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {deleteRequests.map(req => (
                              <div
                                key={req.id}
                                className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow duration-150"
                                role="menuitem"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-600 truncate">
                                      <span className="font-medium text-gray-900">From:</span> {req.requesterName}
                                    </p>
                                    <p className="text-xs text-gray-600 truncate">
                                      <span className="font-medium text-gray-900">Delete:</span> {req.trainerName} ({req.trainerId})
                                    </p>
                                  </div>
                                  <div className="flex gap-1 ml-1">
                                    <button
                                      onClick={() => handleApprove(req)}
                                      className="inline-flex items-center gap-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 shadow-sm hover:shadow-md"
                                      aria-label={`Approve delete request for ${req.trainerName}`}
                                    >
                                      <FiCheck className="w-3 h-3" />
                                      OK
                                    </button>
                                    <button
                                      onClick={() => handleReject(req)}
                                      className="inline-flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-2 py-1 rounded text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 shadow-sm hover:shadow-md"
                                      aria-label={`Reject delete request for ${req.trainerName}`}
                                    >
                                      <FiX className="w-3 h-3" />
                                      No
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
                )}
              </div>
            )}
            <button
              onClick={() => setShowAddTrainer(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-3 py-1.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-sm flex items-center text-sm"
              data-tour="add-trainer-button"
            >
              <FiPlusCircle className="h-4 w-4 mr-2" />
              Add Trainer
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 p-2 bg-red-100 border-l-4 border-red-500 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

  {/* Table / Content */}
  {initialLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="relative">
            <>
            {/* Table with horizontal scroll */}
            <div className="overflow-x-auto min-h-screen" style={{ maxWidth: "100%" }} data-tour="trainers-table">
              <table className="min-w-full text-xs divide-y divide-gray-200">
                <thead className="bg-gray-50 text-[10px] uppercase font-medium text-gray-500">
                  <tr>
                    <th className="px-2 py-1 text-left cursor-pointer" onClick={toggleSortOrder} data-tour="trainer-id-column">
                      ID{" "}
                      <span className="inline-block ml-1">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    </th>
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">Domain</th>
                    <th className="px-2 py-1 text-left">Specialization</th>
                    <th className="px-2 py-1 text-left">Charges</th>
                    <th className="px-2 py-1 text-left">Contact</th>
                    <th className="px-2 py-1 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedTrainers.map((trainer) => (
                    <tr
                      key={trainer.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setTrainerDetailsData(trainer);
                        setShowTrainerDetails(true);
                      }}
                    >
                      <td className="px-2 py-1 text-gray-900 font-medium text-sm">
                        {trainer.trainerId}
                      </td>
                      <td className="px-2 py-1 text-gray-700">{trainer.name}</td>
                      <td className="px-2 py-1 text-gray-700">
                        {renderDomains(trainer)}
                      </td>
                      <td className="px-2 py-1">
                        {renderSpecializations(trainer)}
                      </td>
                      <td className="px-2 py-1 text-gray-700 text-sm">
                        ₹{trainer.charges ?? "-"}{" "}
                        {trainer.paymentType === "Per Hour"
                          ? "/hr"
                          : trainer.paymentType === "Per Day"
                          ? "/day"
                          : ""}
                      </td>
                      <td className="px-2 py-1 text-gray-700 text-sm">
                        {trainer.contact}
                      </td>
                      <td className="px-2 py-1 flex space-x-1" onClick={e => e.stopPropagation()} data-tour="trainer-actions">
                        <button
                          className="text-blue-600 hover:text-blue-900 text-sm p-1"
                          onClick={() => {
                            setSelectedTrainer(trainer);
                            setShowEditTrainer(true);
                          }}
                        >
                          <FiEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 text-sm p-1"
                          onClick={() => {
                            if (isPrivileged) {
                              console.log('Privileged delete for', trainer.name);
                              setTrainerToDelete(trainer);
                              setShowDeleteTrainer(true);
                            } else {
                              console.log('Send request for', trainer.name);
                              setTrainerToDelete(trainer);
                              setShowSendRequest(true);
                            }
                          }}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination removed: all trainers loaded once */}
            <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick pauseOnHover={false} theme="light" />

            {/* Modals */}
            {showAddTrainer && (
              <AddTrainer
                onClose={() => setShowAddTrainer(false)}
                onTrainerAdded={handleTrainerAdded}
              />
            )}
            {showEditTrainer && selectedTrainer && (
              <EditTrainer
                trainerId={selectedTrainer.id}
                onClose={() => setShowEditTrainer(false)}
                onTrainerUpdated={handleTrainerUpdated}
              />
            )}
            {showDeleteTrainer && trainerToDelete && (
              <DeleteTrainer
                trainerId={trainerToDelete.id}
                trainerName={trainerToDelete.name}
                onClose={() => setShowDeleteTrainer(false)}
                onTrainerDeleted={handleTrainerDeleted}
              />
            )}
            {showTrainerDetails && trainerDetailsData && (
              <TrainerLeadDetails
                trainer={trainerDetailsData}
                onClose={() => setShowTrainerDetails(false)}
              />
            )}
            {showSendRequest && trainerToDelete && (
              <SendRequestModal
                trainer={trainerToDelete}
                onClose={() => setShowSendRequest(false)}
                onRequestSent={() => { setShowSendRequest(false); toast.success("Request sent"); }}
              />
            )}
            </>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainersDashboard;
