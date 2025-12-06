import { useMemo } from 'react';

function ActivityHeatmap({ data }) {
  const { weeks, monthLabels } = useMemo(() => {
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
        dayOfWeek: date.getDay(),
        month: date.getMonth(),
        year: date.getFullYear()
      });
    }

    // Group by weeks (Sunday = 0 start of week)
    const weeksArr = [];
    let currentWeek = [];
    
    // Add empty cells for the first week if needed
    const firstDayOfWeek = days[0].dayOfWeek;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }
    
    days.forEach((day) => {
      currentWeek.push(day);
      if (day.dayOfWeek === 6) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0) {
      // Pad the last week
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeksArr.push(currentWeek);
    }

    // Calculate month label positions
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = [];
    let lastMonth = -1;
    
    weeksArr.forEach((week, weekIndex) => {
      const firstValidDay = week.find(d => d !== null);
      if (firstValidDay) {
        const month = firstValidDay.month;
        if (month !== lastMonth) {
          labels.push({ 
            label: months[month], 
            weekIndex,
            colSpan: 1
          });
          lastMonth = month;
        }
      }
    });

    // Calculate column spans for each month
    for (let i = 0; i < labels.length; i++) {
      const startWeek = labels[i].weekIndex;
      const endWeek = i < labels.length - 1 ? labels[i + 1].weekIndex : weeksArr.length;
      labels[i].colSpan = endWeek - startWeek;
    }

    return { weeks: weeksArr, monthLabels: labels };
  }, [data]);

  const getIntensityClass = (count) => {
    if (count === 0) return 'bg-[#2d333b]';
    if (count === 1) return 'bg-[#0e4429]';
    if (count <= 3) return 'bg-[#006d32]';
    if (count <= 5) return 'bg-[#26a641]';
    return 'bg-[#39d353]';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const totalWeeks = weeks.length;
  const cellSize = 10;
  const cellGap = 3;
  const dayLabelWidth = 28;

  return (
    <div className="w-full overflow-x-auto flex justify-center">
      <table className="border-collapse" style={{ borderSpacing: `${cellGap}px` }}>
        <thead>
          <tr>
            <td style={{ width: dayLabelWidth }} />
            {monthLabels.map(({ label, colSpan }, index) => (
              <td 
                key={index}
                colSpan={colSpan}
                className="text-xs text-light-500 font-normal text-left px-[1.5px]"
              >
                {colSpan >= 3 ? label : ''}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
            <tr key={dayIndex}>
              <td className="text-xs text-light-500 pr-2 text-right" style={{ width: dayLabelWidth }}>
                {dayIndex === 1 ? 'Mon' : dayIndex === 3 ? 'Wed' : dayIndex === 5 ? 'Fri' : ''}
              </td>
              {weeks.map((week, weekIndex) => {
                const day = week[dayIndex];
                return (
                  <td key={weekIndex} className="p-[1.5px]">
                    <div
                      className={`rounded-sm ${day ? getIntensityClass(day.count) : 'bg-transparent'}`}
                      style={{ width: cellSize, height: cellSize }}
                      title={day ? `${day.count} ${day.count === 1 ? 'activity' : 'activities'} on ${formatDate(day.date)}` : ''}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ActivityHeatmap;
