import React from 'react';
import { PlusCircleOutlined } from '@ant-design/icons';
import type { Entity } from '../../types';
import { componentMap } from './componentDefinitions';
import { PropertiesPanel } from '../PropertiesPanel';

// --- Helper Renderer Component ---
const ComponentRenderer = ({ type, props }: { type: string, props: any }) => {
    const Component = componentMap[type];
    if (!Component) {
        return <div style={{ border: '1px solid red', padding: '10px' }}>Unknown component type: {type}</div>;
    }
    // For container components like Row, we need to ensure children are rendered.
    // This is a simple implementation; a more complex one might involve nested renderers.
    return <Component {...props}>{props.children}</Component>;
};


// --- Main Designer Props ---
interface FrontendDesignerMainProps {
  components: Entity[];
  selectedComponentId: string | null;
  onSelectComponent: (componentId: string, e: React.MouseEvent) => void;
  onDragStart: (event: React.MouseEvent, component: Entity) => void;
  onTouchStart: (event: React.TouchEvent, component: Entity) => void;
  onTouchMove: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
  onDragMove: (event: React.MouseEvent) => void;
  onDragEnd: (event: React.MouseEvent | React.TouchEvent) => void;
  isDragging: boolean;
  selectedComponent: Entity | null;
  onUpdateComponentName: (componentId: string, newName: string) => void;
  onUpdateComponentProps: (componentId: string, newProps: any) => void;
  onDeleteComponent: (componentId: string) => void;
  canvasWrapperRef: React.RefObject<HTMLDivElement>;
}

export function FrontendDesignerMain({
  components,
  selectedComponentId,
  onSelectComponent,
  onDragStart,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onDragMove,
  onDragEnd,
  isDragging,
  selectedComponent,
  onUpdateComponentName,
  onUpdateComponentProps,
  onDeleteComponent,
  canvasWrapperRef,
}: FrontendDesignerMainProps) {
  return (
    <main
      className="main-content"
      onMouseMove={onDragMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div ref={canvasWrapperRef} className="canvas-area">
        <div className="canvas-area-inner" style={{ cursor: isDragging ? 'grabbing' : 'default' }}>
          {components.map(comp => (
            <div
              key={comp.id}
              className={`canvas-component-wrapper ${comp.id === selectedComponentId ? 'selected' : ''}`}
              style={{
                position: 'absolute',
                left: comp.ui.x,
                top: comp.ui.y,
                cursor: 'grab',
                border: comp.id === selectedComponentId ? '2px solid #1677ff' : '1px dashed #ccc',
                padding: '4px',
                borderRadius: '4px',
                transition: 'border-color 0.2s',
              }}
              onMouseDown={(e) => onDragStart(e, comp)}
              onTouchStart={(e) => onTouchStart(e, comp)}
              onClick={(e) => onSelectComponent(comp.id, e)}
            >
              <div style={{ pointerEvents: isDragging ? 'none' : 'auto' }}>
                {comp.componentType ? (
                   <ComponentRenderer type={comp.componentType} props={comp.props} />
                ) : (
                  <div>Error: No component type</div>
                )}
              </div>
            </div>
          ))}

          {components.length === 0 && (
            <div className="canvas-placeholder-container">
              <PlusCircleOutlined className="canvas-placeholder" />
              <p className="canvas-placeholder">Click "Add Component" to begin</p>
            </div>
          )}
        </div>
      </div>
      
      <PropertiesPanel
        selectedEntity={selectedComponent}
        onUpdateEntityName={onUpdateComponentName} // Correctly wired
        onDeleteEntity={onDeleteComponent}         // Correctly wired
        onUpdateComponentProps={onUpdateComponentProps} // Correctly wired
        // These are not used in frontend mode, so we pass empty functions
        onAddAttribute={() => {}}
        onEditAttribute={() => {}}
        onDeleteAttribute={() => {}}
      />
    </main>
  );
}
