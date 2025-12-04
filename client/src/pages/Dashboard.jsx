import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Zap, Target, BookOpen, FolderKanban, Activity, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import ActivityHeatmap from '../components/ActivityHeatmap';
import api from '../utils/api';

// Skeleton Components
function StatCardSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-dark-600 rounded" />
          <div className="h-8 w-12 bg-dark-600 rounded" />
        </div>
        <div className="w-11 h-11 bg-dark-600 rounded-xl" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-dark-600 rounded-xl" />
        <div className="space-y-2">
          <div className="h-5 w-32 bg-dark-600 rounded" />
          <div className="h-3 w-48 bg-dark-600 rounded" />
        </div>
      </div>
      <div className="h-64 bg-dark-700/50 rounded-lg flex items-end justify-around p-4">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className="w-6 bg-dark-600 rounded-t" 
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function QuickStatSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="h-3 w-24 bg-dark-600 rounded mb-3" />
      <div className="h-7 w-10 bg-dark-600 rounded" />
    </div>
  );
}

// Stat Card Component - memoized for performance
const StatCard = memo(function StatCard({ label, value, icon: Icon, bgColor }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
});

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const dataFetched = useRef(false);

  const loadDashboardData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      
      // Use Promise.allSettled to handle partial failures
      const results = await Promise.allSettled([
        api.getStats(),
        api.getHeatmapData(),
        api.getProgressData()
      ]);
      
      // Check if ALL failed (likely auth issue)
      const allFailed = results.every(r => r.status === 'rejected');
      if (allFailed) {
        const error = results[0].reason;
        throw error;
      }
      
      // Extract successful results
      if (results[0].status === 'fulfilled') setStats(results[0].value);
      if (results[1].status === 'fulfilled') setHeatmapData(results[1].value);
      if (results[2].status === 'fulfilled') setProgressData(results[2].value);
      
      if (showRefresh) {
        toast.success('Dashboard refreshed');
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
      // Only show toast on manual refresh or if not already showing
      if (showRefresh || loading) {
        toast.error(error.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

  useEffect(() => {
    // Prevent double fetch in React Strict Mode
    if (dataFetched.current) return;
    dataFetched.current = true;
    loadDashboardData();
  }, [loadDashboardData]);

  // Memoize chart data transformation to prevent recalculation on every render
  const chartData = useMemo(() => {
    return progressData?.weeklyActivities?.map((item, index) => ({
      week: `W${index + 1}`,
      activities: item.count,
      skills: Math.floor(item.count * 0.3) + index
    })) || [];
  }, [progressData]);

  // Memoize stat cards to prevent recreation on every render
  const statCards = useMemo(() => [
    { 
      label: 'Skills Mastered', 
      value: stats?.skills?.mastered || 0, 
      icon: Target, 
      bgColor: 'bg-emerald-500'
    },
    { 
      label: 'Currently Learning', 
      value: stats?.skills?.learning || 0, 
      icon: BookOpen, 
      bgColor: 'bg-blue-500'
    },
    { 
      label: 'Active Projects', 
      value: stats?.projects?.active || 0, 
      icon: FolderKanban, 
      bgColor: 'bg-violet-500'
    },
    { 
      label: 'Active Days (30d)', 
      value: stats?.activeDaysLast30 || 0, 
      icon: Activity, 
      bgColor: 'bg-amber-500'
    },
  ], [stats]);

  // Memoize quick stats to prevent recreation on every render
  const quickStats = useMemo(() => [
    { 
      label: 'Total Skills Tracked', 
      value: (stats?.skills?.mastered || 0) + (stats?.skills?.learning || 0) + (stats?.skills?.want_to_learn || 0)
    },
    { 
      label: 'Total Projects', 
      value: (stats?.projects?.idea || 0) + (stats?.projects?.active || 0) + (stats?.projects?.completed || 0)
    },
    { 
      label: 'Resources Saved', 
      value: stats?.resources || 0 
    }
  ], [stats]);

  // Loading state with skeletons
  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-dark-600 rounded mb-2" />
          <div className="h-4 w-64 bg-dark-700 rounded" />
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>

        {/* Chart skeleton */}
        <ChartSkeleton />

        {/* Heatmap skeleton */}
        <div className="glass-card p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-dark-600 rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-24 bg-dark-600 rounded" />
              <div className="h-3 w-40 bg-dark-600 rounded" />
            </div>
          </div>
          <div className="h-32 bg-dark-700/50 rounded-lg" />
        </div>

        {/* Quick stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <QuickStatSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Your development journey at a glance</p>
        </div>
        <button
          onClick={() => loadDashboardData(true)}
          disabled={refreshing}
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <StatCard key={card.label} {...card} index={index} />
        ))}
      </div>

      {/* Learning Progress Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <TrendingUp className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Learning Progress</h2>
            <p className="text-sm text-gray-400">Activity over the last 12 weeks</p>
          </div>
        </div>
        
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSkills" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22242e" />
                <XAxis dataKey="week" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#14151c', 
                    border: '1px solid #22242e',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)'
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="activities" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorActivities)" 
                  name="Activities"
                />
                <Area 
                  type="monotone" 
                  dataKey="skills" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSkills)" 
                  name="Skill Progress"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No activity data yet</p>
                <p className="text-sm mt-1">Start learning to see your progress!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Activity Log</h2>
            <p className="text-sm text-gray-400">Your consistency over the past year</p>
          </div>
        </div>
        
        <ActivityHeatmap data={heatmapData} />
        
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-[10px] h-[10px] rounded-sm bg-[#2d333b]" />
            <div className="w-[10px] h-[10px] rounded-sm bg-[#0e4429]" />
            <div className="w-[10px] h-[10px] rounded-sm bg-[#006d32]" />
            <div className="w-[10px] h-[10px] rounded-sm bg-[#26a641]" />
            <div className="w-[10px] h-[10px] rounded-sm bg-[#39d353]" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickStats.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <h3 className="text-gray-400 text-sm mb-2">{stat.label}</h3>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
