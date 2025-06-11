// frontend/src/components/EntityCard.tsx

import React from 'react';
import type { Entity } from '../types'; // Use type-only import for TS correctness

// Import Ant Design components and icons
import { Card, Tag } from 'antd';
import { DatabaseOutlined, KeyOutlined, LinkOutlined } from '@ant-design/icons';

// Define the props interface for the component
interface EntityCardProps {
  entity: Entity;
  isSelected: boolean;
  onSelect: (entityId: string, e: React.MouseEvent) => void;
  onDragStart: (e: React.MouseEvent<HTMLDivElement>, entity: Entity) => void;
}

export function EntityCard({ entity, isSelected, onSelect, onDragStart }: EntityCardProps) {
  return (
    <div
      id={entity.id}
      className="entity-card-wrapper"
      style={{
        transform: `translate(${entity.ui.x}px, ${entity.ui.y}px)`,
        borderColor: isSelected ? '#1677ff' : undefined, // Ant Design primary color
      }}
      // Stop propagation to prevent canvas deselect, but allow selection of this card
      onClick={(e) => {
        e.stopPropagation();
        onSelect(entity.id, e);
      }}
      onMouseDown={(e) => {
        e.stopPropagation(); // Prevent canvas-level events
        onDragStart(e, entity);
      }}
    >
      <Card
        size="small"
        headStyle={{ 
            backgroundColor: '#f0f2f5', 
            cursor: 'grab', 
            textAlign: 'center',
            padding: '0 12px'
        }}
        bodyStyle={{ padding: 0 }}
        title={
          <div className="entity-card-title">
            <DatabaseOutlined style={{ marginRight: 8, color: '#595959' }}/>
            <span style={{ fontWeight: 600 }}>{entity.name}</span>
          </div>
        }
      >
        <div className="attribute-list">
          {entity.attributes.length > 0 ? (
            entity.attributes.map(attr => (
              <div key={attr.id} className="attribute-item">
                <div className="attribute-info">
                  {attr.isPrimaryKey && <KeyOutlined title="Primary Key" style={{ color: '#faad14', marginRight: 6 }} />}
                  {attr.isForeignKey && <LinkOutlined title="Foreign Key" style={{ color: '#1677ff', marginRight: 6 }} />}
                  <span className={attr.isPrimaryKey ? "attribute-name pk" : "attribute-name"}>
                    {attr.name}
                  </span>
                </div>
                <Tag className="attribute-type-tag">{attr.type}</Tag>
              </div>
            ))
          ) : (
            <div className="attribute-placeholder">No attributes</div>
          )}
        </div>
      </Card>
    </div>
  );
}
