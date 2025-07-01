import React from 'react';
import { FiBookOpen, FiUsers, FiAward, FiBarChart2, FiTool, FiZap } from 'react-icons/fi';
import { motion } from 'framer-motion';

const LdDashboard = () => {
  return (
    <div className="px-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Learning & Development Dashboard</h2>
      
      {/* Metrics Cards
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Active Courses', value: '12', icon: <FiBookOpen size={20} />, color: 'bg-blue-500' },
          { title: 'Enrolled Students', value: '245', icon: <FiUsers size={20} />, color: 'bg-green-500' },
          { title: 'Certifications', value: '87', icon: <FiAward size={20} />, color: 'bg-purple-500' },
          { title: 'Completion Rate', value: '78%', icon: <FiBarChart2 size={20} />, color: 'bg-amber-500' }
        ].map((metric, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${metric.color} rounded-xl p-5 text-white shadow-lg`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium opacity-80">{metric.title}</p>
                <h3 className="text-2xl font-bold mt-1">{metric.value}</h3>
              </div>
              <div className="bg-black bg-opacity-20 p-2 rounded-lg">
                {metric.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div> */}

      {/* Fun Placeholder */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center"
      >
        <div className="max-w-md mx-auto">
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                y: [0, -10, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                repeatType: "reverse", 
                duration: 2 
              }}
            >
              <FiTool className="text-yellow-500 text-5xl mx-auto" />
            </motion.div>
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, 0],
                y: [0, 10, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                repeatType: "reverse", 
                duration: 2,
                delay: 0.5
              }}
            >
              <FiZap className="text-blue-500 text-5xl mx-auto" />
            </motion.div>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Under Construction</h3>
          <p className="text-gray-600 mb-6">
            Our team of digital builders is working hard to create an amazing learning experience dashboard!
          </p>
          
          <motion.div 
            className="bg-blue-50 rounded-lg p-4 border border-blue-100"
            animate={{
              background: ['#eff6ff', '#dbeafe', '#eff6ff']
            }}
            transition={{
              duration: 3,
              repeat: Infinity
            }}
          >
            <p className="text-blue-600 font-medium">
              Coming soon with interactive learning analytics and progress tracking!
            </p>
          </motion.div>
          
          <div className="mt-8 flex justify-center space-x-2">
            {['🛠️', '📚', '🎓', '🧠', '🚀'].map((emoji, i) => (
              <motion.span
                key={i}
                className="text-2xl"
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 20, -20, 0]
                }}
                transition={{
                  delay: i * 0.2,
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                {emoji}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LdDashboard;