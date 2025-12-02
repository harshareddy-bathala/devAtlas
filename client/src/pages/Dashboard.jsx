import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Zap, Target, BookOpen, FolderKanban, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { PageLoader } from '../components/LoadingStates';
import api from '../utils/api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const [statsRes, heatmapRes, progressRes] = await Promise.all([
        api.getStats(),
        api.getHeatmapData(),
        api.getProgressData()
      ]);
      setStats(statsRes);
      setHeatmapData(heatmapRes);
      setProgressData(progressRes);
    } catch (error) {
      toast.error(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Transform weekly activities for the chart
  const chartData = progressData?.weeklyActivities?.map((item, index) => ({
    week: `W${index + 1}`,
    activities: item.count,
    skills: Math.floor(item.count * 0.3) + index
  })) || [];

  const statCards = [
    { 
      label: 'Skills Mastered', 
      value: stats?.skills?.mastered || 0, 
      icon: Target, 
      color: 'from-accent-green to-emerald-600',
      bgColor: 'bg-accent-green/10'
    },
    { 
      label: 'Currently Learning', 
      value: stats?.skills?.learning || 0, 
      icon: BookOpen, 
      color: 'from-accent-blue to-blue-600',
      bgColor: 'bg-accent-blue/10'
    },
    { 
      label: 'Active Projects', 
      value: stats?.projects?.active || 0, 
      icon: FolderKanban, 
      color: 'from-accent-purple to-violet-600',
      bgColor: 'bg-accent-purple/10'
    },
    { 
      label: 'Active Days (30d)', 
      value: stats?.activeDaysLast30 || 0, 
      icon: Activity, 
      color: 'from-accent-orange to-amber-600',
      bgColor: 'bg-accent-orange/10'
    },
  ];

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Command Center</h1>
        <p className="text-gray-400">Your development journey at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bgColor }) => (
          <div key={label} className="glass-card p-5 hover:border-dark-500 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">{label}</p>
                <p className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
                  {value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${bgColor}`}>
                <Icon className={`w-5 h-5 bg-gradient-to-r ${color} bg-clip-text`} style={{ color: 'currentColor' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Learning Progress Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-purple/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Learning Progress</h2>
            <p className="text-sm text-gray-400">Activity over the last 12 weeks</p>
          </div>
        </div>
        
        <div className="h-64">
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
              <CartesianGrid strokeDasharray="3 3" stroke="#252532" />
              <XAxis dataKey="week" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a25', 
                  border: '1px solid #252532',
                  borderRadius: '8px'
                }}
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
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-green/10 rounded-lg">
            <Zap className="w-5 h-5 text-accent-green" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Activity Log</h2>
            <p className="text-sm text-gray-400">Your consistency over the past year</p>
          </div>
        </div>
        
        <ActivityHeatmap data={heatmapData} />
        
        <div className="flex items-center justify-end gap-2 mt-4 text-sm text-gray-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-dark-600"></div>
            <div className="w-3 h-3 rounded-sm bg-accent-green/25"></div>
            <div className="w-3 h-3 rounded-sm bg-accent-green/50"></div>
            <div className="w-3 h-3 rounded-sm bg-accent-green/75"></div>
            <div className="w-3 h-3 rounded-sm bg-accent-green"></div>
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-gray-400 text-sm mb-2">Total Skills Tracked</h3>
          <p className="text-2xl font-bold">
            {(stats?.skills?.mastered || 0) + (stats?.skills?.learning || 0) + (stats?.skills?.want_to_learn || 0)}
          </p>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-gray-400 text-sm mb-2">Total Projects</h3>
          <p className="text-2xl font-bold">
            {(stats?.projects?.idea || 0) + (stats?.projects?.active || 0) + (stats?.projects?.completed || 0)}
          </p>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-gray-400 text-sm mb-2">Resources Saved</h3>
          <p className="text-2xl font-bold">{stats?.resources || 0}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
