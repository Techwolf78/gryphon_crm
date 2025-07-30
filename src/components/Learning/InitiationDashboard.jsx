import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {

  TrendingUp,
  LocationOn,
  MoreVert,
  Groups,
  Assignment,
  Analytics,
  Grade,
  Email,
  Phone,
  CalendarToday,
  Refresh,
  Download,
  KeyboardArrowDown
} from "@mui/icons-material";
import {
  School,
  CheckCircle,
  Pending,
  PlayCircle,
  Notifications,
  Settings,
  Person,
  Search,
  FilterList,
  Schedule // Add this import
} from "@mui/icons-material";

const phaseData = [
  {
    id: 1, name: "Initiation", status: "active", description: "Onboarding and setup phase", duration: "4 weeks",
    colleges: [
      { id: 101, name: "ABC College of Engineering", shortName: "ABC", students: 245, progress: 75, contact: "john.doe@abccollege.edu", phone: "+91 98765 43210", location: "Mumbai, Maharashtra", joinedDate: "2025-06-15", rating: 4.8, specialty: "Engineering", metrics: { attendance: 92, assignments: 85, engagement: 88 } },
      { id: 102, name: "XYZ University", shortName: "XYZ", students: 189, progress: 68, contact: "priya.sharma@xyz.edu", phone: "+91 87654 32109", location: "Delhi, India", joinedDate: "2025-06-20", rating: 4.6, specialty: "Business", metrics: { attendance: 88, assignments: 82, engagement: 90 } },
      { id: 103, name: "PQR Institute of Technology", shortName: "PQR", students: 156, progress: 82, contact: "rahul.tech@pqr.edu", phone: "+91 76543 21098", location: "Bangalore, Karnataka", joinedDate: "2025-06-10", rating: 4.9, specialty: "Technology", metrics: { attendance: 95, assignments: 90, engagement: 92 } }
    ]
  },
  { id: 2, name: "Training Phase I", status: "upcoming", description: "Core curriculum delivery", duration: "8 weeks", colleges: [{ id: 201, name: "LMN College", shortName: "LMN", students: 203, progress: 0, contact: "admin@lmn.edu", phone: "+91 65432 10987", location: "Chennai, Tamil Nadu", joinedDate: "2025-08-01", rating: 4.5, specialty: "Arts & Science", metrics: { attendance: 0, assignments: 0, engagement: 0 } }] },
  { id: 3, name: "Training Phase II", status: "upcoming", description: "Advanced skills development", duration: "6 weeks", colleges: [] },
  { id: 4, name: "Training Phase III", status: "upcoming", description: "Specialization & certification", duration: "4 weeks", colleges: [] },
  { id: 5, name: "Completed", status: "completed", description: "Successfully graduated programs", duration: "Completed", colleges: [{ id: 501, name: "GHI College of Excellence", shortName: "GHI", students: 178, progress: 100, contact: "info@ghi.edu", phone: "+91 54321 09876", location: "Pune, Maharashtra", joinedDate: "2025-03-01", completedDate: "2025-07-15", rating: 4.7, specialty: "Engineering", metrics: { attendance: 94, assignments: 96, engagement: 93 } }] }
];

const statusConfig = {
  active: { color: "indigo", gradient: "from-indigo-500 to-indigo-600", icon: PlayCircle },
  upcoming: { color: "blue", gradient: "from-blue-500 to-blue-600", icon: Schedule },
  completed: { color: "emerald", gradient: "from-emerald-500 to-emerald-600", icon: CheckCircle }
};

const statData = [
  { icon: Groups, title: "Total Students", key: "totalStudents", color: "blue", trend: "+12%" },
  { icon: School, title: "Active Colleges", key: "activeColleges", color: "indigo", trend: "+3" },
  { icon: Assignment, title: "Completed Programs", key: "completedPrograms", color: "emerald", trend: "+1" },
  { icon: Analytics, title: "Average Progress", key: "avgProgress", color: "amber", trend: "+5%" }
];

