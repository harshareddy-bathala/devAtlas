import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Zap, Target, FolderKanban, Activity, Sparkles, Flame, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ActivityHeatmap from '../components/ActivityHeatmap';
import TechProgress from '../components/TechProgress';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

interface Stats {
  skills?: {
    mastered?: number;
    learning?: number;
    want_to_learn?: number;
  };
  projects?: {
    active?: number;
    completed?: number;
    idea?: number;
  };
  resources?: number;
  totalActivities?: number;
  activeDaysLast30?: number;
  currentStreak?: number;
}

interface ProgressData {
  weeklyActivities?: Array<{ week: string; count: number; progress?: number }>;
  monthlyProgress?: Array<{ month: string; count: number }>;
}

interface HeatmapDay {
  date: string;
  count: number;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accentColor: string;
}

// Skeleton Components
function StatCardSkeleton() {
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-md p-5 h-[100px]">
      <div className="animate-pulse">
        <div className="h-3 w-20 bg-dark-600 rounded mb-3" />
        <div className="h-7 w-12 bg-dark-600 rounded" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-md p-6">
      <div className="animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-dark-600 rounded" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-dark-600 rounded" />
            <div className="h-3 w-48 bg-dark-600 rounded" />
          </div>
        </div>
        <div className="h-[250px] bg-dark-700 rounded" />
      </div>
    </div>
  );
}

