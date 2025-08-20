import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  where, // <-- added
} from "firebase/firestore";
import { db } from "../../firebase";
import AddTrainer from "./AddTrainer.jsx";
import EditTrainer from "./EditTrainer.jsx";
import DeleteTrainer from "./DeleteTrainer.jsx";
import TrainerLeadDetails from "./TrainerLeadDetails.jsx";
import {
  FiPlusCircle,
  FiEdit,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const TRAINERS_PER_PAGE = 20;

function TrainersDashboard() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [pageStack, setPageStack] = useState([]);

  const navigate = useNavigate();

  const fetchTrainersPaginated = async (direction = "initial") => {
    try {
      setLoading(true);
      setError(null);

      let q;
      const baseQuery = collection(db, "trainers");
      const orderField = "trainerId";

      if (direction === "initial") {
        q = query(baseQuery, orderBy(orderField), limit(TRAINERS_PER_PAGE));
      } else if (direction === "next" && lastVisible) {
        q = query(
          baseQuery,
          orderBy(orderField),
          startAfter(lastVisible),
          limit(TRAINERS_PER_PAGE)
        );
      } else if (direction === "prev" && firstVisible) {
        q = query(
          baseQuery,
          orderBy(orderField),
          endBefore(firstVisible),
          limitToLast(TRAINERS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTrainers(data);

      const firstDoc = snapshot.docs[0];
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];

      setFirstVisible(firstDoc);
      setLastVisible(lastDoc);

      if (direction === "next") {
        setPageStack((prev) => [...prev, firstVisible]);
      } else if (direction === "prev") {
        setPageStack((prev) => prev.slice(0, -1));
      } else if (direction === "initial") {
        setPageStack([]);
      }
    } catch (err) {
      console.error("Pagination fetch failed:", err);
      setError("Failed to fetch trainers. Try again.");
    } finally {
      setLoading(false);
    }
  };

  async function searchTrainersFirestore(term) {
    try {
      setLoading(true);
      setError(null);

      if (!term) {
        // if search cleared, go back to paginated listing
        await fetchTrainersPaginated("initial");
        return;
      }

      // Firestore prefix search on name (requires index for complex queries)
      const q = query(
        collection(db, "trainers"),
        where("name", ">=", term),
        where("name", "<=", term + "\uf8ff"),
        orderBy("name"),
        limit(1000) // adjust max results as needed
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTrainers(data);
      // reset pagination cursors while showing search results
      setFirstVisible(null);
      setLastVisible(null);
      setPageStack([]);
    } catch (err) {
      console.error("Search failed:", err);
      setError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrainersPaginated("initial");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchTerm.trim();
      if (trimmed.length > 0) {
        searchTrainersFirestore(trimmed);
      } else {
        // restore paginated view
        fetchTrainersPaginated("initial");
      }
    }, 300);

    return () => clearTimeout(t);
  }, [searchTerm]);

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

  const handleBack = () => navigate(-1);

  const handleTrainerAdded = () => {
    fetchTrainersPaginated("initial");
    setShowAddTrainer(false);
  };

  const handleTrainerUpdated = () => {
    fetchTrainersPaginated("initial");
    setShowEditTrainer(false);
  };

  const handleTrainerDeleted = () => {
    fetchTrainersPaginated("initial");
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

  // Only three domains: "Soft Skills", "Aptitude", "Technical"
  const domainBadgeClass = (domain) => {
    const d = (domain || "").toLowerCase();
    if (d.includes("aptitude")) return "bg-emerald-100 text-emerald-800";
    if (d.includes("soft")) return "bg-sky-100 text-sky-800";
    if (d.includes("tech") || d.includes("technical")) return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-800";
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
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${domainBadgeClass(
                d
              )}`}
            >
              {d}
            </span>
          ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen text-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-blue-800">
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

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Table with horizontal scroll */}
            <div className="overflow-x-auto mb-3" style={{ maxWidth: "100%" }}>
              <table className="min-w-full text-xs divide-y divide-gray-200">
                <thead className="bg-gray-50 text-[10px] uppercase font-medium text-gray-500">
                  <tr>
                    <th className="px-2 py-1 text-left cursor-pointer" onClick={toggleSortOrder}>
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
                      <td className="px-2 py-1 flex space-x-1" onClick={e => e.stopPropagation()}>
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

            {/* Pagination Controls BELOW the scroll bar */}
            <div className="flex justify-between items-center mt-1">
              <button
                onClick={() => fetchTrainersPaginated("prev")}
                disabled={pageStack.length === 0}
                className="flex items-center gap-2 px-3 py-1 border rounded disabled:opacity-50 text-sm"
              >
                <FiChevronLeft />
                Previous
              </button>

              <button
                onClick={() => fetchTrainersPaginated("next")}
                disabled={trainers.length < TRAINERS_PER_PAGE}
                className="flex items-center gap-2 px-3 py-1 border rounded disabled:opacity-50 text-sm"
              >
                Next
                <FiChevronRight />
              </button>
            </div>

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
        )}
      </div>
    </div>
  );
}

export default TrainersDashboard;
