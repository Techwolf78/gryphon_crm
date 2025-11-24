import React, { useState, useEffect, useCallback } from "react";
import {
  XIcon,
  ChevronDownIcon,
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  TrendingUpIcon,
  UsersIcon,
  OfficeBuildingIcon,
  AcademicCapIcon,
  CalendarIcon,
  ArrowLeftIcon,
} from "@heroicons/react/outline";
import { FiCalendar, FiTrendingUp, FiUsers, FiAward } from "react-icons/fi";
import PlacedStdCalendar from "./PlacedStdCalendar";

// Dummy data for demonstration
const dummyData = [
  { id: "1", studentName: "Rahul Sharma", college: "IIT Delhi", companyName: "Google", jobDesignation: "Software Engineer", salary: "28", placedDate: { seconds: Date.now() / 1000 - 86400 * 30 }, course: "B.Tech Computer Science", specialization: "Machine Learning" },
  { id: "2", studentName: "Priya Patel", college: "IIT Bombay", companyName: "Microsoft", jobDesignation: "Product Manager", salary: "32", placedDate: { seconds: Date.now() / 1000 - 86400 * 15 }, course: "B.Tech Information Technology", specialization: "Data Science" },
  { id: "3", studentName: "Amit Kumar", college: "IIT Delhi", companyName: "Amazon", jobDesignation: "System Engineer", salary: "24", placedDate: { seconds: Date.now() / 1000 - 86400 * 7 }, course: "B.Tech Computer Science", specialization: "Cyber Security" },
  { id: "4", studentName: "Sneha Reddy", college: "IIT Madras", companyName: "Adobe", jobDesignation: "UI/UX Designer", salary: "18", placedDate: { seconds: Date.now() / 1000 - 86400 * 45 }, course: "B.Des", specialization: "Digital Design" },
  { id: "5", studentName: "Vikram Singh", college: "IIT Kanpur", companyName: "Flipkart", jobDesignation: "Data Analyst", salary: "16", placedDate: { seconds: Date.now() / 1000 - 86400 * 20 }, course: "B.Tech Computer Science", specialization: "Data Analytics" },
  { id: "6", studentName: "Kavita Jain", college: "IIT Bombay", companyName: "Goldman Sachs", jobDesignation: "Business Analyst", salary: "22", placedDate: { seconds: Date.now() / 1000 - 86400 * 10 }, course: "B.Tech Information Technology", specialization: "Finance" },
  { id: "7", studentName: "Rohit Verma", college: "IIT Delhi", companyName: "Netflix", jobDesignation: "DevOps Engineer", salary: "26", placedDate: { seconds: Date.now() / 1000 - 86400 * 25 }, course: "B.Tech Computer Science", specialization: "Cloud Computing" },
  { id: "8", studentName: "Anjali Gupta", college: "IIT Madras", companyName: "Tesla", jobDesignation: "Software Engineer", salary: "30", placedDate: { seconds: Date.now() / 1000 - 86400 * 5 }, course: "B.Tech Electrical Engineering", specialization: "Embedded Systems" },
  { id: "9", studentName: "Arjun Nair", college: "IIT Kanpur", companyName: "Apple", jobDesignation: "iOS Developer", salary: "27", placedDate: { seconds: Date.now() / 1000 - 86400 * 12 }, course: "B.Tech Computer Science", specialization: "Mobile Development" },
  { id: "10", studentName: "Meera Joshi", college: "IIT Delhi", companyName: "Facebook", jobDesignation: "Frontend Developer", salary: "25", placedDate: { seconds: Date.now() / 1000 - 86400 * 18 }, course: "B.Tech Information Technology", specialization: "Web Development" },
  { id: "11", studentName: "Sandeep Rao", college: "IIT Bombay", companyName: "Oracle", jobDesignation: "Database Administrator", salary: "23", placedDate: { seconds: Date.now() / 1000 - 86400 * 22 }, course: "B.Tech Computer Science", specialization: "Database Management" },
  { id: "12", studentName: "Pooja Sharma", college: "IIT Madras", companyName: "IBM", jobDesignation: "Cloud Architect", salary: "29", placedDate: { seconds: Date.now() / 1000 - 86400 * 8 }, course: "B.Tech Computer Science", specialization: "Cloud Computing" },
  { id: "13", studentName: "Rajesh Kumar", college: "IIT Kanpur", companyName: "Cisco", jobDesignation: "Network Engineer", salary: "21", placedDate: { seconds: Date.now() / 1000 - 86400 * 35 }, course: "B.Tech Electrical Engineering", specialization: "Networking" },
  { id: "14", studentName: "Kiran Patel", college: "IIT Delhi", companyName: "SAP", jobDesignation: "ERP Consultant", salary: "26", placedDate: { seconds: Date.now() / 1000 - 86400 * 14 }, course: "B.Tech Information Technology", specialization: "Enterprise Software" },
  { id: "15", studentName: "Neha Singh", college: "IIT Bombay", companyName: "Accenture", jobDesignation: "Software Consultant", salary: "24", placedDate: { seconds: Date.now() / 1000 - 86400 * 28 }, course: "B.Tech Computer Science", specialization: "Consulting" },
  { id: "16", studentName: "Vivek Gupta", college: "IIT Madras", companyName: "Deloitte", jobDesignation: "Technology Analyst", salary: "22", placedDate: { seconds: Date.now() / 1000 - 86400 * 16 }, course: "B.Tech Information Technology", specialization: "Business Intelligence" },
  { id: "17", studentName: "Anita Reddy", college: "IIT Kanpur", companyName: "PwC", jobDesignation: "Risk Consultant", salary: "25", placedDate: { seconds: Date.now() / 1000 - 86400 * 9 }, course: "B.Tech Computer Science", specialization: "Risk Management" },
  { id: "18", studentName: "Manoj Jain", college: "IIT Delhi", companyName: "EY", jobDesignation: "Assurance Associate", salary: "20", placedDate: { seconds: Date.now() / 1000 - 86400 * 40 }, course: "B.Com", specialization: "Finance" },
  { id: "19", studentName: "Swati Verma", college: "IIT Bombay", companyName: "KPMG", jobDesignation: "Audit Associate", salary: "19", placedDate: { seconds: Date.now() / 1000 - 86400 * 50 }, course: "B.Com", specialization: "Accounting" },
  { id: "20", studentName: "Ravi Kumar", college: "IIT Madras", companyName: "ZS Associates", jobDesignation: "Business Analyst", salary: "21", placedDate: { seconds: Date.now() / 1000 - 86400 * 6 }, course: "B.Tech Information Technology", specialization: "Analytics" },
  { id: "21", studentName: "Priyanka Singh", college: "IIT Kanpur", companyName: "Mu Sigma", jobDesignation: "Decision Scientist", salary: "23", placedDate: { seconds: Date.now() / 1000 - 86400 * 11 }, course: "B.Tech Computer Science", specialization: "Data Science" },
  { id: "22", studentName: "Amit Sharma", college: "IIT Delhi", companyName: "Fractal Analytics", jobDesignation: "Data Scientist", salary: "27", placedDate: { seconds: Date.now() / 1000 - 86400 * 13 }, course: "B.Tech Computer Science", specialization: "Machine Learning" },
  { id: "23", studentName: "Kavita Patel", college: "IIT Bombay", companyName: "Tiger Analytics", jobDesignation: "Senior Analyst", salary: "24", placedDate: { seconds: Date.now() / 1000 - 86400 * 17 }, course: "B.Tech Information Technology", specialization: "Analytics" },
  { id: "24", studentName: "Suresh Reddy", college: "IIT Madras", companyName: "Genpact", jobDesignation: "Process Associate", salary: "18", placedDate: { seconds: Date.now() / 1000 - 86400 * 32 }, course: "B.Tech Computer Science", specialization: "Operations" },
  { id: "25", studentName: "Meena Gupta", college: "IIT Kanpur", companyName: "Wipro", jobDesignation: "Project Engineer", salary: "20", placedDate: { seconds: Date.now() / 1000 - 86400 * 26 }, course: "B.Tech Computer Science", specialization: "Software Development" },
  { id: "26", studentName: "Raj Kumar", college: "IIT Delhi", companyName: "TCS", jobDesignation: "Systems Engineer", salary: "19", placedDate: { seconds: Date.now() / 1000 - 86400 * 38 }, course: "B.Tech Information Technology", specialization: "Systems" },
  { id: "27", studentName: "Sunita Jain", college: "IIT Bombay", companyName: "Infosys", jobDesignation: "Technology Analyst", salary: "21", placedDate: { seconds: Date.now() / 1000 - 86400 * 4 }, course: "B.Tech Computer Science", specialization: "Technology" },
  { id: "28", studentName: "Vijay Singh", college: "IIT Madras", companyName: "HCL", jobDesignation: "Software Developer", salary: "22", placedDate: { seconds: Date.now() / 1000 - 86400 * 19 }, course: "B.Tech Computer Science", specialization: "Development" },
  { id: "29", studentName: "Rekha Patel", college: "IIT Kanpur", companyName: "Tech Mahindra", jobDesignation: "Associate Engineer", salary: "20", placedDate: { seconds: Date.now() / 1000 - 86400 * 23 }, course: "B.Tech Information Technology", specialization: "Engineering" },
  { id: "30", studentName: "Anil Kumar", college: "IIT Delhi", companyName: "Cognizant", jobDesignation: "Programmer Analyst", salary: "18", placedDate: { seconds: Date.now() / 1000 - 86400 * 41 }, course: "B.Tech Computer Science", specialization: "Programming" },
];

