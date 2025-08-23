import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import {
  FiPlay,
  FiEdit,
  FiCalendar,
  FiUsers,
  FiBookOpen,
  FiMoreVertical,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiUserCheck,
  FiX, // <-- Add this import
} from "react-icons/fi";
import ChangeTrainerDashboard from "./ChangeTrainerDashboard";

const PHASE_LABELS = {
  "phase-1": "Phase 1",
  "phase-2": "Phase 2",
  "phase-3": "Phase 3",
};

// Helper to group trainings by college
function groupByCollege(trainings) {
  const map = {};
  trainings.forEach((t) => {
    const key = `${t.collegeName} (${t.collegeCode})`;
    if (!map[key]) map[key] = [];
    map[key].push(t);
  });
  return map;
}

const Dashboard = ({ onRowClick, onStartPhase }) => {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPhase, setFilterPhase] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [changeTrainerModalOpen, setChangeTrainerModalOpen] = useState(false);
  const [selectedTrainingForChange, setSelectedTrainingForChange] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef();
  const actionBtnRefs = useRef({});

  // Fetch all trainingForms and their phases
  const fetchData = async () => {
    setLoading(true);
    const formsSnap = await getDocs(collection(db, "trainingForms"));
    const allTrainings = [];

    for (const formDoc of formsSnap.docs) {
      const formData = formDoc.data();
      const phasesSnap = await getDocs(
        collection(db, "trainingForms", formDoc.id, "trainings")
      );

      for (const phaseDoc of phasesSnap.docs) {
        const phaseData = phaseDoc.data();

        // Get domains count and summary info
        const domainsSnap = await getDocs(
          collection(
            db,
            "trainingForms",
            formDoc.id,
            "trainings",
            phaseDoc.id,
            "domains"
          )
        );
        const domains = [];
        let totalBatches = 0;

        domainsSnap.forEach((domainDoc) => {
          const domainData = domainDoc.data();
          domains.push(domainData.domain || domainDoc.id);
          if (domainData.table1Data) {
            totalBatches += domainData.table1Data.length;
          }
        });

        allTrainings.push({
          id: `${formDoc.id}_${phaseDoc.id}`,
          trainingId: formDoc.id,
          phaseId: phaseDoc.id,
          collegeName: formData.collegeName,
          collegeCode: formData.collegeCode,
          domain: domains.join(", ") || "-",
          domainsCount: domains.length,
          table1Data: Array(totalBatches).fill({}), // For batch count display
          ...phaseData,
          // Include original form data for phase initiation
          originalFormData: formData,
        });
      }
    }
    setTrainings(allTrainings);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Filter trainings based on search and phase filter
  const filteredTrainings = trainings.filter((training) => {
    const matchesSearch =
      searchTerm === "" ||
      training.collegeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.collegeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.domain.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPhase =
      filterPhase === "all" || training.phaseId === filterPhase;

    return matchesSearch && matchesPhase;
  });

  // Group trainings by college
  const grouped = groupByCollege(filteredTrainings);

  // Get phase status and style
  const getPhaseStatus = (training) => {
    // If no domains configured, it's not started
    if (training.domainsCount === 0) {
      return { status: "Not Started", style: "bg-gray-100 text-gray-700" };
    }

    // If domains are configured but no start/end dates, it's initiated
    if (!training.trainingStartDate || !training.trainingEndDate) {
      return { status: "Initiated", style: "bg-yellow-100 text-yellow-700" };
    }

    // Parse dates for comparison
    const today = new Date();
    const startDate = new Date(training.trainingStartDate);
    const endDate = new Date(training.trainingEndDate);

    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Check if training is on hold (you might want to add a specific field for this)
    if (training.status === "hold" || training.isOnHold) {
      return { status: "Hold", style: "bg-orange-100 text-orange-700" };
    }

    // If current date is before start date - Initiated
    if (today < startDate) {
      return { status: "Initiated", style: "bg-yellow-100 text-yellow-700" };
    }

    // If current date is after end date - Done
    if (today > endDate) {
      return { status: "Done", style: "bg-green-100 text-green-700" };
    }

    // If current date is between start and end date - In Progress
    if (today >= startDate && today <= endDate) {
      return { status: "In Progress", style: "bg-blue-100 text-blue-700" };
    }

    // Fallback to initiated
    return { status: "Initiated", style: "bg-yellow-100 text-yellow-700" };
  };

  const handleStartPhase = (e, training) => {
    e.stopPropagation(); // Prevent row click

    // Prepare training data for InitiationModal
    const trainingForModal = {
      id: training.trainingId,
      selectedPhase: training.phaseId,
      collegeName: training.collegeName,
      collegeCode: training.collegeCode,
      ...training.originalFormData,
    };

    if (onStartPhase) {
      onStartPhase(trainingForModal);
    }
  };

  // Edit button handler - reopens initiation modal in edit mode for the specific phase
  const handleEditPhase = (e, training) => {
    e.stopPropagation();
    const trainingForModal = {
      id: training.trainingId,
      selectedPhase: training.phaseId,
      collegeName: training.collegeName,
      collegeCode: training.collegeCode,
      ...training.originalFormData,
      isEdit: true, // optional flag consumers can use to open modal in edit mode
    };
    if (onStartPhase) onStartPhase(trainingForModal);
  };

  // Change trainer handler - opens change trainer modal for specific phase
  const handleChangeTrainer = (e, training) => {
    e.stopPropagation(); // Prevent row click
    setSelectedTrainingForChange(training);
    setChangeTrainerModalOpen(true);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        // Also check if click is not on the action button
        (!openDropdownId ||
          !actionBtnRefs.current[openDropdownId] ||
          !actionBtnRefs.current[openDropdownId].contains(event.target))
      ) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdownId]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Training Initiation Dashboard
              </h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Manage and monitor training phases across all colleges
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search colleges or domains..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full sm:w-52"
                />
              </div>

              {/* Phase Filter */}
              <div className="relative">
                <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={filterPhase}
                  onChange={(e) => setFilterPhase(e.target.value)}
                  className="pl-10 pr-6 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none bg-white min-w-[110px]"
                >
                  <option value="all">All Phases</option>
                  <option value="phase-1">Phase 1</option>
                  <option value="phase-2">Phase 2</option>
                  <option value="phase-3">Phase 3</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiRefreshCw
                  className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 text-xs">Loading training data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      Total Colleges
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Object.keys(grouped).length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FiBookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      Active Phases
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {filteredTrainings.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <FiPlay className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      Total Batches
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {filteredTrainings.reduce(
                        (acc, t) =>
                          acc + (t.table1Data ? t.table1Data.length : 0),
                        0
                      )}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <FiUsers className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Training Tables */}
            {Object.keys(grouped).length > 0 ? (
              Object.entries(grouped).map(([college, phases]) => (
                <div
                  key={college}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden"
                >
                  {/* College Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-white">
                          {college}
                        </h2>
                        <p className="text-blue-100 text-sm mt-1">
                          {phases.length} phase{phases.length !== 1 ? "s" : ""}{" "}
                          configured
                        </p>
                      </div>
                      <div className="text-blue-100">
                        <FiBookOpen className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Phase
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Domain
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Timeline
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Batches
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {phases.map((training) => {
                          const status = getPhaseStatus(training);
                          const canEdit =
                            training.domainsCount > 0 ||
                            training.isEdit === true;

                          return (
                            <tr
                              key={training.id}
                              className="hover:bg-blue-50/30 cursor-pointer transition-all group"
                              onClick={() =>
                                onRowClick &&
                                onRowClick({
                                  ...training,
                                  id: training.trainingId,
                                  selectedPhase: training.phaseId,
                                })
                              }
                            >
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                    <span className="text-blue-600 font-semibold text-sm">
                                      {training.phaseId.replace("phase-", "")}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {PHASE_LABELS[training.phaseId] ||
                                      training.phaseId}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <div
                                  className="text-sm text-gray-900 max-w-xs truncate"
                                  title={training.domain}
                                >
                                  {training.domain || (
                                    <span className="text-gray-400 italic">
                                      No domain specified
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <div className="space-y-1">
                                  {training.trainingStartDate &&
                                  training.trainingEndDate ? (
                                    <div className="flex items-center text-xs text-gray-600">
                                      <FiCalendar className="w-3 h-3 mr-1" />
                                      <span>
                                        {training.trainingStartDate} -{" "}
                                        {training.trainingEndDate}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">
                                      Dates not set
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                  <FiUsers className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {training.table1Data
                                      ? training.table1Data.length
                                      : 0}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.style}`}
                                >
                                  {status.status}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right">
                                <div className="relative flex items-center justify-end gap-1 transition-opacity">
                                  <button
                                    className="p-1 rounded-full hover:bg-gray-100"
                                    ref={el => (actionBtnRefs.current[training.id] = el)}
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (openDropdownId === training.id) {
                                        setOpenDropdownId(null);
                                      } else {
                                        // Calculate position for portal dropdown
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setDropdownPosition({
                                          top: rect.bottom + window.scrollY + 4,
                                          left: rect.right - 160 + window.scrollX, // 160px = dropdown width
                                        });
                                        setOpenDropdownId(training.id);
                                      }
                                    }}
                                    title="Actions"
                                  >
                                    {openDropdownId === training.id ? (
                                      <FiX className="w-5 h-5 text-red-500" />
                                    ) : (
                                      <FiMoreVertical className="w-5 h-5" />
                                    )}
                                  </button>
                                  {openDropdownId === training.id && createPortal(
                                    <div
                                      ref={dropdownRef}
                                      className="z-50 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 flex flex-col"
                                      style={{
                                        position: "absolute",
                                        top: dropdownPosition.top,
                                        left: dropdownPosition.left,
                                      }}
                                    >
                                      {training.domainsCount === 0 ? (
                                        <button
                                          onClick={e => {
                                            handleStartPhase(e, training);
                                            setOpenDropdownId(null);
                                          }}
                                          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                          <FiPlay className="w-4 h-4 mr-2 text-green-600" />
                                          <span>Start</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-default bg-transparent"
                                          onClick={e => e.preventDefault()}
                                          tabIndex={-1}
                                        >
                                          <FiBookOpen className="w-4 h-4 mr-2 text-blue-600" />
                                          <span>View Details</span>
                                        </button>
                                      )}

                                      {canEdit && (
                                        <button
                                          onClick={e => {
                                            handleEditPhase(e, training);
                                            setOpenDropdownId(null);
                                          }}
                                          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                          <FiEdit className="w-4 h-4 mr-2 text-amber-500" />
                                          <span>Edit</span>
                                        </button>
                                      )}

                                      {(() => {
                                        const status = getPhaseStatus(training);
                                        return status.status === "In Progress";
                                      })() && (
                                        <button
                                          onClick={e => {
                                            handleChangeTrainer(e, training);
                                            setOpenDropdownId(null);
                                          }}
                                          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                          <FiEdit className="w-4 h-4 mr-2 text-red-500" />
                                          <span>Change trainer</span>
                                        </button>
                                      )}
                                    </div>,
                                    document.body
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden divide-y divide-gray-100">
                    {phases.map((training) => {
                      const status = getPhaseStatus(training);
                      const canEdit =
                        training.domainsCount > 0 || training.isEdit === true;

                      return (
                        <div
                          key={training.id}
                          className="p-3 hover:bg-blue-50/30 cursor-pointer transition-all"
                          onClick={() =>
                            onRowClick &&
                            onRowClick({
                              ...training,
                              id: training.trainingId,
                              selectedPhase: training.phaseId,
                            })
                          }
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mr-2">
                                <span className="text-blue-600 font-bold text-sm">
                                  {training.phaseId.replace("phase-", "")}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-xs font-semibold text-gray-900">
                                  {PHASE_LABELS[training.phaseId] ||
                                    training.phaseId}
                                </h3>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${status.style}`}
                                >
                                  {status.status}
                                </span>
                              </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                              <FiMoreVertical className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-0.5">
                                Domain
                              </p>
                              <p className="text-xs text-gray-900 truncate">
                                {training.domain || (
                                  <span className="text-gray-400 italic">
                                    No domain specified
                                  </span>
                                )}
                              </p>
                            </div>

                            {training.trainingStartDate &&
                              training.trainingEndDate && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                                    Timeline
                                  </p>
                                  <div className="flex items-center text-xs text-gray-600">
                                    <FiCalendar className="w-3 h-3 mr-1" />
                                    <span>
                                      {training.trainingStartDate} - {training.trainingEndDate}
                                    </span>
                                  </div>
                                </div>
                              )}

                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-0.5">
                                Batches
                              </p>
                              <div className="flex items-center">
                                <FiUsers className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-xs font-medium text-gray-900">
                                  {training.table1Data
                                    ? training.table1Data.length
                                    : 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
                            {training.domainsCount === 0 ? (
                              <button
                                onClick={(e) => handleStartPhase(e, training)}
                                className="flex-1 inline-flex items-center justify-center px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                              >
                                <FiPlay className="w-3 h-3 mr-1" />
                                Start Phase
                              </button>
                            ) : (
                              <button className="flex-1 text-blue-600 hover:text-blue-800 text-xs font-medium py-1">
                                View Details
                              </button>
                            )}

                            {canEdit && (
                              <button
                                onClick={(e) => handleEditPhase(e, training)}
                                className="flex-1 inline-flex items-center justify-center px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                              >
                                <FiEdit className="w-3 h-3 mr-1" />
                                Edit
                              </button>
                            )}

                            {/* Change Trainer Button - Show for in-progress trainings */}
                            {(() => {
                              const status = getPhaseStatus(training);
                              return status.status === "In Progress";
                            })() && (
                              <button
                                onClick={(e) => handleChangeTrainer(e, training)}
                                className="flex-1 inline-flex items-center justify-center px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                                title="Trainer"
                              >
                                <FiEdit className="w-3 h-3 mr-1" />
                                <span className="mr-1">Trainer</span>
                                <FiUserCheck className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              /* Empty State */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <FiBookOpen className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    No trainings found
                  </h3>
                  <p className="text-gray-500 text-xs">
                    {searchTerm || filterPhase !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "Get started by creating your first training program"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Trainer Modal */}
      <ChangeTrainerDashboard
        isOpen={changeTrainerModalOpen}
        onClose={() => {
          setChangeTrainerModalOpen(false);
          setSelectedTrainingForChange(null);
        }}
        selectedTraining={selectedTrainingForChange}
      />
    </div>
  );
};

export default Dashboard;
