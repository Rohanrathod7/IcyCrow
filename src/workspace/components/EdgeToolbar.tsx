import { JSX } from 'preact';
import { Plus, MoreHorizontal } from 'lucide-preact';
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
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { toolbarPosition, toolsOrder, isToolPickerOpen, isToolbarSettingsOpen } from '../store/toolbar-state';
import { SortableToolItem } from './SortableToolItem';
import './Toolbar.css';

export const EdgeToolbar = () => {
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

  const isVertical = toolbarPosition.value === 'left' || toolbarPosition.value === 'right';
  
  // Docking positions CSS
  const getDockStyles = () : JSX.HTMLAttributes<HTMLDivElement>['style'] => {
    const pos = toolbarPosition.value;
    const isVertical = pos === 'left' || pos === 'right';
    
    const styles: JSX.HTMLAttributes<HTMLDivElement>['style'] = {
      position: 'absolute',
      zIndex: 1000,
      background: 'rgba(28, 28, 30, 0.9)', // Deep Apple Dark
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '24px',
      padding: '8px',
      display: 'flex',
      flexDirection: isVertical ? 'column' : 'row',
      gap: '8px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.1)',
      pointerEvents: 'auto'
    };

    switch (pos) {
      case 'bottom':
        styles.bottom = '20px';
        styles.left = '50%';
        styles.transform = 'translateX(-50%)';
        break;
      case 'top':
        styles.top = '20px';
        styles.left = '50%';
        styles.transform = 'translateX(-50%)';
        break;
      case 'left':
        styles.left = '20px';
        styles.top = '50%';
        styles.transform = 'translateY(-50%)';
        break;
      case 'right':
        styles.right = '20px';
        styles.top = '50%';
        styles.transform = 'translateY(-50%)';
        break;
    }
    return styles;
  };

  return (
    <div style={getDockStyles()}>
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={toolsOrder.value}
          strategy={isVertical ? verticalListSortingStrategy : horizontalListSortingStrategy}
        >
          {toolsOrder.value.map((id) => (
            <SortableToolItem key={id} id={id} />
          ))}
        </SortableContext>
      </DndContext>

      {/* Decorative Empty Slots */}
      <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: '8px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      </div>

      {/* Spacer */}
      <div style={{ height: isVertical ? '8px' : '0', width: isVertical ? '0' : '8px' }} />

      {/* Action Anchors */}
      <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: '8px' }}>
         <button 
           className="dial-tool-button" 
           onClick={() => isToolPickerOpen.value = true}
           style={{ position: 'relative', background: 'rgba(255,255,255,0.05)' }}
         >
           <Plus size={20} color="rgba(255,255,255,0.6)" />
         </button>
         <button 
           className="dial-tool-button" 
           onClick={() => isToolbarSettingsOpen.value = true}
           style={{ position: 'relative', background: 'transparent' }}
         >
           <MoreHorizontal size={20} color="rgba(255,255,255,0.3)" />
         </button>
      </div>
    </div>
  );
};
