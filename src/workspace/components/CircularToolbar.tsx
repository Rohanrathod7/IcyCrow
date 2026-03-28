import { useSignal } from '@preact/signals';
import { 
  DndContext, 
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { toolsOrder, toolMetadata } from '../store/toolbar-state';
import { activeTool, activeCustomizationTool } from '../store/viewer-state';
import { SortableToolItem } from './SortableToolItem';
import { 
  Hand, 
  MousePointer2, 
  Highlighter, 
  Eraser,
  Brush,
  Type, 
  MoreHorizontal,
  RotateCcw,
  Settings2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  StickyNote,
  PenTool,
  ArrowUpRight
} from 'lucide-preact';
import './Toolbar.css';

const ICONS: any = {
  pan: Hand,
  select: MousePointer2,
  highlight: Highlighter,
  draw: PenTool,
  brush: Brush,
  eraser: Eraser,
  text: Type,
  sticky: StickyNote,
  callout: ArrowUpRight,
  more: MoreHorizontal,
  zoomReset: RotateCcw,
};

export const CircularToolbar = () => {
  const isOverlayOpen = useSignal(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = toolsOrder.value.indexOf(active.id as any);
      const newIndex = toolsOrder.value.indexOf(over?.id as any);
      toolsOrder.value = arrayMove(toolsOrder.value, oldIndex, newIndex);
    }
  };

  const radius = 85; 
  const tools = toolsOrder.value;
  const metadata = toolMetadata.value;
  const activeIndex = tools.indexOf(activeTool.value as any);
  
  // rotation matches polar math (top tool is index 0)
  const arcRotation = (activeIndex / tools.length) * 360;

  const ActiveIcon = ICONS[activeTool.value as any] || Hand;

  return (
    <div className="unified-dial-wrapper">
      {/* V3 Tick Marks */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div 
          key={i} 
          className="dial-tick" 
          style={{ transform: `rotate(${i * 30}deg) translateY(-100px)` }} 
        />
      ))}

      {/* Cardinal Arrows */}
      <div className="cardinal-arrow arrow-up" data-testid="arrow-up"><ChevronUp size={14} /></div>
      <div className="cardinal-arrow arrow-down" data-testid="arrow-down"><ChevronDown size={14} /></div>
      <div className="cardinal-arrow arrow-left" data-testid="arrow-left"><ChevronLeft size={14} /></div>
      <div className="cardinal-arrow arrow-right" data-testid="arrow-right"><ChevronRight size={14} /></div>

      {/* Arc Indicator - Dynamic Rotation */}
      <div 
        className="dial-arc-indicator" 
        style={{ transform: `rotate(${arcRotation}deg)` }} 
      />

      {/* Center Hub */}
      <div 
        className="dial-center-hub" 
        data-testid="hub" 
        style={{ position: 'relative', cursor: 'pointer' }}
        onDblClick={(e) => {
          e.stopPropagation();
          const id = activeTool.value;
          const baseType = (id as string).split('-')[0];
          if (['draw', 'brush', 'eraser', 'highlight', 'sticky', 'callout'].includes(baseType)) {
            activeCustomizationTool.value = activeCustomizationTool.value === id ? null : id;
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          const id = activeTool.value;
          const baseType = (id as string).split('-')[0];
          if (['draw', 'brush', 'eraser', 'highlight', 'sticky', 'callout'].includes(baseType)) {
             activeCustomizationTool.value = activeCustomizationTool.value === id ? null : id;
          }
        }}
      >
        <div className="dial-corner corner-tl" />
        <div className="dial-corner corner-tr" />
        <div className="dial-corner corner-bl" />
        <div className="dial-corner corner-br" />
        
        <ActiveIcon size={32} />
        <button 
          className="reorder-toggle" 
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
          onClick={(e) => {
            e.stopPropagation();
            isOverlayOpen.value = true;
          }}
          data-testid="reorder-toggle"
        >
          <Settings2 size={10} color="rgba(255,255,255,0.6)" />
        </button>
      </div>

      {/* Orbiting Tools */}
      {tools.map((id, index) => {
        const angle = (index / tools.length) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const ToolIcon = ICONS[id] || ICONS[id.split('-')[0]] || Hand;
        const isActive = activeTool.value === (id as any);
        const toolMeta = metadata[id];
        const baseType = id.split('-')[0];
        const isCustomizable = ['draw', 'brush', 'eraser', 'highlight', 'sticky', 'callout'].includes(baseType);

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
        const shortcut = shortcutMap[baseType] || '';
        const label = baseType.charAt(0).toUpperCase() + baseType.slice(1);
        const titleLine = shortcut ? `${label} (${shortcut})` : label;

        const iconColor = toolMeta?.color || (isActive ? '#818cf8' : 'rgba(255,255,255,0.7)');
        const extraClass = (id === 'text' && isActive) ? 'highlight-green' : '';

        return (
          <button
            key={id}
            className={`dial-tool-button ${isActive ? 'active' : ''} ${extraClass}`}
            data-testid={`tool-${id}`}
            title={titleLine}
            style={{
              transform: `translate(${x}px, ${y}px)`,
            }}
            onClick={(e) => {
              e.stopPropagation();
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
          >
            <ToolIcon size={20} color={iconColor} />
            {isCustomizable && (
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.4)'
              }} />
            )}
            {toolMeta?.badge && (
              <span className="tool-badge">{toolMeta.badge}</span>
            )}
          </button>
        );
      })}

      {/* Reorder Overlay */}
      {isOverlayOpen.value && (
        <div 
          className="reorder-overlay" 
          data-testid="reorder-overlay"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="reorder-modal" style={{
            background: '#1c1c1e',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: '280px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'white' }}>Reorder Tools</h3>
            <div className="reorder-tool-list">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={tools}
                  strategy={verticalListSortingStrategy}
                >
                  {tools.map((id) => (
                    <SortableToolItem key={id} id={id} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
            <button 
              className="close-btn" 
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: '#818cf8',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600
              }}
              onClick={() => isOverlayOpen.value = false}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
