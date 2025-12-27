import { useMemo, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  TooltipProps,
} from 'recharts';
import { Target } from 'lucide-react';

type SkillStatus = 'want_to_learn' | 'learning' | 'mastered';

const STATUS_COLORS: Record<SkillStatus, string> = {
  want_to_learn: '#F59E0B', // Amber
  learning: '#3B82F6',      // Blue
  mastered: '#22C55E',      // Green
};

const STATUS_LABELS: Record<SkillStatus, string> = {
  want_to_learn: 'Want to Learn',
  learning: 'Learning',
  mastered: 'Mastered',
};

interface SkillStats {
  skills?: Partial<Record<SkillStatus, number>>;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  status: SkillStatus;
}

interface TechProgressProps {
  stats: SkillStats | null | undefined;
  height?: number;
  compact?: boolean;
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  total?: number;
}

/**
 * TechProgress - Displays skill progress as an animated pie chart
 * Shows the breakdown of skills by status with a central mastery percentage
 */
export default function TechProgress({ stats, height = 200, compact = false }: TechProgressProps) {
  const [isHovering, setIsHovering] = useState(false);

  // Transform stats data into chart format
  const data = useMemo<ChartDataItem[]>(() => {
    if (!stats?.skills) return [];
    
    const skillCounts: ChartDataItem[] = [];
    const statusOrder: SkillStatus[] = ['mastered', 'learning', 'want_to_learn'];
    
    statusOrder.forEach(status => {
      const count = stats.skills?.[status] || 0;
      if (count > 0) {
        skillCounts.push({
          name: STATUS_LABELS[status],
          value: count,
          color: STATUS_COLORS[status],
          status: status
        });
      }
    });
    
    return skillCounts;
  }, [stats]);

  const total = useMemo(() => 
    data.reduce((sum, item) => sum + item.value, 0), 
    [data]
  );

  const masteredValue = useMemo(
    () => data.find(d => d.status === 'mastered')?.value ?? 0,
    [data]
  );

  const masteredPct = useMemo(
    () => total > 0 ? Math.round((masteredValue / total) * 100) : 0,
    [masteredValue, total]
  );

  // Animate the center percentage
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (masteredPct === 0) {
      setCount(0);
      return;
    }
    
    let raf = 0;
    const duration = 1200;
    const start = performance.now();
    
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic for smooth animation
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * masteredPct));
      
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [masteredPct]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null;
    
    const item = payload[0];
    if (!item) return null;
    
    const percentage = total > 0 ? Math.round((item.value as number / total) * 100) : 0;
    
    return (
      <div className="bg-dark-700 border border-dark-500 rounded px-3 py-2 shadow-lg">
        <p className="text-white font-medium text-sm">{item.name}</p>
        <p className="text-light-400 text-xs">
          {item.value} skill{item.value !== 1 ? 's' : ''} ({percentage}%)
        </p>
      </div>
    );
  };

  if (data.length === 0) {
    if (compact) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-30 text-light-500" />
            <p className="text-light-500 text-xs">No skills tracked yet</p>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-dark-800 border border-dark-600 rounded p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded bg-accent-primary/10">
            <Target className="w-4 h-4 text-accent-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Skill Progress</h2>
            <p className="text-xs text-light-500">{total} skills tracked</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-30 text-light-500" />
            <p className="text-light-500 text-xs">No skills tracked yet</p>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col items-center">
        {/* Pie Chart with center text */}
        <div 
          className="relative" 
          style={{ width: '100%', height: height }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="88%"
                paddingAngle={data.length > 1 ? 3 : 0}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                style={{ outline: 'none', cursor: 'default' }}
              >
                {data.map((entry, idx) => (
                  <Cell 
                    key={idx} 
                    fill={entry.color}
                    style={{ outline: 'none' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center percentage display - fades on hover */}
          <div 
            className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center transition-opacity duration-300"
            style={{ 
              top: '50%', 
              transform: 'translateY(-50%)',
              opacity: isHovering ? 0 : 1
            }}
          >
            <div className="text-2xl font-bold text-white">{count}%</div>
            <div className="text-[10px] text-light-500 mt-0.5">Mastered</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 border border-dark-600 rounded p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded bg-accent-primary/10">
          <Target className="w-4 h-4 text-accent-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Skill Progress</h2>
          <p className="text-xs text-light-500">{total} skill{total !== 1 ? 's' : ''} tracked</p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* Pie Chart with center text */}
        <div 
          className="relative" 
          style={{ width: '100%', height: height }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="88%"
                paddingAngle={data.length > 1 ? 3 : 0}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                style={{ outline: 'none', cursor: 'default' }}
              >
                {data.map((entry, idx) => (
                  <Cell 
                    key={idx} 
                    fill={entry.color}
                    style={{ outline: 'none' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center percentage display - fades on hover */}
          <div 
            className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center transition-opacity duration-300"
            style={{ 
              top: '50%', 
              transform: 'translateY(-50%)',
              opacity: isHovering ? 0 : 1
            }}
          >
            <div className="text-2xl font-bold text-white">{count}%</div>
            <div className="text-[10px] text-light-500 mt-0.5">Mastered</div>
          </div>
        </div>
      </div>

    </div>
  );
}
