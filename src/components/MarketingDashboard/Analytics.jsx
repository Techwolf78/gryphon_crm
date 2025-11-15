import React, { useState, useEffect } from "react";
import {
  FaInstagram,
  FaLinkedin,
  FaTwitter,
  FaFacebook,
  FaYoutube,
  FaChartLine,
  FaUsers,
  FaEye,
  FaHeart,
  FaShare,
  FaComment,
  FaCalendarAlt,
  FaFilter,
  FaDownload,
  FaArrowUp,
  FaArrowDown,
  FaPlay,
  FaThumbsUp,
  FaRetweet,
  FaExternalLinkAlt,
  FaClock,
  FaFire,
  FaRocket,
  FaStar,
  FaTrophy
} from "react-icons/fa";
import { Bar, Line, Doughnut, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
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
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const [selectedPlatform, setSelectedPlatform] = useState("instagram");
  const [selectedTimeframe, setSelectedTimeframe] = useState("month");
  const [postImages, setPostImages] = useState([]);

  // Fetch images from Picsum (free, no API key needed)
  useEffect(() => {
    const fetchImages = async () => {
      try {
        // Generate random image URLs from Picsum
        const images = Array.from({ length: 10 }, (_, i) =>
          `https://picsum.photos/400/400?random=${i + Date.now()}`
        );
        setPostImages(images);
      } catch (error) {
        console.error('Error setting up images:', error);
        // Fallback to themed placeholder images
        const fallbackImages = Array.from({ length: 10 }, (_, i) =>
          `https://via.placeholder.com/400x400/${['6366f1', '10b981', '8b5cf6', 'f59e0b'][i % 4]}/FFFFFF?text=Post+${i + 1}`
        );
        setPostImages(fallbackImages);
      }
    };

    fetchImages();
  }, []);

  // Comprehensive dummy data for all platforms
  const analyticsData = {
    instagram: {
      overview: {
        followers: 45230,
        following: 1250,
        posts: 234,
        avgEngagement: 4.8,
        reachGrowth: 12.5,
        engagementGrowth: 8.3
      },
      performance: {
        totalReach: 1250000,
        totalEngagement: 58000,
        totalLikes: 45200,
        totalComments: 12800,
        totalShares: 4200,
        avgLikesPerPost: 193,
        avgCommentsPerPost: 55,
        avgSharesPerPost: 18
      },
      topPosts: [
        {
          id: 1,
          type: "carousel",
          caption: "Behind the scenes of our latest engineering project! 🚀 #Engineering #Innovation",
          likes: 1250,
          comments: 89,
          shares: 34,
          reach: 15400,
          engagement: 1373,
          date: "2025-01-15",
          image: "https://via.placeholder.com/400x400/FF6B6B/FFFFFF?text=Engineering+Project"
        },
        {
          id: 2,
          type: "reel",
          caption: "Quick tip for 12th pass students choosing engineering! 🎓 #EngineeringTips",
          likes: 980,
          comments: 156,
          shares: 67,
          reach: 12800,
          engagement: 1203,
          date: "2025-01-12",
          image: "https://via.placeholder.com/400x400/4ECDC4/FFFFFF?text=Engineering+Tips"
        },
        {
          id: 3,
          type: "static",
          caption: "Meet our star performer - Arjun from IIT Bombay! 🌟 #SuccessStory",
          likes: 875,
          comments: 92,
          shares: 45,
          reach: 11200,
          engagement: 1012,
          date: "2025-01-10",
          image: "https://via.placeholder.com/400x400/45B7D1/FFFFFF?text=Success+Story"
        }
      ],
      trending: {
        risingHashtags: ["#Engineering", "#JEE", "#IIT", "#EngineeringLife", "#FutureEngineer"],
        risingTopics: ["JEE Preparation", "Engineering Colleges", "Career Guidance", "Admission Tips"],
        peakHours: ["10:00 AM", "2:00 PM", "7:00 PM", "9:00 PM"]
      },
      audience: {
        ageGroups: { "18-24": 45, "25-34": 35, "35-44": 15, "45+": 5 },
        gender: { male: 62, female: 38 },
        topLocations: ["Mumbai", "Delhi", "Bangalore", "Pune", "Ahmedabad"],
        interests: ["Education", "Technology", "Engineering", "Career Development"]
      },
      timeSeries: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        reach: [78000, 95000, 112000, 89000, 135000, 142000, 118000, 158000, 145000, 162000, 138000, 175000],
        engagement: [3800, 5200, 6100, 4200, 7800, 8200, 5800, 9200, 8500, 9800, 7200, 10500],
        followers: [35000, 38500, 42800, 41200, 46100, 48500, 47200, 49800, 51200, 52800, 54200, 55800]
      }
    },
    linkedin: {
      overview: {
        followers: 12850,
        connections: 2450,
        posts: 89,
        avgEngagement: 2.3,
        reachGrowth: 18.7,
        engagementGrowth: 15.2
      },
      performance: {
        totalReach: 456000,
        totalEngagement: 15800,
        totalLikes: 12400,
        totalComments: 2850,
        totalShares: 550,
        avgLikesPerPost: 139,
        avgCommentsPerPost: 32,
        avgSharesPerPost: 6
      },
      topPosts: [
        {
          id: 1,
          type: "article",
          caption: "Industry insights: The future of engineering education in India",
          likes: 450,
          comments: 67,
          shares: 23,
          reach: 8900,
          engagement: 540,
          date: "2025-01-14",
          image: "https://via.placeholder.com/400x400/96CEB4/FFFFFF?text=Industry+Insights"
        },
        {
          id: 2,
          type: "poll",
          caption: "Which engineering branch interests you most? #EngineeringPoll",
          likes: 380,
          comments: 89,
          shares: 12,
          reach: 7200,
          engagement: 481,
          date: "2025-01-11",
          image: "https://via.placeholder.com/400x400/FECA57/FFFFFF?text=Engineering+Poll"
        }
      ],
      trending: {
        risingHashtags: ["#EngineeringCareers", "#IndustryInsights", "#STEM", "#ProfessionalDevelopment"],
        risingTopics: ["Career Advice", "Industry Trends", "Professional Networking", "Skill Development"],
        peakHours: ["9:00 AM", "12:00 PM", "4:00 PM", "6:00 PM"]
      },
      audience: {
        ageGroups: { "25-34": 55, "35-44": 30, "18-24": 10, "45+": 5 },
        gender: { male: 68, female: 32 },
        topLocations: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai"],
        interests: ["Professional Development", "Technology", "Business", "Education"]
      },
      timeSeries: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        reach: [22000, 35000, 28000, 42000, 38000, 51000, 46000, 48000, 53000, 49000, 55000, 58000],
        engagement: [950, 1650, 1200, 2100, 1800, 2500, 2200, 2400, 2700, 2300, 2900, 3100],
        followers: [8800, 9500, 9200, 10200, 10800, 11500, 11200, 12100, 12800, 13200, 13800, 14500]
      }
    },
    twitter: {
      overview: {
        followers: 8920,
        following: 1200,
        tweets: 456,
        avgEngagement: 1.8,
        reachGrowth: 22.1,
        engagementGrowth: 12.8
      },
      performance: {
        totalReach: 234000,
        totalEngagement: 8900,
        totalLikes: 6500,
        totalRetweets: 2100,
        totalReplies: 300,
        avgLikesPerTweet: 14,
        avgRetweetsPerTweet: 5,
        avgRepliesPerTweet: 1
      },
      topPosts: [
        {
          id: 1,
          type: "thread",
          caption: "Complete guide to engineering admissions for 12th pass students 🧵",
          likes: 234,
          retweets: 89,
          replies: 45,
          reach: 5600,
          engagement: 368,
          date: "2025-01-13",
          image: "https://via.placeholder.com/400x400/FF9FF3/FFFFFF?text=Admission+Guide"
        }
      ],
      trending: {
        risingHashtags: ["#JEETips", "#EngineeringAdmissions", "#IITJEE", "#EngineeringLife"],
        risingTopics: ["Exam Tips", "Admission Updates", "College Reviews", "Career Advice"],
        peakHours: ["8:00 AM", "1:00 PM", "6:00 PM", "10:00 PM"]
      },
      audience: {
        ageGroups: { "18-24": 60, "25-34": 30, "35-44": 8, "45+": 2 },
        gender: { male: 65, female: 35 },
        topLocations: ["Delhi", "Mumbai", "Bangalore", "Kolkata", "Chennai"],
        interests: ["Education", "Technology", "News", "Entertainment"]
      },
      timeSeries: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        reach: [12000, 18000, 15000, 22000, 19000, 26000, 23000, 28000, 25000, 29000, 27000, 31000],
        engagement: [520, 780, 650, 920, 810, 1100, 950, 1250, 1080, 1320, 1150, 1450],
        followers: [6800, 7200, 7100, 7800, 8200, 8600, 8400, 8900, 9200, 9500, 9800, 10200]
      }
    },
    facebook: {
      overview: {
        followers: 67800,
        likes: 65200,
        posts: 178,
        avgEngagement: 3.2,
        reachGrowth: 15.3,
        engagementGrowth: 9.7
      },
      performance: {
        totalReach: 890000,
        totalEngagement: 28500,
        totalLikes: 22100,
        totalComments: 5200,
        totalShares: 1200,
        avgLikesPerPost: 124,
        avgCommentsPerPost: 29,
        avgSharesPerPost: 7
      },
      topPosts: [
        {
          id: 1,
          type: "video",
          caption: "Virtual tour of our engineering campus! 🎥",
          likes: 890,
          comments: 156,
          shares: 78,
          reach: 12500,
          engagement: 1124,
          date: "2025-01-16",
          image: "https://via.placeholder.com/400x400/54A0FF/FFFFFF?text=Campus+Tour"
        }
      ],
      trending: {
        risingHashtags: ["#EngineeringCampus", "#CollegeLife", "#FutureEngineers", "#Education"],
        risingTopics: ["Campus Events", "Student Life", "Academic Programs", "Alumni Stories"],
        peakHours: ["11:00 AM", "3:00 PM", "8:00 PM"]
      },
      audience: {
        ageGroups: { "18-24": 40, "25-34": 35, "35-44": 20, "45+": 5 },
        gender: { male: 58, female: 42 },
        topLocations: ["Mumbai", "Delhi", "Bangalore", "Pune", "Ahmedabad"],
        interests: ["Education", "Family", "Technology", "Entertainment"]
      },
      timeSeries: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        reach: [58000, 72000, 65000, 85000, 78000, 92000, 88000, 101000, 95000, 108000, 102000, 115000],
        engagement: [1800, 2350, 2100, 3200, 2800, 3800, 3400, 4200, 3900, 4500, 4100, 4800],
        followers: [55000, 57500, 56800, 61200, 62800, 64500, 63800, 66200, 67800, 69200, 70800, 72500]
      }
    },
    youtube: {
      overview: {
        subscribers: 15600,
        totalViews: 245000,
        videos: 67,
        avgViewsPerVideo: 3657,
        subscriberGrowth: 25.8,
        viewGrowth: 18.4
      },
      performance: {
        totalWatchTime: "45,200 hours",
        avgWatchTime: "3:25",
        clickThroughRate: 8.5,
        likes: 12800,
        dislikes: 320,
        comments: 890,
        shares: 450
      },
      topVideos: [
        {
          id: 1,
          title: "Complete JEE Preparation Strategy for 12th Pass Students",
          views: 45200,
          likes: 2100,
          comments: 345,
          duration: "15:30",
          uploadDate: "2025-01-08",
          thumbnail: "https://via.placeholder.com/400x400/FF9F43/FFFFFF?text=JEE+Strategy"
        },
        {
          id: 2,
          title: "Engineering Branches Explained | Which One to Choose?",
          views: 38900,
          likes: 1850,
          comments: 278,
          duration: "12:45",
          uploadDate: "2025-01-05",
          thumbnail: "https://via.placeholder.com/400x400/EE5A24/FFFFFF?text=Engineering+Branches"
        }
      ],
      trending: {
        risingTopics: ["JEE Preparation", "Engineering Careers", "College Admissions", "Study Tips"],
        peakHours: ["6:00 PM", "8:00 PM", "10:00 AM", "2:00 PM"],
        topCategories: ["Education", "How-to", "Vlogs"]
      },
      audience: {
        ageGroups: { "13-17": 25, "18-24": 45, "25-34": 20, "35+": 10 },
        gender: { male: 70, female: 30 },
        topLocations: ["India", "United States", "United Kingdom", "Canada", "Australia"],
        interests: ["Education", "Science", "Technology", "Career Development"]
      },
      timeSeries: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        views: [15000, 22000, 18000, 28000, 24000, 32000, 29000, 35000, 33000, 38000, 36000, 42000],
        subscribers: [11800, 12200, 12000, 12800, 13200, 13800, 13500, 14200, 14800, 15200, 15500, 16000],
        watchTime: [7200, 8900, 7800, 10200, 9200, 11800, 10500, 12500, 11500, 13200, 12800, 14500]
      }
    }
  };

  const currentData = analyticsData[selectedPlatform] || analyticsData.instagram;

  // Early return if no data available
  if (!currentData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Loading Analytics...</h2>
          <p className="text-gray-600 mt-2">Please wait while we load your social media data.</p>
        </div>
      </div>
    );
  }

  const platforms = [
    { id: "instagram", name: "Instagram", icon: FaInstagram, color: "#E4405F" },
    { id: "linkedin", name: "LinkedIn", icon: FaLinkedin, color: "#0077B5" },
    { id: "twitter", name: "Twitter", icon: FaTwitter, color: "#1DA1F2" },
    { id: "facebook", name: "Facebook", icon: FaFacebook, color: "#1877F2" },
    { id: "youtube", name: "YouTube", icon: FaYoutube, color: "#FF0000" }
  ];

  const timeframes = [
    { id: "day", name: "Today" },
    { id: "week", name: "This Week" },
    { id: "month", name: "This Month" },
    { id: "quarter", name: "This Quarter" },
    { id: "year", name: "This Year" }
  ];

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Filter data based on selected timeframe
  const getFilteredData = (data, timeframe) => {
    if (!data || !data.timeSeries || !data.timeSeries.labels || !data.timeSeries.reach || !data.timeSeries.engagement) {
      return data;
    }

    let monthsToShow = 12; // Default to full year

    switch (timeframe) {
      case 'day':
        // For "Today", show last month data (since we don't have daily data)
        monthsToShow = 1;
        break;
      case 'week':
        // For "This Week", show last 3 months data
        monthsToShow = 3;
        break;
      case 'month':
        // For "This Month", show last 6 months data
        monthsToShow = 6;
        break;
      case 'quarter':
        // For "This Quarter", show last 9 months data
        monthsToShow = 9;
        break;
      case 'year':
      default:
        // For "This Year", show all 12 months
        monthsToShow = 12;
        break;
    }

    const filteredLabels = data.timeSeries.labels.slice(-monthsToShow);
    const filteredReach = data.timeSeries.reach.slice(-monthsToShow);
    const filteredEngagement = data.timeSeries.engagement.slice(-monthsToShow);
    const filteredFollowers = data.timeSeries.followers || data.timeSeries.subscribers || [];
    const filteredFollowersData = filteredFollowers.slice(-monthsToShow);

    // Calculate filtered metrics
    const totalReach = filteredReach.reduce((sum, val) => sum + val, 0);
    const totalEngagement = filteredEngagement.reduce((sum, val) => sum + val, 0);
    const avgEngagement = totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(1) : 0;

    return {
      ...data,
      timeSeries: {
        ...data.timeSeries,
        labels: filteredLabels,
        reach: filteredReach,
        engagement: filteredEngagement,
        followers: filteredFollowersData,
        subscribers: filteredFollowersData
      },
      performance: {
        ...data.performance,
        totalReach,
        totalEngagement
      },
      overview: {
        ...data.overview,
        avgEngagement: parseFloat(avgEngagement)
      }
    };
  };

  const filteredData = getFilteredData(currentData, selectedTimeframe) || currentData;

  // Chart data
  const engagementChartData = {
    labels: filteredData?.timeSeries?.labels || [],
    datasets: [{
      label: 'Reach',
      data: filteredData?.timeSeries?.reach || [],
      borderColor: '#6366f1',
      backgroundColor: '#6366f1',
      tension: 0.1
    }, {
      label: 'Engagement',
      data: filteredData?.timeSeries?.engagement || [],
      borderColor: '#10b981',
      backgroundColor: '#10b981',
      tension: 0.1
    }]
  };

  const audienceChartData = {
    labels: filteredData?.audience?.ageGroups ? Object.keys(filteredData.audience.ageGroups) : [],
    datasets: [{
      data: filteredData?.audience?.ageGroups ? Object.values(filteredData.audience.ageGroups) : [],
      backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6'],
      borderWidth: 1
    }]
  };

  // Additional chart data
  const genderChartData = {
    labels: filteredData?.audience?.gender ? Object.keys(filteredData.audience.gender) : [],
    datasets: [{
      data: filteredData?.audience?.gender ? Object.values(filteredData.audience.gender) : [],
      backgroundColor: ['#ec4899', '#3b82f6'],
      borderWidth: 1
    }]
  };

  const locationsChartData = {
    labels: filteredData?.audience?.topLocations || [],
    datasets: [{
      label: 'Audience Size',
      data: filteredData?.audience?.topLocations ? filteredData.audience.topLocations.map((_, index) => Math.max(20, 100 - index * 15)) : [],
      backgroundColor: '#8b5cf6',
      borderRadius: 4,
    }]
  };

  const growthChartData = {
    labels: filteredData?.timeSeries?.labels || [],
    datasets: [{
      label: 'Followers/Subscribers',
      data: filteredData?.timeSeries?.followers || filteredData?.timeSeries?.subscribers || [],
      borderColor: '#8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      tension: 0.1,
      fill: true
    }]
  };

  const engagementRateChartData = {
    labels: filteredData?.timeSeries?.labels || [],
    datasets: [{
      label: 'Engagement Rate %',
      data: filteredData?.timeSeries?.labels && filteredData?.timeSeries?.reach && filteredData?.timeSeries?.engagement
        ? filteredData.timeSeries.labels.map((_, index) => {
            const reach = filteredData.timeSeries.reach[index] || 0;
            const engagement = filteredData.timeSeries.engagement[index] || 0;
            return reach > 0 ? ((engagement / reach) * 100).toFixed(1) : 0;
          })
        : [],
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      tension: 0.1,
      fill: true
    }]
  };

  return (
    <div className="space-y-3">
      {/* Development Banner */}
      <div className="mb-2 bg-yellow-200 text-black text-center py-2 rounded-lg font-medium">
        This represents dummy data and is under active development.
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Social Media Analytics</h2>
          <p className="text-sm text-gray-600">Performance insights across platforms</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
          >
            {timeframes.map(tf => (
              <option key={tf.id} value={tf.id}>{tf.name}</option>
            ))}
          </select>

          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <FaDownload />
            Export
          </button>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-3 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {platforms.map(platform => (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                  selectedPlatform === platform.id
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <platform.icon style={{ color: platform.color }} />
                {platform.name}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-linear-to-r from-indigo-50 to-indigo-100 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">Total Reach</p>
                  <p className="text-xl font-bold text-indigo-900">{formatNumber(filteredData?.performance?.totalReach)}</p>
                </div>
                <FaEye className="text-2xl text-indigo-600" />
              </div>
              <div className="mt-3 flex items-center">
                <FaArrowUp className="text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{filteredData?.overview?.reachGrowth}%</span>
              </div>
            </div>

            <div className="bg-linear-to-r from-emerald-50 to-emerald-100 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600">Total Engagement</p>
                  <p className="text-xl font-bold text-emerald-900">{formatNumber(filteredData?.performance?.totalEngagement)}</p>
                </div>
                <FaChartLine className="text-2xl text-emerald-600" />
              </div>
              <div className="mt-3 flex items-center">
                <FaArrowUp className="text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{filteredData?.overview?.engagementGrowth}%</span>
              </div>
            </div>

            <div className="bg-linear-to-r from-violet-50 to-violet-100 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-600">
                    {selectedPlatform === 'youtube' ? 'Subscribers' : 'Followers'}
                  </p>
                  <p className="text-xl font-bold text-violet-900">
                    {formatNumber(filteredData?.overview?.followers || filteredData?.overview?.subscribers)}
                  </p>
                </div>
                <FaUsers className="text-2xl text-violet-600" />
              </div>
              <div className="mt-3 flex items-center">
                <FaArrowUp className="text-green-500 mr-1" />
                  <span className="text-sm text-green-600">
                    +{filteredData?.overview?.reachGrowth || filteredData?.overview?.subscriberGrowth}%
                  </span>
              </div>
            </div>

            <div className="bg-linear-to-r from-amber-50 to-amber-100 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Avg Engagement</p>
                  <p className="text-xl font-bold text-amber-900">{filteredData?.overview?.avgEngagement}%</p>
                </div>
                <FaFire className="text-2xl text-amber-600" />
              </div>
              <div className="mt-3 flex items-center">
                <FaArrowUp className="text-green-500 mr-1" />
                <span className="text-sm text-green-600">+2.1%</span>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Performance Trends */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
              <div className="h-48">
                <Line
                  data={engagementChartData}
                  options={{
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
                          font: {
                            size: 12,
                          },
                        },
                      },
                      x: {
                        ticks: {
                          font: {
                            size: 12,
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Audience Age */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Audience Age</h3>
              <div className="h-48">
                <Doughnut
                  data={audienceChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    cutout: '60%'
                  }}
                />
              </div>
            </div>

            {/* Gender Distribution */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
              <div className="h-48">
                <Doughnut
                  data={genderChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    cutout: '60%'
                  }}
                />
              </div>
            </div>

            {/* Top Locations */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h3>
              <div className="h-48">
                <Bar
                  data={locationsChartData}
                  options={{
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
                          font: {
                            size: 12,
                          },
                        },
                      },
                      x: {
                        ticks: {
                          font: {
                            size: 10,
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Follower Growth */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Follower Growth</h3>
              <div className="h-48">
                <Line
                  data={growthChartData}
                  options={{
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
                          font: {
                            size: 12,
                          },
                        },
                      },
                      x: {
                        ticks: {
                          font: {
                            size: 12,
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Engagement Rate Trends */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Rate Trends</h3>
              <div className="h-48">
                <Line
                  data={engagementRateChartData}
                  options={{
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
                          font: {
                            size: 12,
                          },
                          callback: function(value) {
                            return value + '%';
                          }
                        },
                      },
                      x: {
                        ticks: {
                          font: {
                            size: 12,
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Top Performing Content */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 hover:shadow-lg transition-shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Content</h3>
              <p className="text-sm text-gray-600">Highest engagement posts</p>
            </div>

            <div className="divide-y divide-gray-200">
              {(currentData.topPosts || currentData.topVideos || []).slice(0, 3).map((post, index) => (
                <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0">
                      <img
                        src={postImages[index] || post.image || post.thumbnail || 'https://via.placeholder.com/400x400/6366f1/FFFFFF?text=Loading...'}
                        alt={post.caption || post.title}
                        className="w-12 h-12 rounded-md object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 mb-2 truncate">
                            {post.title || post.caption.substring(0, 60)}...
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <span className="flex items-center gap-1">
                              <FaCalendarAlt className="text-sm" />
                              {post.date || post.uploadDate}
                            </span>
                            <span className="flex items-center gap-1">
                              <FaEye className="text-sm" />
                              {formatNumber(post.reach || post.views)}
                            </span>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-1">
                              <FaHeart className="text-red-500 text-sm" />
                              <span className="text-sm text-gray-600">{formatNumber(post.likes)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaComment className="text-blue-500 text-sm" />
                              <span className="text-sm text-gray-600">{formatNumber(post.comments || post.replies)}</span>
                            </div>
                            {post.shares && (
                              <div className="flex items-center gap-1">
                                <FaShare className="text-green-500 text-sm" />
                                <span className="text-sm text-gray-600">{formatNumber(post.shares)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            'bg-indigo-100 text-indigo-800'
                          }`}>
                            {index === 0 && <FaTrophy className="mr-1 text-sm" />}
                            #{index + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Rising Hashtags */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaRocket className="text-orange-500 text-lg" />
                Hashtags
              </h3>
              <div className="space-y-3">
                {(filteredData?.trending?.risingHashtags || []).slice(0, 3).map((hashtag, index) => (
                  <div key={hashtag} className="flex items-center justify-between">
                    <span className="text-sm text-indigo-600 font-medium truncate max-w-24">{hashtag}</span>
                    <span className="text-sm text-gray-500">#{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak Hours */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaClock className="text-violet-500 text-lg" />
                Peak Hours
              </h3>
              <div className="space-y-3">
                {(filteredData?.trending?.peakHours || []).slice(0, 3).map((hour, index) => (
                  <div key={hour} className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">{hour}</span>
                    <div className="w-16 bg-violet-200 rounded-full h-2">
                      <div
                        className="bg-violet-600 h-2 rounded-full"
                        style={{ width: `${Math.max(30, 100 - index * 30)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Interests */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaStar className="text-amber-500 text-lg" />
                Interests
              </h3>
              <div className="space-y-3">
                {(filteredData?.audience?.interests || []).slice(0, 3).map((interest, index) => (
                  <div key={interest} className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 truncate max-w-24">{interest}</span>
                    <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                      {Math.max(20, 100 - index * 25)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