// Loading Skeleton Component
const LoadingSkeleton = ({ type }) => {
  if (type === "card") {
    return (
      <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg border border-gray-200 animate-pulse p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-300 rounded w-24"></div>
          <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
        </div>
        <div className="h-10 bg-gray-300 rounded w-16 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-20"></div>
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-pulse">
        <div className="p-6">
          <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-300 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                  <div className="h-3 bg-gray-300 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-300 rounded w-20"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <div className="h-8 bg-gray-300 rounded animate-pulse"></div>;
};

const PlacedStudent = ({ onClose }) => {
  const [placedStudents, setPlacedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("");
  const [sortBy, setSortBy] = useState("placedDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchPlacedStudents = useCallback(() => {
    setLoading(true);
    try {
      // For now, using dummy data instead of Firebase
      // Simulate API delay
      setTimeout(() => {
        setPlacedStudents(dummyData);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching placed students:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlacedStudents();
  }, [fetchPlacedStudents]);

  // Calculate statistics
  const totalPlaced = placedStudents.length;
  const avgPackage =
    totalPlaced > 0
      ? Math.round(
          placedStudents.reduce(
            (sum, student) => sum + parseFloat(student.salary || 0),
            0
          ) / totalPlaced
        )
      : 0;
  const uniqueCompaniesCount = new Set(placedStudents.map((s) => s.companyName))
    .size;

  // Get unique companies and colleges arrays for dropdowns
  const uniqueCompanies = [
    ...new Set(placedStudents.map((s) => s.companyName).filter(Boolean)),
  ];
  const uniqueColleges = [
    ...new Set(placedStudents.map((s) => s.college).filter(Boolean)),
  ];

  // Get today's placements
  const today = new Date().toDateString();
  const todayPlacements = placedStudents.filter((student) => {
    if (!student.placedDate?.seconds) return false;
    const placedDate = new Date(
      student.placedDate.seconds * 1000
    ).toDateString();
    return placedDate === today;
  }).length;

  // Get recent placements (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentPlacements = placedStudents.filter((student) => {
    if (!student.placedDate?.seconds) return false;
    const placedDate = new Date(student.placedDate.seconds * 1000);
    return placedDate >= thirtyDaysAgo;
  }).length;

  // Filter and sort students
  const filteredStudents = placedStudents
    .filter((student) => {
      const matchesSearch =
        !searchTerm ||
        student.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.college?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.jobDesignation
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesCompany =
        !selectedCompany || student.companyName === selectedCompany;
      const matchesCollege =
        !selectedCollege || student.college === selectedCollege;

      return matchesSearch && matchesCompany && matchesCollege;
    })
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "studentName":
          aValue = a.studentName?.toLowerCase() || "";
          bValue = b.studentName?.toLowerCase() || "";
          break;
        case "companyName":
          aValue = a.companyName?.toLowerCase() || "";
          bValue = b.companyName?.toLowerCase() || "";
          break;
        case "salary":
          aValue = parseFloat(a.salary || 0);
          bValue = parseFloat(b.salary || 0);
          break;
        case "placedDate":
        default:
          aValue = a.placedDate?.seconds || 0;
          bValue = b.placedDate?.seconds || 0;
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Student Name",
      "College",
      "Company",
      "Position",
      "Salary (LPA)",
      "Placed Date",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredStudents.map((student) =>
        [
          `"${student.studentName}"`,
          `"${student.college}"`,
          `"${student.companyName}"`,
          `"${student.jobDesignation}"`,
          student.salary,
          student.placedDate
            ? new Date(student.placedDate.seconds * 1000).toLocaleDateString()
            : "N/A",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "placed_students.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 px-2">
      {/* Header */}
      <div className="mb-2 ">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Placement Dashboard
            </h1>
            <p className="text-sm text-gray-600">
              Track and analyze student placements with comprehensive insights
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-md"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back
            </button>
            <button
              onClick={() => setShowCalendar(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-md"
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Calendar View
            </button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-xs font-medium text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <DownloadIcon className="h-4 w-4 mr-1" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

        {/* Key Metrics */}
        <div className="mb-6 p-0">
 
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <>
                <LoadingSkeleton type="card" />
                <LoadingSkeleton type="card" />
                <LoadingSkeleton type="card" />
                <LoadingSkeleton type="card" />
              </>
            ) : (
              <>
                <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg shadow-md border border-blue-200 hover:shadow-lg transition-all duration-200 p-4 transform hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                        Today's Placements
                      </p>
                      <p className="text-2xl font-extrabold text-blue-900 mt-1">
                        {todayPlacements}
                      </p>
                      <p className="text-xs text-green-600 font-medium mt-1 flex items-center">
                        <TrendingUpIcon className="h-3 w-3 mr-1" />+
                        {recentPlacements} this month
                      </p>
                    </div>
                    <div className="h-10 w-10 bg-blue-200 rounded-lg flex items-center justify-center">
                      <FiCalendar className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                </div>

                <div className="bg-linear-to-br from-green-50 to-green-100 rounded-lg shadow-md border border-green-200 hover:shadow-lg transition-all duration-200 p-4 transform hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                        Total Placed
                      </p>
                      <p className="text-2xl font-extrabold text-green-900 mt-1">
                        {totalPlaced}
                      </p>
                      <p className="text-xs text-gray-600 font-medium mt-1">
                        Students secured
                      </p>
                    </div>
                    <div className="h-10 w-10 bg-green-200 rounded-lg flex items-center justify-center">
                      <FiUsers className="h-5 w-5 text-green-700" />
                    </div>
                  </div>
                </div>

                <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg shadow-md border border-purple-200 hover:shadow-lg transition-all duration-200 p-4 transform hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                        Average Package
                      </p>
                      <p className="text-2xl font-extrabold text-purple-900 mt-1">
                        {avgPackage} LPA
                      </p>
                      <p className="text-xs text-indigo-600 font-medium mt-1">
                        Industry standard
                      </p>
                    </div>
                    <div className="h-10 w-10 bg-purple-200 rounded-lg flex items-center justify-center">
                      <FiTrendingUp className="h-5 w-5 text-purple-700" />
                    </div>
                  </div>
                </div>

                <div className="bg-linear-to-br from-orange-50 to-orange-100 rounded-lg shadow-md border border-orange-200 hover:shadow-lg transition-all duration-200 p-4 transform hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                        Companies
                      </p>
                      <p className="text-2xl font-extrabold text-orange-900 mt-1">
                        {uniqueCompaniesCount}
                      </p>
                      <p className="text-xs text-red-600 font-medium mt-1">
                        Active recruiters
                      </p>
                    </div>
                    <div className="h-10 w-10 bg-orange-200 rounded-lg flex items-center justify-center">
                      <OfficeBuildingIcon className="h-5 w-5 text-orange-700" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mb-6 p-0">
          {/* Filters and Search Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-4">
            <div className="p-2 space-y-2">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-gray-900">
                  Search & Filters
                </h2>
                <p className="text-sm text-gray-600">
                  Find and filter placed students by various criteria
                </p>
              </div>
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students, companies, positions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white"
                  >
                    <option value="">All Companies</option>
                    {uniqueCompanies.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedCollege}
                    onChange={(e) => setSelectedCollege(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white"
                  >
                    <option value="">All Colleges</option>
                    {uniqueColleges.map((college) => (
                      <option key={college} value={college}>
                        {college}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Students Table Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="p-2 space-y-2">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-gray-900">
                  Placed Students
                </h2>
                <p className="text-sm text-gray-600">
                  Detailed list of all placed students with sorting and pagination
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 ">
                <table className="min-w-full divide-y divide-gray-200 ">
                  <thead className="bg-linear-to-r from-gray-50 to-gray-100 ">
                    <tr>
                      <th
                        className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors duration-200 px-4 py-3 rounded-tl-lg "
                        onClick={() => handleSort("studentName")}
                      >
                        <div className="flex items-center">
                          Student
                          {sortBy === "studentName" && (
                            <ChevronDownIcon
                              className={`ml-1 h-4 w-4 transform transition-transform duration-200 ${
                                sortOrder === "asc" ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors duration-200 px-4 py-3"
                        onClick={() => handleSort("companyName")}
                      >
                        <div className="flex items-center">
                          Company
                          {sortBy === "companyName" && (
                            <ChevronDownIcon
                              className={`ml-1 h-4 w-4 transform transition-transform duration-200 ${
                                sortOrder === "asc" ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </div>
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wider px-4 py-3">
                        Position
                      </th>
                      <th
                        className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors duration-200 px-4 py-3"
                        onClick={() => handleSort("salary")}
                      >
                        <div className="flex items-center">
                          Package
                          {sortBy === "salary" && (
                            <ChevronDownIcon
                              className={`ml-1 h-4 w-4 transform transition-transform duration-200 ${
                                sortOrder === "asc" ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors duration-200 px-4 py-3"
                        onClick={() => handleSort("placedDate")}
                      >
                        <div className="flex items-center">
                          Placed Date
                          {sortBy === "placedDate" && (
                            <ChevronDownIcon
                              className={`ml-1 h-4 w-4 transform transition-transform duration-200 ${
                                sortOrder === "asc" ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </div>
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wider px-4 py-3 rounded-tr-lg">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedStudents.map((student, index) => (
                      <tr
                        key={student.id}
                        className={`${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-blue-50 transition-colors duration-300`}
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                              {student.studentName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900">
                                {student.studentName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {student.college}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {student.companyName}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {student.jobDesignation}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="text-sm font-bold text-green-600">
                            {student.salary} LPA
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {student.placedDate
                              ? new Date(
                                  student.placedDate.seconds * 1000
                                ).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 shadow-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                            Placed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-gray-200 bg-linear-to-r from-gray-50 to-gray-100 p-0 py-3 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-700">
                      Showing page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
                      >
                        Previous
                      </button>
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum =
                          Math.max(
                            1,
                            Math.min(totalPages - 4, currentPage - 2)
                          ) + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-xs font-medium border rounded-lg transition-all duration-200 hover:shadow-md ${
                              currentPage === pageNum
                                ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-lg transform scale-105"
                                : "border-gray-300 bg-white hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Modal */}
        {showCalendar && (
          <div className="fixed inset-0 flex items-center justify-center z-60">
            <div
              className="fixed inset-0  bg-opacity-50 backdrop-blur-sm"
              onClick={() => setShowCalendar(false)}
            ></div>
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden z-60 relative">
              <button
                onClick={() => setShowCalendar(false)}
                className="absolute top-5 right-3 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white hover:border-gray-300 transition-all duration-200 shadow-sm"
              >
                <XIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
              </button>
              <div>
                <PlacedStdCalendar placedStudents={placedStudents} />
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default PlacedStudent;
