import React, { useState, useMemo, useEffect } from 'react';
import { FiTrendingUp, FiDollarSign, FiUsers, FiCalendar, FiRefreshCw, FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase'; // Make sure this path is correct for your firebase config

const SalesDashboard = () => {
  // State for time period selection
  const [timePeriod, setTimePeriod] = useState('month');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [leadSources, setLeadSources] = useState([]);
  // Add this with your other state declarations at the top
const [dateRange, setDateRange] = useState({ start: null, end: null });


    // Color palette for charts
  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Fetch lead sources data from Firebase
  const fetchLeadSources = async () => {
    setIsLoading(true);
    try {
      const leadsRef = collection(db, 'leads');
      const q = query(leadsRef, where('contactMethod', 'in', ['Call', 'Visit']));
      const querySnapshot = await getDocs(q);
      
      // Count contact methods
      const counts = {
        Call: 0,
        Visit: 0
      };
      
      querySnapshot.forEach((doc) => {
        const method = doc.data().contactMethod;
        if (method === 'Call' || method === 'Visit') {
          counts[method]++;
        }
      });
      
      // Convert to array format for Pie chart
      const sourcesData = [
        { name: 'Call', value: counts.Call },
        { name: 'Visit', value: counts.Visit }
      ];
      
      setLeadSources(sourcesData);
    } catch (error) {
      console.error('Error fetching lead sources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadSources();
  }, []);

  // Mock data - in a real app this would come from an API
  const [data, setData] = useState({
    revenue: 0,
    growth: 0,
    conversions: 0,
    activeLeads: 0,
    chartData: [],
    leadSources: [],
    teamPerformance: [],
    recentActivity: []
  });

  // Color scheme
  const colors = {
    primary: '#4F46E5',
    secondary: '#10B981',
    accent: '#F59E0B',
    background: '#F9FAFB',
    text: '#111827',
    muted: '#6B7280'
  };

  // Simulate data loading
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate mock data based on time period
      const mockData = generateMockData(timePeriod);
      setData(mockData);
      setIsLoading(false);
    };

    fetchData();
  }, [timePeriod, dateRange]);

  // Generate mock data function
  const generateMockData = (period) => {
    const baseValue = period === 'week' ? 1000 : period === 'month' ? 5000 : 25000;
    const growthFactor = period === 'week' ? 0.15 : period === 'month' ? 0.25 : 0.4;
    
    const chartData = Array.from({ length: period === 'week' ? 7 : period === 'month' ? 30 : 12 }, (_, i) => ({
      name: period === 'week' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i] : 
            period === 'month' ? `Week ${i % 4 + 1}` : 
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      revenue: Math.floor(baseValue * (0.8 + Math.random() * 0.4)),
      leads: Math.floor(baseValue * (0.7 + Math.random() * 0.6) / 10),
      conversions: Math.floor(baseValue * (0.1 + Math.random() * 0.2) / 20)
    }));

    const leadSources = [
      { name: 'Website', value: Math.floor(Math.random() * 40) + 30 },
      { name: 'Referral', value: Math.floor(Math.random() * 30) + 15 },
      { name: 'Social', value: Math.floor(Math.random() * 20) + 10 },
      { name: 'Email', value: Math.floor(Math.random() * 15) + 5 },
      { name: 'Other', value: Math.floor(Math.random() * 10) + 5 }
    ];

    const teamPerformance = [
      { name: 'Alex Johnson', value: Math.floor(Math.random() * 20) + 15, role: 'Account Executive' },
      { name: 'Sarah Williams', value: Math.floor(Math.random() * 20) + 15, role: 'Sales Manager' },
      { name: 'Michael Chen', value: Math.floor(Math.random() * 20) + 15, role: 'Business Dev' },
      { name: 'Emily Davis', value: Math.floor(Math.random() * 20) + 15, role: 'Account Manager' },
      { name: 'David Kim', value: Math.floor(Math.random() * 20) + 15, role: 'Sales Rep' }
    ];

    const recentActivity = [
      { id: 1, action: 'Closed deal', amount: 25000, company: 'Acme Corp', user: 'Alex Johnson', time: '2 hours ago' },
      { id: 2, action: 'New lead', amount: null, company: 'Globex', user: 'Sarah Williams', time: '4 hours ago' },
      { id: 3, action: 'Follow-up', amount: 12000, company: 'Initech', user: 'Michael Chen', time: '1 day ago' },
      { id: 4, action: 'Proposal sent', amount: 18000, company: 'Umbrella Corp', user: 'Emily Davis', time: '2 days ago' },
      { id: 5, action: 'Meeting scheduled', amount: null, company: 'Stark Industries', user: 'David Kim', time: '3 days ago' }
    ];

    return {
      revenue: baseValue * (1 + growthFactor),
      growth: growthFactor * 100,
      conversions: Math.floor(baseValue * 0.15),
      activeLeads: Math.floor(baseValue * 0.3),
      chartData,
      leadSources,
      teamPerformance,
      recentActivity
    };
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={`tooltip-${index}`} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom legend for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-medium">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className=" mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sales Analytics</h1>
            <p className="text-gray-600 mt-1">Key metrics and performance indicators</p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <FiFilter className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters</span>
                {isFilterOpen ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Time Period</h3>
                    <div className="space-y-1">
                      {['week', 'month', 'quarter', 'year'].map((period) => (
                        <button
                          key={period}
                          onClick={() => {
                            setTimePeriod(period);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                            timePeriod === period
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  setData(generateMockData(timePeriod));
                  setIsLoading(false);
                }, 800);
              }}
              className={`p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${isLoading ? 'animate-spin' : ''}`}
              disabled={isLoading}
            >
              <FiRefreshCw className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              title: 'Total Revenue',
              value: `$${(data.revenue || 0).toLocaleString()}`,
              change: data.growth,
              icon: <FiDollarSign className="text-white" size={20} />,
              color: 'bg-indigo-600'
            },
            {
              title: 'Active Leads',
              value: (data.activeLeads || 0).toLocaleString(),
              change: 12.5,
              icon: <FiUsers className="text-white" size={20} />,
              color: 'bg-green-600'
            },
            {
              title: 'Conversions',
              value: (data.conversions || 0).toLocaleString(),
              change: 8.2,
              icon: <FiTrendingUp className="text-white" size={20} />,
              color: 'bg-amber-500'
            },
            {
              title: 'Avg. Cycle Time',
              value: '24 days',
              change: -3.2,
              icon: <FiCalendar className="text-white" size={20} />,
              color: 'bg-purple-600'
            }
          ].map((metric, index) => (
            <div 
              key={index} 
              className={`${metric.color} rounded-xl p-5 text-white transition-all hover:shadow-lg`}
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
              <div className="mt-4 flex items-center">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  metric.change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {metric.change >= 0 ? '↑' : '↓'} {Math.abs(metric.change)}%
                </span>
                <span className="text-xs opacity-80 ml-2">vs last period</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Trend */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
              <div className="flex space-x-2">
                {['week', 'month', 'quarter'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`text-xs px-3 py-1 rounded-full ${
                      timePeriod === period
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#4F46E5" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

         {/* Lead Sources - Now connected to Firebase */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Sources</h2>
            <div className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadSources}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leadSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {leadSources.map((source, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-xs text-gray-600">
                    {source.name}: {source.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Performance */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h2>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3">
                    <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse"></div>
                  </div>
                ))
              ) : (
                data.teamPerformance?.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center">
                      <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-medium">
                        {member.name.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-32 h-2 bg-gray-200 rounded-full mr-3">
                        <div 
                          className="h-2 rounded-full bg-indigo-600" 
                          style={{ width: `${Math.min(100, member.value)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{member.value}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center p-3">
                    <div className="h-4 bg-gray-200 rounded-full w-full animate-pulse"></div>
                  </div>
                ))
              ) : (
                data.recentActivity?.map((activity) => (
                  <div key={activity.id} className="p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex justify-between">
                      <div className="flex items-start">
                        <div className={`p-2 rounded-lg ${
                          activity.amount ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'
                        }`}>
                          {activity.amount ? <FiDollarSign size={16} /> : <FiUsers size={16} />}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.company}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{activity.time}</span>
                    </div>
                    {activity.amount && (
                      <div className="mt-2 ml-11">
                        <span className="text-sm font-medium text-gray-900">
                          ${activity.amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;