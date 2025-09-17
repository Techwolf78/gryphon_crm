import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db } from "../../firebase";
import AddTrainer from "./AddTrainer.jsx";
import EditTrainer from "./EditTrainer.jsx";
import DeleteTrainer from "./DeleteTrainer.jsx";
import TrainerLeadDetails from "./TrainerLeadDetails.jsx";
import { FiPlusCircle, FiEdit, FiTrash2, FiChevronLeft } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import TrainersDashboardTour from "../tours/TrainersDashboardTour";
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

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const didInitRef = useRef(false);
  const { user } = useAuth();
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

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const filteredTrainers = trainers.filter((trainer) =>
    [trainer.name, trainer.trainerId, trainer.domain]
      .map((f) => (f || "").toLowerCase())
      .some((f) => f.includes(searchTerm.toLowerCase()))
  );

  const sortedTrainers = [...filteredTrainers].sort((a, b) => {
    const numA = parseInt((a.trainerId || "").replace("GA-T", ""), 10);
    const numB = parseInt((b.trainerId || "").replace("GA-T", ""), 10);
    return sortOrder === "asc" ? numA - numB : numB - numA;
  });

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to parent route if no history
      navigate('/dashboard/learning-development');
    }
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
          {/* Search Input */}
          <div className="relative w-full sm:w-48">
            <input
              type="text"
              placeholder="Search trainers..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
          </div>

          <button
            onClick={() => setShowAddTrainer(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-3 py-1.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-sm flex items-center text-sm"
            data-tour="add-trainer-button"
          >
            <FiPlusCircle className="h-4 w-4 mr-2" />
            Add Trainer
          </button>
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
            <div className="overflow-x-auto mb-3" style={{ maxWidth: "100%" }} data-tour="trainers-table">
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
                            setTrainerToDelete(trainer);
                            setShowDeleteTrainer(true);
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
            </>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainersDashboard;