// Stat Card Component
const StatCard = memo(function StatCard({ label, value, icon: Icon, accentColor }: StatCardProps) {
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-md p-5 h-[100px] flex flex-col justify-between">
      <p className="text-light-500 text-sm font-medium">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-white">{value}</p>
        <div className="p-1.5 rounded" style={{ backgroundColor: `${accentColor}15` }}>
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
});

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const loadDashboardData = async () => {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      try {
        // Use Promise.allSettled to handle partial failures
        const results = await Promise.allSettled([
          api.getStats({ signal: abortControllerRef.current.signal }),
          api.getHeatmapData({ signal: abortControllerRef.current.signal }),
          api.getProgressData({ signal: abortControllerRef.current.signal })
        ]);
        
        // Check if component is still mounted
        if (!isMounted.current) return;
        
        // Check if ALL failed (likely auth issue)
        const allFailed = results.every(r => r.status === 'rejected');
        if (allFailed) {
          const error = (results[0] as PromiseRejectedResult).reason;
          throw error;
        }
        
        // Extract successful results
        if (results[0].status === 'fulfilled') setStats(results[0].value);
        if (results[1].status === 'fulfilled') setHeatmapData(results[1].value || []);
        if (results[2].status === 'fulfilled') setProgressData(results[2].value);
        
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        if (!isMounted.current) return;
        console.error('Dashboard load error:', error);
        toast.error(error.message || 'Failed to load dashboard data');
      }
    };

    loadDashboardData();
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Memoize chart data transformation
  const chartData = useMemo(() => {
    return progressData?.weeklyActivities?.map((item, index) => ({
      week: `W${index + 1}`,
      activities: item.count,
      progress: item.progress || 0,
    })) || [];
  }, [progressData]);

  // Calculate total skills and projects (handling both lowercase and uppercase status keys)
  const totalSkills = useMemo(() => {
    if (!stats?.skills) return 0;
    return Object.values(stats.skills).reduce((sum: number, count) => sum + (typeof count === 'number' ? count : 0), 0);
  }, [stats?.skills]);
  
  const totalProjects = useMemo(() => {
    if (!stats?.projects) return 0;
    return Object.values(stats.projects).reduce((sum: number, count) => sum + (typeof count === 'number' ? count : 0), 0);
  }, [stats?.projects]);

  // Memoize stat cards
  const statCards: StatCardProps[] = useMemo(() => [
    { 
      label: 'Total Skills', 
      value: totalSkills, 
      icon: Target, 
      accentColor: '#22C55E'
    },
    { 
      label: 'Total Projects', 
      value: totalProjects, 
      icon: FolderKanban, 
      accentColor: '#8B5CF6'
    },
    { 
      label: 'Active Days (30d)', 
      value: stats?.activeDaysLast30 || 0, 
      icon: Activity, 
      accentColor: '#3B82F6'
    },
    { 
      label: 'Current Streak', 
      value: stats?.currentStreak || 0, 
      icon: Flame, 
      accentColor: '#F59E0B'
    },
  ], [stats, totalSkills, totalProjects]);

  // Loading state with skeletons - show skeleton when no stats data
  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-[120px] bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1: WELCOME HERO */}
      <div className="bg-gradient-to-r from-dark-900 via-dark-850 to-dark-800 rounded-xl p-6 border border-dark-600">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Welcome back, {user?.name || 'Developer'}! 👋
            </h1>
            <p className="text-sm text-light-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link 
            to="/explore"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Explore Courses
          </Link>
        </div>
      </div>

      {/* SECTION 2: QUICK STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* SECTION 3: WEEKLY ACTIVITY CHART */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-accent-primary/10">
            <TrendingUp className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Weekly Activity</h2>
            <p className="text-sm text-light-500">Your learning activity over the last 12 weeks</p>
          </div>
        </div>
        
        <div className="h-[280px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis dataKey="week" stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181B', 
                    border: '1px solid #3F3F46',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.5)'
                  }}
                  labelStyle={{ color: '#A1A1AA', fontWeight: 500 }}
                  itemStyle={{ color: '#E4E4E7' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="activities" 
                  stroke="#8B5CF6" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorActivities)" 
                  name="Activities"
                />
                <Area 
                  type="monotone" 
                  dataKey="progress" 
                  stroke="#10B981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorProgress)" 
                  name="Progress"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-light-500">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No activity data yet</p>
                <p className="text-sm mt-1">Start learning to see your progress!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: SKILL MAP & CONSISTENCY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Skill Map Pie Chart */}
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-accent-primary/10">
              <Target className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Skill Distribution</h2>
              <p className="text-sm text-light-500">Your learning progress breakdown</p>
            </div>
          </div>
          
          <TechProgress stats={stats} height={220} compact={true} />
          
          <p className="text-sm text-light-500 text-center mt-3">
            {stats?.skills?.mastered || 0} of {(stats?.skills?.mastered || 0) + (stats?.skills?.learning || 0) + (stats?.skills?.want_to_learn || 0)} skills mastered
          </p>
        </div>

        {/* RIGHT: Consistency Heatmap */}
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-accent-green/10">
              <Zap className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your Consistency</h2>
              <p className="text-sm text-light-500">Activity over the past year</p>
            </div>
          </div>
          
          <ActivityHeatmap data={heatmapData} />
          
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-light-500">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-dark-600" />
              <div className="w-3 h-3 rounded-sm bg-[#0e4429]" />
              <div className="w-3 h-3 rounded-sm bg-[#006d32]" />
              <div className="w-3 h-3 rounded-sm bg-[#26a641]" />
              <div className="w-3 h-3 rounded-sm bg-[#39d353]" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      {/* SECTION 5: QUICK ACTIONS */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link 
            to="/stack"
            className="flex items-center gap-3 px-4 py-3 bg-dark-700/50 hover:bg-dark-700 border border-dark-600 hover:border-accent-primary/50 text-white text-sm rounded-lg transition-all group"
          >
            <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
              <Target className="w-4 h-4 text-green-500" />
            </div>
            <span>View Skills</span>
          </Link>
          <Link 
            to="/projects"
            className="flex items-center gap-3 px-4 py-3 bg-dark-700/50 hover:bg-dark-700 border border-dark-600 hover:border-accent-primary/50 text-white text-sm rounded-lg transition-all group"
          >
            <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
              <FolderKanban className="w-4 h-4 text-purple-500" />
            </div>
            <span>Projects</span>
          </Link>
          <Link 
            to="/resources"
            className="flex items-center gap-3 px-4 py-3 bg-dark-700/50 hover:bg-dark-700 border border-dark-600 hover:border-accent-primary/50 text-white text-sm rounded-lg transition-all group"
          >
            <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <span>Resources</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
