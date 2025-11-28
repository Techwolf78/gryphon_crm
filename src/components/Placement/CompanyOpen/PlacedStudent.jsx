import React, { useState, useEffect, useCallback } from "react";
import { collection, getDocs } from 'firebase/firestore';
import { db } from "../../../firebase";
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

// No dummy data - Placed students will be loaded from Firestore 'placedStudents' collection.

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

  const fetchPlacedStudents = useCallback(async () => {
    setLoading(true);
    try {
      const placedRef = collection(db, 'placedStudents');
      const snapshot = await getDocs(placedRef);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (fetched && fetched.length > 0) {
        setPlacedStudents(fetched);
      } else {
        setPlacedStudents([]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching placed students:", error);
      setPlacedStudents([]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlacedStudents();
  }, [fetchPlacedStudents]);

  // Close calendar modal on Escape key
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        setShowCalendar(false);
      }
    };
    if (showCalendar) {
      document.addEventListener("keydown", handleKeydown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [showCalendar]);

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
                {filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H3V7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 11h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No placed students found</h3>
                    <p className="mt-1 text-xs text-gray-500">Placed students will appear here once finalised.</p>
                  </div>
                ) : (
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
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${student.status === 'Placed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} shadow-sm`}>
                            <div className={`${student.status === 'Placed' ? 'w-2 h-2 bg-green-500' : 'w-2 h-2 bg-gray-400'} rounded-full mr-1 ${student.status === 'Placed' ? 'animate-pulse' : ''}`}></div>
                            {student.status || 'Placed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
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
          <div
            className="fixed inset-0 flex items-center justify-center z-60"
            onClick={(e) => {
              // Close modal when clicking outside of modal content
              if (e.target === e.currentTarget) setShowCalendar(false);
            }}
          >
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowCalendar(false)}
            ></div>
            <div
              className="bg-white rounded-xl shadow-2xl overflow-hidden z-60 relative"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
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
