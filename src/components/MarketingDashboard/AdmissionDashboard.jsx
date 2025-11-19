import React, { useState } from "react";
import {
  FaUsers,
  FaGraduationCap,
  FaChartLine,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaFilter,
  FaDownload,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaSearch,
  FaSort,
  FaArrowUp,
  FaArrowDown
} from "react-icons/fa";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AdmissionDashboard = () => {
  const [selectedStream, setSelectedStream] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Dummy data for 12th pass students seeking engineering admission
  const [students] = useState([
    {
      id: 1,
      name: "Rahul Sharma",
      email: "rahul.sharma@email.com",
      phone: "+91 9876543210",
      location: "Mumbai, Maharashtra",
      board: "CBSE",
      percentage: 94.2,
      physics: 95,
      chemistry: 93,
      maths: 96,
      preferredBranch: "B.Tech Computer Science",
      budget: "₹8-12 LPA",
      status: "converted",
      leadSource: "Website",
      interestedColleges: ["IIT Bombay", "VIT Vellore", "BITS Pilani"],
      applicationDate: "2025-01-15",
      counselingDate: "2025-01-20",
      admissionStatus: "confirmed"
    },
    {
      id: 2,
      name: "Priya Patel",
      email: "priya.patel@email.com",
      phone: "+91 9876543211",
      location: "Ahmedabad, Gujarat",
      board: "GSEB",
      percentage: 96.8,
      physics: 98,
      chemistry: 95,
      maths: 97,
      preferredBranch: "MBA Finance",
      budget: "₹6-10 LPA",
      status: "hot_lead",
      leadSource: "Social Media",
      interestedColleges: ["IIM Ahmedabad", "SP Jain", "MDI Gurgaon"],
      applicationDate: "2025-01-12",
      counselingDate: "2025-01-18",
      admissionStatus: "in_process"
    },
    {
      id: 3,
      name: "Amit Kumar",
      email: "amit.kumar@email.com",
      phone: "+91 9876543212",
      location: "Delhi, Delhi",
      board: "CBSE",
      percentage: 89.5,
      physics: 88,
      chemistry: 91,
      maths: 89,
      preferredBranch: "BCA",
      budget: "₹4-8 LPA",
      status: "warm_lead",
      leadSource: "Referral",
      interestedColleges: ["DU", "IP University", "Chandigarh University"],
      applicationDate: "2025-01-10",
      counselingDate: null,
      admissionStatus: "pending"
    },
    {
      id: 4,
      name: "Sneha Reddy",
      email: "sneha.reddy@email.com",
      phone: "+91 9876543213",
      location: "Hyderabad, Telangana",
      board: "TSBIE",
      percentage: 92.1,
      physics: 94,
      chemistry: 90,
      maths: 92,
      preferredBranch: "B.Pharm",
      budget: "₹5-9 LPA",
      status: "converted",
      leadSource: "College Fair",
      interestedColleges: ["JNTUH", "Osmania University", "BITS Hyderabad"],
      applicationDate: "2025-01-08",
      counselingDate: "2025-01-16",
      admissionStatus: "confirmed"
    },
    {
      id: 5,
      name: "Vikram Singh",
      email: "vikram.singh@email.com",
      phone: "+91 9876543214",
      location: "Jaipur, Rajasthan",
      board: "RBSE",
      percentage: 87.3,
      physics: 85,
      chemistry: 89,
      maths: 88,
      preferredBranch: "BBA",
      budget: "₹4-7 LPA",
      status: "cold_lead",
      leadSource: "Newspaper Ad",
      interestedColleges: ["Jaipur National University", "Manipal University", "Amity Jaipur"],
      applicationDate: "2025-01-05",
      counselingDate: null,
      admissionStatus: "not_interested"
    },
    {
      id: 6,
      name: "Kavita Jain",
      email: "kavita.jain@email.com",
      phone: "+91 9876543215",
      location: "Pune, Maharashtra",
      board: "CBSE",
      percentage: 95.7,
      physics: 97,
      chemistry: 94,
      maths: 96,
      preferredBranch: "MCA",
      budget: "₹7-11 LPA",
      status: "hot_lead",
      leadSource: "Website",
      interestedColleges: ["COEP", "VIT Pune", "Symbiosis Pune"],
      applicationDate: "2025-01-14",
      counselingDate: "2025-01-22",
      admissionStatus: "in_process"
    },
    {
      id: 7,
      name: "Arjun Mehta",
      email: "arjun.mehta@email.com",
      phone: "+91 9876543216",
      location: "Bangalore, Karnataka",
      board: "KSEEB",
      percentage: 91.4,
      physics: 92,
      chemistry: 89,
      maths: 93,
      preferredBranch: "M.Tech CSE",
      budget: "₹6-10 LPA",
      status: "converted",
      leadSource: "Social Media",
      interestedColleges: ["IISc Bangalore", "IIT Madras", "NIT Karnataka"],
      applicationDate: "2025-01-11",
      counselingDate: "2025-01-19",
      admissionStatus: "confirmed"
    },
    {
      id: 8,
      name: "Meera Iyer",
      email: "meera.iyer@email.com",
      phone: "+91 9876543217",
      location: "Chennai, Tamil Nadu",
      board: "TN HSC",
      percentage: 93.6,
      physics: 95,
      chemistry: 92,
      maths: 94,
      preferredBranch: "LLB",
      budget: "₹5-9 LPA",
      status: "warm_lead",
      leadSource: "Referral",
      interestedColleges: ["Anna University", "SRM Chennai", "VIT Chennai"],
      applicationDate: "2025-01-09",
      counselingDate: null,
      admissionStatus: "pending"
    },
    {
      id: 9,
      name: "Rohan Gupta",
      email: "rohan.gupta@email.com",
      phone: "+91 9876543218",
      location: "Kolkata, West Bengal",
      board: "WBCHSE",
      percentage: 88.9,
      physics: 87,
      chemistry: 90,
      maths: 90,
      preferredBranch: "B.Com (Hons)",
      budget: "₹3-6 LPA",
      status: "converted",
      leadSource: "Alumni Referral",
      interestedColleges: ["St. Xavier's Kolkata", "Christ University", "Jain University"],
      applicationDate: "2025-01-07",
      counselingDate: "2025-01-15",
      admissionStatus: "confirmed"
    },
    {
      id: 10,
      name: "Ananya Sharma",
      email: "ananya.sharma@email.com",
      phone: "+91 9876543219",
      location: "Mumbai, Maharashtra",
      board: "CBSE",
      percentage: 94.5,
      physics: 96,
      chemistry: 93,
      maths: 95,
      preferredBranch: "M.Sc Biotechnology",
      budget: "₹4-8 LPA",
      status: "hot_lead",
      leadSource: "Website",
      interestedColleges: ["TIFR", "IISc Bangalore", "JNU Delhi"],
      applicationDate: "2025-01-13",
      counselingDate: "2025-01-21",
      admissionStatus: "in_process"
    }
  ]);

  // Calculate metrics
  const totalLeads = students.length;
  const convertedStudents = students.filter(s => s.status === 'converted').length;
  const hotLeads = students.filter(s => s.status === 'hot_lead').length;
  const warmLeads = students.filter(s => s.status === 'warm_lead').length;
  const coldLeads = students.filter(s => s.status === 'cold_lead').length;
  const conversionRate = ((convertedStudents / totalLeads) * 100).toFixed(1);

  // Average percentage
  const avgPercentage = (students.reduce((sum, s) => sum + s.percentage, 0) / totalLeads).toFixed(1);

  // Program preferences
  const branchData = students.reduce((acc, student) => {
    // Extract main program type (e.g., "B.Tech", "MBA", "BCA", etc.)
    const program = student.preferredBranch.split(' ')[0];
    acc[program] = (acc[program] || 0) + 1;
    return acc;
  }, {});

  // Location data
  const locationData = students.reduce((acc, student) => {
    const city = student.location.split(',')[0];
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});

  // Status distribution
  const statusCounts = {
    converted: convertedStudents,
    hot_lead: hotLeads,
    warm_lead: warmLeads,
    cold_lead: coldLeads
  };

  // Filtered and sorted students
  const filteredStudents = students
    .filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStream = selectedStream === 'all' || student.preferredBranch === selectedStream;
      return matchesSearch && matchesStream;
    })
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'percentage') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const getStatusColor = (status) => {
    switch (status) {
      case 'converted': return 'bg-green-100 text-green-800';
      case 'hot_lead': return 'bg-red-100 text-red-800';
      case 'warm_lead': return 'bg-yellow-100 text-yellow-800';
      case 'cold_lead': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'converted': return <FaCheckCircle className="text-green-600" />;
      case 'hot_lead': return <FaExclamationTriangle className="text-red-600" />;
      case 'warm_lead': return <FaClock className="text-yellow-600" />;
      case 'cold_lead': return <FaClock className="text-gray-600" />;
      default: return <FaClock className="text-gray-600" />;
    }
  };

  // Chart data
  const branchChartData = {
    labels: Object.keys(branchData),
    datasets: [{
      label: 'Students',
      data: Object.values(branchData),
      backgroundColor: [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
        '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
      ],
      borderWidth: 1
    }]
  };

  const locationChartData = {
    labels: Object.keys(locationData),
    datasets: [{
      label: 'Students',
      data: Object.values(locationData),
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      borderWidth: 1
    }]
  };

  const statusChartData = {
    labels: ['Converted', 'Hot Leads', 'Warm Leads', 'Cold Leads'],
    datasets: [{
      data: [statusCounts.converted, statusCounts.hot_lead, statusCounts.warm_lead, statusCounts.cold_lead],
      backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#6B7280'],
      borderWidth: 1
    }]
  };

  const monthlyTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'New Leads',
      data: [12, 19, 15, 25, 22, 30],
      borderColor: '#3B82F6',
      backgroundColor: '#3B82F6',
      tension: 0.1
    }, {
      label: 'Conversions',
      data: [8, 12, 10, 18, 15, 22],
      borderColor: '#10B981',
      backgroundColor: '#10B981',
      tension: 0.1
    }]
  };

  return (
    <div className="bg-gray-50 min-h-screen p-2">
      <div className="max-w-auto mx-auto">
        {/* Development Banner */}
        <div className="mb-2 bg-yellow-200 text-black text-center py-2 rounded-lg font-medium">
          This represents dummy data and is under active development.
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Admission Dashboard</h1>
          <p className="text-sm text-gray-600">Comprehensive analytics for student admissions across all programs</p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 lg:gap-3 mb-3 lg:mb-4">
          <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">Total Leads</p>
              <FaUsers className="text-2xl text-blue-600" />
            </div>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalLeads}</p>
            <div className="flex items-center mt-1">
              <FaArrowUp className="text-green-500 mr-1 text-xs" />
              <span className="text-xs text-green-600">+12%</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">Converted</p>
              <FaGraduationCap className="text-2xl text-green-600" />
            </div>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{convertedStudents}</p>
            <div className="flex items-center mt-1">
              <FaArrowUp className="text-green-500 mr-1 text-xs" />
              <span className="text-xs text-green-600">+8%</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">Conversion</p>
              <FaChartLine className="text-2xl text-purple-600" />
            </div>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{conversionRate}%</p>
            <div className="flex items-center mt-1">
              <FaArrowUp className="text-green-500 mr-1 text-xs" />
              <span className="text-xs text-green-600">+5%</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">Avg Score</p>
              <FaCheckCircle className="text-2xl text-yellow-600" />
            </div>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{avgPercentage}%</p>
            <div className="flex items-center mt-1">
              <FaArrowUp className="text-green-500 mr-1 text-xs" />
              <span className="text-xs text-green-600">+2.1%</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 lg:gap-3 mb-3 lg:mb-4">
          {/* Program Preferences */}
          <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
            <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-2">Program Preferences</h3>
            <div className="h-32 sm:h-36 lg:h-40">
              <Pie data={branchChartData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 20,
                      usePointStyle: true
                    }
                  }
                }
              }} />
            </div>
          </div>

          {/* Location Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
            <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-2">Student Locations</h3>
            <div className="h-32 sm:h-36 lg:h-40">
              <Bar data={locationChartData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }} />
            </div>
          </div>

          {/* Lead Status */}
          <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
            <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-2">Lead Status</h3>
            <div className="h-32 sm:h-36 lg:h-40">
              <Doughnut data={statusChartData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 20,
                      usePointStyle: true
                    }
                  }
                }
              }} />
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
            <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-2">Monthly Trends</h3>
            <div className="h-32 sm:h-36 lg:h-40">
              <Line data={monthlyTrendData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top'
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }} />
            </div>
          </div>
        </div>

        {/* Student Details Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-3 lg:p-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-3">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900">Student Leads & Applications</h3>

              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                <div className="relative">
                  <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <select
                  value={selectedStream}
                  onChange={(e) => setSelectedStream(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Programs</option>
                  <option value="B.Tech/B.E">B.Tech/B.E</option>
                  <option value="M.Tech/M.E">M.Tech/M.E</option>
                  <option value="MBA">MBA</option>
                  <option value="BBA">BBA</option>
                  <option value="BCA">BCA</option>
                  <option value="MCA">MCA</option>
                  <option value="B.Com">B.Com</option>
                  <option value="M.Com">M.Com</option>
                  <option value="B.Sc">B.Sc</option>
                  <option value="M.Sc">M.Sc</option>
                  <option value="BA">BA</option>
                  <option value="MA">MA</option>
                  <option value="B.Pharm">B.Pharm</option>
                  <option value="M.Pharm">M.Pharm</option>
                  <option value="LLB">LLB</option>
                  <option value="LLM">LLM</option>
                </select>

                <button className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <FaDownload className="text-xs" />
                  Export
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 lg:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => {
                          setSortBy('name');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        Student
                        {sortBy === 'name' && (
                          sortOrder === 'asc' ? <FaArrowUp className="text-xs" /> : <FaArrowDown className="text-xs" />
                        )}
                      </button>
                    </th>
                    <th className="px-2 lg:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => {
                          setSortBy('location');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        Location
                        {sortBy === 'location' && (
                          sortOrder === 'asc' ? <FaArrowUp className="text-xs" /> : <FaArrowDown className="text-xs" />
                        )}
                      </button>
                    </th>
                    <th className="px-2 lg:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => {
                          setSortBy('percentage');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        Percentage
                        {sortBy === 'percentage' && (
                          sortOrder === 'asc' ? <FaArrowUp className="text-xs" /> : <FaArrowDown className="text-xs" />
                        )}
                      </button>
                    </th>
                    <th className="px-2 lg:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                    <th className="px-2 lg:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-2 lg:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-2 lg:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-2 lg:px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-6 w-6">
                            <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">
                                {student.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          </div>
                          <div className="ml-2">
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            <div className="text-xs text-gray-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="text-gray-400 mr-1 shrink-0" />
                          <span className="text-sm text-gray-900 truncate max-w-20">{student.location}</span>
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 py-2 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{student.percentage}%</span>
                        <div className="text-xs text-gray-500">
                          P:{student.physics} C:{student.chemistry} M:{student.maths}
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 py-2 whitespace-nowrap">
                        <span className="text-sm text-gray-900 truncate max-w-24">{student.preferredBranch}</span>
                      </td>
                      <td className="px-2 lg:px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                          {getStatusIcon(student.status)}
                          <span className="ml-1 capitalize hidden sm:inline">{student.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-2 lg:px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {student.leadSource}
                      </td>
                      <td className="px-2 lg:px-4 py-2 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-1">
                          <button className="text-blue-600 hover:text-blue-900 p-1">
                            <FaEye className="text-xs" />
                          </button>
                          <button className="text-green-600 hover:text-green-900 p-1">
                            <FaCheckCircle className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-3 lg:px-4 py-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-700">
                Showing {filteredStudents.length} of {totalLeads} students
              </div>
              <div className="flex items-center space-x-1">
                <button className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">
                  Previous
                </button>
                <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs">
                  1
                </button>
                <button className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmissionDashboard;