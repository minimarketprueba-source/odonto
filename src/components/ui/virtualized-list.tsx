import { memo, useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  emptyMessage?: string
}

function VirtualizedListComponent<T>({
  items,
  itemHeight,
  renderItem,
  className,
  emptyMessage = 'No hay elementos para mostrar',
}: VirtualizedListProps<T>) {
  const Row = useMemo(
    () =>
      function RowRenderer({ index, style }: { index: number; style: React.CSSProperties }) {
        return <div style={style}>{renderItem(items[index], index)}</div>
      },
    [items, renderItem]
  )

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={className} style={{ height: '100%', minHeight: '400px' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            width={width}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  )
}

VirtualizedListComponent.displayName = 'VirtualizedList'
export const VirtualizedList = memo(VirtualizedListComponent) as typeof VirtualizedListComponent

