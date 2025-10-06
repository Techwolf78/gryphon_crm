import React from 'react';
import { FiTarget, FiMail, FiEye, FiShare2, FiTrendingUp } from 'react-icons/fi';
import { FaRocket } from 'react-icons/fa';
import { motion } from 'framer-motion';

const MarketingDashboard = () => {
  // Metrics data
  const metrics = [
    { title: 'Campaigns', value: '8', icon: <FiTarget size={20} />, color: 'bg-purple-500' },
    { title: 'Leads Generated', value: '324', icon: <FiMail size={20} />, color: 'bg-blue-500' },
    { title: 'Impressions', value: '12.4k', icon: <FiEye size={20} />, color: 'bg-green-500' },
    { title: 'Engagement Rate', value: '4.8%', icon: <FiShare2 size={20} />, color: 'bg-pink-500' }
  ];

  // Emojis for the animation
  const marketingEmojis = ['📈', '📊', '📢', '🎯', '💡'];

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Marketing Dashboard</h2>
        <p className="text-gray-600">Track and analyze your marketing performance</p>
      </div>

      {/* Metrics Grid */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {metrics.map((metric, index) => (
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
                <p className="text-sm font-medium text-white/80">{metric.title}</p>
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
        <div className="p-6 md:p-8 text-center">
          {/* Animated Rocket */}
          <motion.div
            animate={{ 
              y: [0, -10, 0],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2,
              ease: "easeInOut"
            }}
            className="mb-6"
          >
            <FaRocket className="text-indigo-500 text-5xl mx-auto" />
          </motion.div>

          {/* Content */}
          <h3 className="text-xl font-bold text-gray-800 mb-3">Enhanced Analytics Coming Soon</h3>
          <p className="text-gray-600 max-w-lg mx-auto mb-6">
            We're working on powerful new marketing insights to help you optimize your campaigns and maximize ROI.
          </p>



          {/* Emoji Animation */}
          <div className="flex justify-center space-x-3 mt-6">
            {marketingEmojis.map((emoji, i) => (
              <motion.span
                key={i}
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  delay: i * 0.2,
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-2xl"
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

export default MarketingDashboard;
