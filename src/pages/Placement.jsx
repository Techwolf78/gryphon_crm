import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import TrainingDetailModal from "../components/Learning/TrainingTables/TrainingDetailModal";
import FilePreviewModal from "../components/Learning/TrainingTables/FilePreviewModal";
import {
  FileText,
  Users,
  FileSignature,
  Eye,
  ChevronRight,
  Download,
} from "lucide-react";

// Basic Table Components
const Table = ({ children, className }) => (
  <div
    className={`overflow-hidden rounded-lg border border-gray-200 ${className}`}
  >
    <table className="min-w-full divide-y divide-gray-200">{children}</table>
  </div>
);

const TableHeader = ({ children }) => (
  <thead className="bg-gray-50">{children}</thead>
);

const TableBody = ({ children }) => (
  <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>
);

const TableRow = ({ children, className }) => (
  <tr className={className}>{children}</tr>
);

const TableHead = ({ children, className }) => (
  <th
    scope="col"
    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
  >
    {children}
  </th>
);

const TableCell = ({ children, className }) => (
  <td className={`px-6 py-4 whitespace-nowrap ${className}`}>{children}</td>
);

// Basic Card Components
const Card = ({ children, className }) => (
  <div className={`bg-white shadow-sm rounded-lg ${className}`}>{children}</div>
);

const CardHeader = ({ children, className }) => (
  <div className={`border-b border-gray-200 px-6 py-4 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className }) => (
  <h3 className={`text-lg font-medium text-gray-900 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

// Basic Button Component
const Button = ({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2";
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const variantClasses = {
    default: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500",
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500",
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Skeleton Loader Component
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

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
  }, []);

  const openFilePreview = (fileUrl, type, trainingId = "") => {
    if (!fileUrl && type === "student") {
      // Replace alert with a more elegant notification
      return;
    }
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
        return "bg-emerald-100 text-emerald-800";
      case "ongoing":
        return "bg-amber-100 text-amber-800";
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="  mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Placement Details
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage and review all placement details
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">
              Active  Colleges for placement
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : trainingData.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No colleges found</p>
              <Button variant="outline" className="mt-4">
                Create New college
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Project Code</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-center">Year</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead className="text-center">Students</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.projectCode || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {item.collegeName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.department}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {item.course}
                      </TableCell>
                      <TableCell className="text-center text-gray-700">
                        {item.year}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        <span className="capitalize">{item.deliveryType}</span>
                      </TableCell>
                      <TableCell className="text-center text-gray-700">
                        {item.studentCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {item.status || "Not Specified"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTraining(item)}
                          className="text-gray-600 hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            openFilePreview(
                              item.studentFileUrl,
                              "student",
                              item.id
                            )
                          }
                          disabled={!item.studentFileUrl}
                          className="text-gray-600 hover:bg-gray-100"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Students
                        </Button>
                        {item.mouFileUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              openFilePreview(item.mouFileUrl, "mou")
                            }
                            className="text-gray-600 hover:bg-gray-100"
                          >
                            <FileSignature className="h-4 w-4 mr-1" />
                            MOU
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
