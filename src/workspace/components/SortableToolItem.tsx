import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Hand, 
  MousePointer2, 
  Highlighter, 
  PenTool, 
  Brush, 
  Eraser, 
  Palette, 
  Type, 
  MoreHorizontal, 
  RotateCcw,
  StickyNote,
  ArrowUpRight
} from 'lucide-preact';
import { ToolId, toolMetadata } from '../store/toolbar-state';
import { activeTool, activeCustomizationTool, toolSettings } from '../store/viewer-state';

const ICONS: Record<ToolId, any> = {
  pan: Hand,
  select: MousePointer2,
  highlight: Highlighter,
  draw: PenTool,
  brush: Brush,
  eraser: Eraser,
  color: Palette,
  text: Type,
  sticky: StickyNote,
  callout: ArrowUpRight,
  more: MoreHorizontal,
  zoomReset: RotateCcw
};

interface ToolItemProps {
  id: ToolId;
}

export const SortableToolItem = ({ id }: ToolItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Extract base type for icon lookup (e.g., 'text-123' -> 'text')
  const baseType = id.split('-')[0] as ToolId;
  const Icon = ICONS[baseType] || ICONS[id as ToolId] || MousePointer2;
  
  const isActive = activeTool.value === id;
  const isCustomizable = ['draw', 'brush', 'eraser', 'highlight', 'sticky', 'callout'].includes(baseType);
  const settings = toolSettings.value[id] || toolSettings.value[baseType];
  const metadata = toolMetadata.value[id] || toolMetadata.value[baseType];

  const iconColor = metadata?.color || (isActive ? '#818cf8' : 'rgba(255,255,255,0.7)');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(attributes as any)}
      {...(listeners as any)}
      className={`tool-item ${isActive ? 'active' : ''}`}
      onClick={() => {
        if (activeTool.value === id) {
          if (isCustomizable) {
            activeCustomizationTool.value = activeCustomizationTool.value === id ? null : (id as any);
          }
        } else {
          activeTool.value = id as any;
        }
      }}
      onDblClick={(e) => {
        e.stopPropagation();
        if (isCustomizable) {
          activeCustomizationTool.value = activeCustomizationTool.value === id ? null : (id as any);
        }
      }}
      data-testid={`tool-${id}`}
      title={(() => {
        const shortcutMap: Record<string, string> = {
          pan: 'H',
          select: 'V',
          highlight: 'M',
          draw: 'P',
          eraser: 'E',
          text: 'T',
          sticky: 'S',
          callout: 'C'
        };
        const shortcut = shortcutMap[baseType as string] || '';
        const label = (baseType as string).charAt(0).toUpperCase() + (baseType as string).slice(1);
        return shortcut ? `${label} (${shortcut})` : label;
      })()}
    >
      <Icon size={20} color={iconColor} />
      
      {/* Size Badge */}
      {isCustomizable && settings && (
        <span className="tool-badge" style={{ transform: 'scale(0.8)', top: '-5px', right: '-5px' }}>
          {settings.size}
        </span>
      )}

      {/* Customizable Indicator */}
      {isCustomizable && (
        <div style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.4)'
        }} />
      )}
    </div>
  );
};
