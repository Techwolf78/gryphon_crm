import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import TrainingDetailModal from "../components/Learning/TrainingTables/TrainingDetailModal";
import FilePreviewModal from "../components/Learning/TrainingTables/FilePreviewModal";
import { FileText, Users, FileSignature, Eye, ChevronDown, Search } from "lucide-react";

function Placement() {
  const [trainingData, setTrainingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [fileModalData, setFileModalData] = useState({
    show: false,
    fileUrl: "",
    type: "",
    trainingId: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const fetchTrainingData = async () => {
    try {
      const snapshot = await getDocs(collection(db, "trainingForms"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTrainingData(data);
    } catch (err) {
      console.error("Error fetching training data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainingData();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openFilePreview = (fileUrl, type, trainingId = "") => {
    if (!fileUrl && type === "student") return;
    setFileModalData({
      show: true,
      fileUrl,
      type,
      trainingId,
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "ongoing":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "upcoming":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const filteredData = trainingData.filter(item => 
    item.collegeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.projectCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.course?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placement Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and track all college placement programs</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search colleges..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Header - Desktop */}
        {!isMobile && (
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 font-medium text-xs uppercase tracking-wider border-b border-gray-200">
            <div className="col-span-2 flex items-center">
              <FileText className="mr-2 h-4 w-4 text-gray-500" />
              Project Code
            </div>
            <div className="col-span-3 flex items-center">
              College
            </div>
            <div className="col-span-2 flex items-center">
              Course
            </div>
            <div className="col-span-1 flex items-center justify-center">
              Year
            </div>
            <div className="col-span-1 flex items-center">
              Delivery
            </div>
            <div className="col-span-1 flex items-center justify-center">
              Students
            </div>
            <div className="col-span-2 flex items-center justify-end">
              Actions
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4">
                {[...Array(8)].map((_, j) => (
                  <div key={j} className="col-span-1 h-4 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-24 w-24 text-gray-300 mb-4">
              <FileText className="w-full h-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {searchTerm ? "No matching results" : "No placement programs"}
            </h3>
            <p className="text-sm text-gray-500">
              {searchTerm ? "Try a different search term" : "Get started by creating a new program"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Data Rows */}
            {filteredData.map((item) => (
              <div
                key={item.id}
                className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-4 md:px-6 py-4 text-sm group transition-all hover:bg-gray-50/50 ${
                  selectedTraining?.id === item.id ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                {/* Project Code */}
                <div className="col-span-2 flex items-center">
                  {isMobile && (
                    <FileText className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                  )}
                  <div>
                    {isMobile && <div className="text-xs text-gray-500 mb-1">Project Code</div>}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {item.projectCode || "N/A"}
                    </span>
                  </div>
                </div>

                {/* College */}
                <div className="col-span-3 flex items-center">
                  {isMobile && (
                    <div className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                  )}
                  <div>
                    {isMobile && <div className="text-xs text-gray-500 mb-1">College</div>}
                    <div className="font-medium text-gray-900">
                      {item.collegeName}
                    </div>
                    {isMobile && item.department && (
                      <div className="text-xs text-gray-500 mt-1">{item.department}</div>
                    )}
                  </div>
                </div>

                {/* Course */}
                <div className="col-span-2 flex items-center">
                  {isMobile && (
                    <div className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                  )}
                  <div>
                    {isMobile && <div className="text-xs text-gray-500 mb-1">Course</div>}
                    <div className="text-gray-700">
                      {item.course}
                    </div>
                  </div>
                </div>

                {/* Year */}
                <div className="col-span-1 flex items-center justify-center">
                  {isMobile && (
                    <div className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                  )}
                  <div>
                    {isMobile && <div className="text-xs text-gray-500 mb-1">Year</div>}
                    <div className="text-gray-700">
                      {item.year}
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div className="col-span-1 flex items-center">
                  {isMobile && (
                    <div className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                  )}
                  <div>
                    {isMobile && <div className="text-xs text-gray-500 mb-1">Delivery</div>}
                    <span className="capitalize text-gray-700">
                      {item.deliveryType}
                    </span>
                  </div>
                </div>

                {/* Students */}
                <div className="col-span-1 flex items-center justify-center">
                  {isMobile && (
                    <Users className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                  )}
                  <div>
                    {isMobile && <div className="text-xs text-gray-500 mb-1">Students</div>}
                    <div className="text-gray-700">
                      {item.studentCount}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end ">
                  <button
                    onClick={() => setSelectedTraining(item)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View details"
                    aria-label="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openFilePreview(item.studentFileUrl, "student", item.id)}
                    disabled={!item.studentFileUrl}
                    className={`p-2 rounded-lg transition-colors ${
                      item.studentFileUrl 
                        ? 'text-gray-600 hover:text-blue-600 hover:bg-blue-50' 
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                    title="View students"
                    aria-label="View students"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                  {item.mouFileUrl && (
                    <button
                      onClick={() => openFilePreview(item.mouFileUrl, "mou")}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View MOU"
                      aria-label="View MOU"
                    >
                      <FileSignature className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTraining && (
        <TrainingDetailModal
          training={selectedTraining}
          onClose={() => setSelectedTraining(null)}
        />
      )}

      {fileModalData.show && (
        <FilePreviewModal
          fileUrl={fileModalData.fileUrl}
          type={fileModalData.type}
          trainingId={fileModalData.trainingId}
          onClose={() =>
            setFileModalData({
              show: false,
              fileUrl: "",
              type: "",
              trainingId: "",
            })
          }
        />
      )}
    </div>
  );
}

export default Placement;