const TrainingDashboard = () => {
  const [activePhase, setActivePhase] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  }, [activePhase]);

  const currentPhase = phaseData[activePhase];
  const filteredColleges = currentPhase.colleges.filter(college =>
    college.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    college.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalStudents: phaseData.reduce((sum, phase) => sum + phase.colleges.reduce((s, c) => s + c.students, 0), 0),
    activeColleges: phaseData.filter(p => p.status === 'active').reduce((s, p) => s + p.colleges.length, 0),
    completedPrograms: phaseData.filter(p => p.status === 'completed').reduce((s, p) => s + p.colleges.length, 0),
    avgProgress: "73%"
  };

  const getProgressColor = (p) => p >= 80 ? "bg-emerald-500" : p >= 60 ? "bg-amber-500" : p >= 40 ? "bg-red-500" : "bg-gray-500";

  const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-2xl border border-gray-200 ${className}`}>{children}</div>
  );

  const StatCard = ({ icon: Icon, title, value, color, trend }) => (
    <motion.div whileHover={{ scale: 1.02, y: -2 }}>
      <Card className={`bg-gradient-to-br from-${color}-50 to-${color}-25 border-${color}-200 p-6 hover:shadow-2xl transition-all duration-300`}>
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <p className="text-gray-600 text-sm mb-2">{title}</p>
            <p className={`text-3xl font-bold text-${color}-600 mb-2`}>{value}</p>
            <div className={`bg-${color}-100 text-${color}-600 px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit ml-0`}>
              <TrendingUp className="w-3 h-3 mr-1" />{trend}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className={`bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-lg p-3 text-white`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );

  const PhaseTab = ({ phase, index, isActive }) => {
    const config = statusConfig[phase.status];
    return (
      <motion.div whileHover={{ scale: 1.02 }} onClick={() => setActivePhase(index)}>
        <Card className={`cursor-pointer p-4 transition-all duration-300 hover:shadow-xl ${
          isActive ? `bg-gradient-to-br ${config.gradient} text-white border-2 border-${config.color}-500` : 'hover:border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`rounded-lg p-2 ${isActive ? 'bg-white/20' : `bg-${config.color}-50`}`}>
              <config.icon className={`w-5 h-5 ${isActive ? 'text-white' : `text-${config.color}-600`}`} />
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>{phase.name}</h3>
              <p className={`text-sm ${isActive ? 'text-white/80' : 'text-gray-500'}`}>{phase.description}</p>
            </div>
            {phase.colleges.length > 0 && (
              <div className={`rounded-full px-2 py-1 text-xs font-semibold ${isActive ? 'bg-white/20 text-white' : `bg-${config.color}-50 text-${config.color}-600`}`}>
                {phase.colleges.length}
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${isActive ? 'bg-white/20 text-white' : `bg-${config.color}-50 text-${config.color}-600`}`}>
              {phase.status}
            </span>
            <span className={`text-xs font-medium ${isActive ? 'text-white/80' : 'text-gray-500'}`}>{phase.duration}</span>
          </div>
        </Card>
      </motion.div>
    );
  };

  const CollegeCard = ({ college, index }) => {
    const config = statusConfig[currentPhase.status];
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.02, y: -4 }}>
        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className={`bg-gradient-to-br ${config.gradient} p-6 text-white`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-3 border-white/30">
                <School className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{college.name}</h3>
                <div className="flex items-center gap-1 opacity-90">
                  <LocationOn className="w-4 h-4" />
                  <span className="text-sm">{college.location}</span>
                </div>
              </div>
              <MoreVert className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
            </div>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm opacity-90">Progress</span>
                <span className="text-sm font-semibold">{college.progress}%</span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${college.progress}%` }} transition={{ duration: 1, delay: index * 0.2 }} className="h-full bg-white/90 rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Groups className="w-4 h-4" />
                <span className="text-sm font-semibold">{college.students} Students</span>
              </div>
              <div className="flex items-center gap-1">
                <Grade className="w-4 h-4" />
                <span className="text-sm font-semibold">{college.rating} ★</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Performance Metrics</h4>
            <div className="space-y-3">
              {Object.entries(college.metrics).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 capitalize w-20">{key}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${getProgressColor(value)} rounded-full`} style={{ width: `${value}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-8">{value}%</span>
                  </div>
                </div>
              ))}
            </div>
            <hr className="my-4" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Email className="w-4 h-4" />
                <span>{college.contact}</span>
              </div>
              {college.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{college.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarToday className="w-4 h-4" />
                <span>
                  {currentPhase.status === "completed" ? "Completed: " : "Joined: "}
                  {currentPhase.status === "completed" ? college.completedDate : college.joinedDate}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-48 bg-gray-200 rounded-2xl mb-6 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-72 bg-gray-200 rounded-2xl animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 lg:p-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">Training Dashboard</h1>
              <p className="text-xl text-gray-600">Monitor and manage your college training programs</p>
            </div>
            <div className="flex gap-2">
              <button className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"><Refresh className="w-5 h-5" /></button>
              <button className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"><Download className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statData.map(stat => <StatCard key={stat.key} {...stat} value={stat.key === 'totalStudents' ? stats[stat.key].toLocaleString() : stats[stat.key]} />)}
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {phaseData.map((phase, index) => <PhaseTab key={phase.id} phase={phase} index={index} isActive={activePhase === index} />)}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
        <Card className="p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Search colleges or locations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <button className="px-4 py-3 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center gap-2">
              <FilterList className="w-5 h-5" />Filter<KeyboardArrowDown className="w-4 h-4" />
            </button>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence mode="wait">
        {filteredColleges.length > 0 ? (
          <motion.div key={activePhase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredColleges.map((college, index) => <CollegeCard key={college.id} college={college} index={index} />)}
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <Card className="border-2 border-dashed border-gray-300 text-center py-16">
              <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No colleges in this phase</h3>
              <p className="text-gray-600 mb-6">
                {currentPhase.status === "upcoming" ? "Colleges will appear here when this phase begins" : "Start by adding colleges to this training phase"}
              </p>
              <button className={`bg-gradient-to-r ${statusConfig[currentPhase.status].gradient} text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}>Add College</button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrainingDashboard;