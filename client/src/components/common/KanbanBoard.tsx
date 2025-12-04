import { ReactNode, useMemo } from 'react';
import { LucideIcon } from 'lucide-react';

export interface KanbanColumn<TStatus extends string = string> {
  id: TStatus;
  title: string;
  description?: string;
  color: string;
  icon: LucideIcon;
}

export interface KanbanItem {
  id: string;
  status: string;
  [key: string]: unknown;
}

interface KanbanBoardProps<TItem extends KanbanItem, TStatus extends string> {
  columns: KanbanColumn<TStatus>[];
  items: TItem[];
  onItemMove?: (item: TItem, newStatus: TStatus) => void;
  renderItem: (item: TItem, column: KanbanColumn<TStatus>) => ReactNode;
  emptyMessage?: string;
  renderColumnHeader?: (column: KanbanColumn<TStatus>, itemCount: number) => ReactNode;
  statusButtons?: { key: TStatus; label: string }[];
}

export function KanbanBoard<TItem extends KanbanItem, TStatus extends string>({
  columns,
  items,
  onItemMove,
  renderItem,
  emptyMessage = 'No items here yet',
  renderColumnHeader,
  statusButtons,
}: KanbanBoardProps<TItem, TStatus>) {
  // Group items by status
  const groupedItems = useMemo(() => {
    const groups: Record<string, TItem[]> = {};
    columns.forEach((col) => {
      groups[col.id] = [];
    });
    items.forEach((item) => {
      const statusGroup = groups[item.status];
      if (statusGroup) {
        statusGroup.push(item);
      }
    });
    return groups;
  }, [items, columns]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {columns.map((column) => {
        const Icon = column.icon;
        const columnItems = groupedItems[column.id] || [];

        return (
          <div key={column.id} className="glass-card p-4">
            {/* Column Header */}
            {renderColumnHeader ? (
              renderColumnHeader(column, columnItems.length)
            ) : (
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-dark-600">
                <div className={`p-2 rounded-lg ${column.color.split(' ')[0]}`}>
                  <Icon className={`w-4 h-4 ${column.color.split(' ')[1]}`} />
                </div>
                <div>
                  <h2 className="font-semibold">{column.title}</h2>
                  {column.description && (
                    <p className="text-xs text-gray-500">{column.description}</p>
                  )}
                </div>
                <span className="ml-auto text-sm text-gray-500 bg-dark-600 px-2 py-0.5 rounded-full">
                  {columnItems.length}
                </span>
              </div>
            )}

            {/* Column Items */}
            <div className="space-y-3 min-h-[200px]">
              {columnItems.map((item) => (
                <div key={item.id} className="group">
                  {renderItem(item, column)}
                  
                  {/* Quick status change buttons */}
                  {onItemMove && statusButtons && (
                    <div className="flex gap-1 mt-3 pt-2 border-t border-dark-600">
                      {statusButtons.map(({ key, label }) => {
                        const targetColumn = columns.find((c) => c.id === key);
                        const isActive = item.status === key;
                        const colorClass = targetColumn?.color || 'bg-dark-600 text-gray-500';

                        return (
                          <button
                            key={key}
                            onClick={() => onItemMove(item, key)}
                            className={`flex-1 text-xs py-1 rounded transition-colors ${
                              isActive
                                ? colorClass
                                : 'bg-dark-600 text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {columnItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default KanbanBoard;
