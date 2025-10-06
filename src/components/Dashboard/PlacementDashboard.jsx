import React from 'react';
import { FiBriefcase, FiUserCheck, FiMapPin, FiUsers, FiBarChart2 } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { FaHandshake, FaRupeeSign } from 'react-icons/fa';

const PlacementDashboard = () => {
  // Metrics data
  const placementMetrics = [
    { title: 'Placements', value: '56', icon: <FiBriefcase size={20} />, color: 'bg-indigo-600' },
    { title: 'Avg. Salary', value: '₹85k', icon: <FaRupeeSign size={20} />, color: 'bg-green-600' },
    { title: 'Active Candidates', value: '132', icon: <FiUserCheck size={20} />, color: 'bg-amber-500' },
    { title: 'Top Location', value: 'Remote', icon: <FiMapPin size={20} />, color: 'bg-red-500' }
  ];

  // Stats for the coming soon section
  const placementStats = [
    { label: 'Placement Rate', value: '92%' },
    { label: 'Avg. Time to Hire', value: '3.2 weeks' },
    { label: 'Candidate Satisfaction', value: '4.8/5' }
  ];

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Placement Dashboard</h1>
        <p className="text-gray-600">Track candidate placements and hiring metrics</p>
      </div>

      {/* Metrics Grid */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {placementMetrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.03 }}
            className={`${metric.color} rounded-lg p-5 text-white shadow-md transition-all`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-white/90">{metric.title}</p>
                <h3 className="text-2xl font-bold mt-1">{metric.value}</h3>
              </div>
              <div className="p-2 rounded-lg bg-white/10">
                {metric.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div> */}

      {/* Coming Soon Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6 md:p-8">
          <div className="text-center mb-6">
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                repeat: Infinity,
                repeatType: "reverse",
                duration: 3
              }}
              className="inline-block mb-4"
            >
              <FaHandshake className="text-indigo-500 text-5xl" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Advanced Placement Analytics Coming Soon</h3>
            <p className="text-gray-600 max-w-lg mx-auto">
              We're enhancing our placement tracking with detailed candidate pipelines and employer insights.
            </p>
          </div>

          {/* Candidate Pipeline Animation */}
          <div className="flex justify-center space-x-3 mt-8">
            {['👨‍🎓', '👩‍💼', '🧑‍💻', '👨‍⚕️', '👩‍🔬'].map((emoji, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  delay: i * 0.2,
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-3xl"
              >
                {emoji}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PlacementDashboard;
