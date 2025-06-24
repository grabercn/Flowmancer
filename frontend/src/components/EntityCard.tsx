import React from 'react';
import type { Entity } from '../types';
import { Card, Tag } from 'antd';
import { DatabaseOutlined, KeyOutlined, LinkOutlined } from '@ant-design/icons';

interface EntityCardProps {
  entity: Entity;
  isSelected: boolean;
  onSelect: (entityId: string, e: React.MouseEvent) => void;
  onDragStart: (e: React.MouseEvent<HTMLDivElement>, entity: Entity) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>, entity: Entity) => void;
  onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => void;
}

export function EntityCard({
  entity,
  isSelected,
  onSelect,
  onDragStart,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}: EntityCardProps) {
  return (
    <div
      id={entity.id}
      className="entity-card-wrapper"
      style={{
        transform: `translate(${entity.ui.x}px, ${entity.ui.y}px)`,
        borderColor: isSelected ? '#1677ff' : undefined,
        touchAction: 'none', // IMPORTANT: prevent browser gestures
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(entity.id, e);
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onDragStart(e, entity);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        onTouchStart(e, entity);
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
        onTouchMove(e);
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        onTouchEnd(e);
      }}
    >
      <Card
        size="small"
        style={{ textAlign: 'center' }}
        title={
          <div className="entity-card-title">
            <DatabaseOutlined style={{ marginRight: 8, color: '#595959' }} />
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
