import { useMemo } from 'react';

function ActivityHeatmap({ data }) {
  const heatmapGrid = useMemo(() => {
    // Create a map of date -> count
    const dateMap = {};
    data.forEach(item => {
      dateMap[item.date] = item.count;
    });

    // Generate last 365 days
    const days = [];
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        count: dateMap[dateStr] || 0,
        dayOfWeek: date.getDay()
      });
    }

    // Group by weeks
    const weeks = [];
    let currentWeek = [];
    
    // Add empty cells for the first week if needed
    const firstDayOfWeek = days[0].dayOfWeek;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }
    
    days.forEach((day) => {
      currentWeek.push(day);
      if (day.dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [data]);

  const getIntensityClass = (count) => {
    if (count === 0) return 'bg-dark-600';
    if (count === 1) return 'bg-accent-green/25';
    if (count <= 3) return 'bg-accent-green/50';
    if (count <= 5) return 'bg-accent-green/75';
    return 'bg-accent-green';
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate month labels position
  const getMonthLabels = () => {
    const labels = [];
    let lastMonth = -1;
    
    heatmapGrid.forEach((week, weekIndex) => {
      const firstDay = week.find(d => d !== null);
      if (firstDay) {
        const month = new Date(firstDay.date).getMonth();
        if (month !== lastMonth) {
          labels.push({ month: months[month], position: weekIndex });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  };

  const monthLabels = getMonthLabels();

  return (
    <div className="overflow-x-auto">
      {/* Month labels */}
      <div className="flex mb-2 ml-8">
        {monthLabels.map(({ month, position }, index) => (
          <div 
            key={index} 
            className="text-xs text-gray-500"
            style={{ 
              position: 'absolute', 
              left: `${position * 14 + 32}px`
            }}
          >
            {month}
          </div>
        ))}
      </div>
      
      <div className="flex gap-1 mt-6">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-2 text-xs text-gray-500">
          {dayLabels.map((day, i) => (
            <div key={day} className="h-3 flex items-center" style={{ display: i % 2 === 1 ? 'flex' : 'none' }}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Heatmap grid */}
        <div className="flex gap-1">
          {heatmapGrid.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-3 h-3 rounded-sm ${day ? getIntensityClass(day.count) : 'bg-transparent'} 
                    hover:ring-1 hover:ring-white/50 transition-all cursor-pointer`}
                  title={day ? `${day.date}: ${day.count} activities` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ActivityHeatmap;
