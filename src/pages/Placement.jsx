import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs, getDoc } from "firebase/firestore";
import StudentListModal from "../components/Placement/StudentListModal";
import AddJD from "../components/Placement/AddJd/AddJD";
import CompanyOpen from "../components/Placement/CompanyOpen/CompanyOpen";
import CompanyLeads from "../components/Placement/CompanyLeads/CompanyLeads";
import MouPreviewModal from "../components/Placement/MouPreviewModal";
import PlacementDetailsModal from "../components/Placement/PlacementDetailsModal";
import { Eye, User, FileText } from "lucide-react";
import { doc } from "firebase/firestore";

function Placement() {
  const [trainingData, setTrainingData] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [studentModalData, setStudentModalData] = useState({
    show: false,
    students: [],
  });
  const [showJDForm, setShowJDForm] = useState(false);
  const [viewMode, setViewMode] = useState("training");
  const [mouPreview, setMouPreview] = useState({
    show: false,
    url: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentError, setStudentError] = useState(null);
  const [progressData, setProgressData] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [projectCodeSortDirection, setProjectCodeSortDirection] =
    useState("asc");
  const [isProjectCodeSorted, setIsProjectCodeSorted] = useState(false);

  // Inline CSS for animations
  const tableStyles = `
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out forwards;
    }
  `;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch placementData
      const trainingSnapshot = await getDocs(collection(db, "placementData"));
      const trainingData = trainingSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTrainingData(trainingData);

      // Fetch leads
      const leadsSnapshot = await getDocs(collection(db, "leads"));
      const leadsData = leadsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLeads(leadsData);

      // Fetch progress for each trainingData
      const progressPromises = trainingData.map(async (item) => {
        try {
          const docName = item.projectCode.replace(/\//g, "-");
          const trainingsCollectionRef = collection(
            db,
            "trainingForms",
            docName,
            "trainings"
          );

          const trainingsSnap = await getDocs(trainingsCollectionRef);
          if (trainingsSnap.empty) {
            return { projectCode: item.projectCode, phases: [] };
          }

          const phases = trainingsSnap.docs.map((phaseDoc) => {
            const data = phaseDoc.data();
            return {
              name: phaseDoc.id,
              status: data.status || "not started",
            };
          });

          return { projectCode: item.projectCode, phases };
        } catch (err) {
          console.error(`Error fetching status for ${item.projectCode}:`, err);
          return { projectCode: item.projectCode, phases: [] };
        }
      });
      const progressResults = await Promise.all(progressPromises);

      const progressMap = {};
      progressResults.forEach((res) => {
        progressMap[res.projectCode] = res.phases;
      });

      setProgressData(progressMap);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchStudentData = useCallback(async (trainingDocId) => {
    try {
      setStudentError(null);
      const studentsSnapshot = await getDocs(
        collection(db, "placementData", trainingDocId, "students")
      );
      const students = studentsSnapshot.docs.map((doc) => doc.data());
      setStudentModalData({ show: true, students });
      setDropdownOpen(null);
    } catch (err) {
      console.error("Error fetching students:", err);
      setStudentError("Failed to load student data.");
    }
  }, []);

  const handleProjectCodeSort = () => {
    setProjectCodeSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    setIsProjectCodeSorted(true);
  };

  // Sort data based on project code if sorting is active
  const sortedTrainingData = useMemo(() => {
    if (!isProjectCodeSorted) return trainingData;

    return [...trainingData].sort((a, b) => {
      if (projectCodeSortDirection === "asc") {
        return a.projectCode > b.projectCode
          ? 1
          : a.projectCode < b.projectCode
          ? -1
          : 0;
      } else {
        return a.projectCode < b.projectCode
          ? 1
          : a.projectCode > b.projectCode
          ? -1
          : 0;
      }
    });
  }, [trainingData, projectCodeSortDirection, isProjectCodeSorted]);

  const handleViewDetails = (item) => {
    setSelectedTraining(item);
    setDropdownOpen(null);
  };

  const handleMouPreview = (item) => {
    setMouPreview({
      show: true,
      url: item.mouFileUrl,
    });
    setDropdownOpen(null);
  };

  const toggleDropdown = (itemId, event) => {
    event.stopPropagation();
    setDropdownOpen(dropdownOpen === itemId ? null : itemId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Helper function to format cell values
  const formatCellValue = (value) => {
    if (value == null || value === "") return "N/A";
    return String(value);
  };

  // Function to check if dropdown should open above (for bottom rows)
  const getDropdownPosition = (index) => {
    // If it's one of the last 3 rows, open dropdown above
    return index >= sortedTrainingData.length - 3 ? "above" : "below";
  };

  return (
    <div className="p-0">
      <style>{tableStyles}</style>
      <h2 className="text-2xl font-bold mb-1 text-blue-800">
        Placement Management
      </h2>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-red-500 hover:text-red-700 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex mb-3 border-b">
            <button
              className={`px-4 py-2 font-medium ${
                viewMode === "training"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setViewMode("training")}
            >
              Training Data
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                viewMode === "placement"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setViewMode("placement")}
            >
              Placement Stats
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                viewMode === "leads"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setViewMode("leads")}
            >
              Company Leads
            </button>
          </div>

          {viewMode === "training" && (
            <>
              {sortedTrainingData.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    No training data found
                  </h3>
                  <p className="mt-1 text-gray-500">
                    There are currently no training programs to display.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-300 rounded-lg animate-fadeIn">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                    <thead className="bg-gradient-to-r from-blue-500 via-indigo-600 to-indigo-700 text-white ">
                      <tr>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium  uppercase tracking-wider cursor-pointer  select-none border border-gray-300"
                          onClick={handleProjectCodeSort}
                        >
                          <div className="flex items-center justify-between">
                            <span>Project Code</span>
                            <div className="flex flex-col ml-1">
                              <svg
                                className={`w-2 h-2 ${
                                  isProjectCodeSorted &&
                                  projectCodeSortDirection === "asc"
                                    ? "text-purple-600"
                                    : "text-gray-400"
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 15l7-7 7 7"
                                />
                              </svg>
                              <svg
                                className={`w-2 h-2 -mt-1 ${
                                  isProjectCodeSorted &&
                                  projectCodeSortDirection === "desc"
                                    ? "text-purple-600"
                                    : "text-gray-400"
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium border border-gray-300 uppercase tracking-wider"
                        >
                          College
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium border border-gray-300 uppercase tracking-wider"
                        >
                          Course
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium border border-gray-300 uppercase tracking-wider"
                        >
                          Year
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium border border-gray-300 uppercase tracking-wider"
                        >
                          Delivery Type
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium border border-gray-300 uppercase tracking-wider"
                        >
                          Total Students
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium border border-gray-300 uppercase tracking-wider"
                        >
                          Progress
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium border border-gray-300 uppercase tracking-wider"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedTrainingData.map((item, index) => {
                        const dropdownPosition = getDropdownPosition(index);

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-50 transition-colors border border-gray-300 cursor-pointer"
                            onClick={() => handleViewDetails(item)}
                          >
                            <td
                              className="px-1 py-3 whitespace-nowrap text-sm border border-gray-300 truncate"
                              title={formatCellValue(item.projectCode)}
                            >
                              {formatCellValue(item.projectCode)}
                            </td>
                            <td
                              className="px-1 py-3 whitespace-nowrap text-sm border border-gray-300 truncate max-w-48"
                              title={formatCellValue(item.collegeName)}
                            >
                              {formatCellValue(item.collegeName)}
                            </td>
                            <td
                              className="px-1 py-3 whitespace-nowrap text-sm border border-gray-300 truncate"
                              title={formatCellValue(item.course)}
                            >
                              {formatCellValue(item.course)}
                            </td>
                            <td
                              className="px-1 py-3 whitespace-nowrap text-sm border border-gray-300 truncate"
                              title={formatCellValue(item.year)}
                            >
                              {formatCellValue(item.year)}
                            </td>
                            <td
                              className="px-1 py-3 whitespace-nowrap text-sm border border-gray-300 truncate"
                              title={formatCellValue(item.deliveryType)}
                            >
                              {formatCellValue(item.deliveryType)}
                            </td>
                            <td
                              className="px-1 py-3 whitespace-nowrap text-sm border border-gray-300 truncate"
                              title={formatCellValue(item.studentCount)}
                            >
                              {formatCellValue(item.studentCount)}
                            </td>
                            <td className="px-1 py-3 whitespace-nowrap text-sm border border-gray-300 text-gray-500">
                              {progressData[item.projectCode] ? (
                                progressData[item.projectCode].length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {progressData[item.projectCode].map(
                                      (phase, idx) => (
                                        <span
                                          key={idx}
                                          className={`px-2 py-1 rounded-full text-white text-xs font-semibold ${
                                            phase.status === "Done"
                                              ? "bg-green-500"
                                              : phase.status === "Initiated"
                                              ? "bg-amber-500"
                                              : phase.status === "Ongoing"
                                              ? "bg-cyan-700"
                                              : phase.status === "Hold"
                                              ? "bg-rose-500"
                                              : "bg-gray-400"
                                          }`}
                                          title={`${phase.name}: ${phase.status}`}
                                        >
                                          {phase.name}
                                        </span>
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <span className=" text-xs italic">
                                    No phases
                                  </span>
                                )
                              ) : (
                                <span className=" text-xs italic">
                                  Loading...
                                </span>
                              )}
                            </td>
                            <td className="px-1 py-3 whitespace-nowrap text-sm text-gray-500 relative">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => toggleDropdown(item.id, e)}
                                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                                  title="Actions"
                                >
                                  <svg
                                    className="w-5 h-5 text-gray-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                    />
                                  </svg>
                                </button>

                                {dropdownOpen === item.id && (
                                  <div
                                    className={`absolute right-0 w-48 bg-white rounded-md shadow-lg border border-gray-400 z-10 ${
                                      dropdownPosition === "above"
                                        ? "bottom-full mb-1"
                                        : "top-full mt-1"
                                    }`}
                                  >
                                    <div className="py-1">
                                      <button
                                        onClick={() => handleViewDetails(item)}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                      >
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Details
                                      </button>

                                      <button
                                        onClick={() =>
                                          fetchStudentData(item.id)
                                        }
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                      >
                                        <User className="w-4 h-4 mr-2" />
                                        Student Data
                                      </button>

                                      <button
                                        onClick={() => handleMouPreview(item)}
                                        disabled={!item.mouFileUrl}
                                        className={`flex items-center w-full px-4 py-2 text-sm ${
                                          item.mouFileUrl
                                            ? "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                            : "text-gray-400 cursor-not-allowed"
                                        }`}
                                      >
                                        <FileText className="w-4 h-4 mr-2" />
                                        MOU File
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {viewMode === "placement" && <CompanyOpen />}
          {viewMode === "leads" && (
            <CompanyLeads
              leads={leads}
              onLeadSelect={(lead) => {
                setSelectedLead(lead);
                setViewMode("placement");
              }}
            />
          )}

          {selectedTraining && (
            <PlacementDetailsModal
              training={selectedTraining}
              onClose={() => setSelectedTraining(null)}
            />
          )}

          {studentModalData.show && (
            <StudentListModal
              students={studentModalData.students}
              onClose={() => setStudentModalData({ show: false, students: [] })}
              error={studentError}
            />
          )}

          {showJDForm && (
            <AddJD show={showJDForm} onClose={() => setShowJDForm(false)} />
          )}

          {selectedLead && (
            <CompanyOpen
              selectedLead={selectedLead}
              onClose={() => setSelectedLead(null)}
              onAddJD={(leadId, jdData) => {
                setLeads(
                  leads.map((lead) =>
                    lead.id === leadId
                      ? { ...lead, jds: [...(lead.jds || []), jdData] }
                      : lead
                  )
                );
              }}
            />
          )}

          {mouPreview.show && (
            <MouPreviewModal
              show={mouPreview.show}
              onClose={() => setMouPreview({ show: false, url: null })}
              mouFileUrl={mouPreview.url}
            />
          )}
        </>
      )}
    </div>
  );
}

export default Placement;
