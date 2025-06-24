// frontend/src/components/PropertiesPanel.tsx

import React, { useState } from 'react';
import type { Entity, Attribute } from '../types';
import {
  Button, Input, List, Tooltip, Empty, Popconfirm, Drawer, FloatButton
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  LinkOutlined,
  SlidersOutlined
} from '@ant-design/icons';

interface PropertiesPanelProps {
  selectedEntity: Entity | null;
  onUpdateEntityName: (entityId: string, newName: string) => void;
  onDeleteEntity: (entityId: string) => void;
  onAddAttribute: (entityId: string) => void;
  onEditAttribute: (entityId: string, attributeId: string) => void;
  onDeleteAttribute: (entityId: string, attributeId: string) => void;
}

export function PropertiesPanel({
  selectedEntity,
  onUpdateEntityName,
  onDeleteEntity,
  onAddAttribute,
  onEditAttribute,
  onDeleteAttribute,
}: PropertiesPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedEntity) {
      onUpdateEntityName(selectedEntity.id, e.target.value);
    }
  };

  const panelContent = (
    <>
      {/* Entity Name Section */}
      <div className="property-section">
        <label htmlFor="entity-name-input" className="property-label">Entity Name</label>
        <Input
          id="entity-name-input"
          value={selectedEntity?.name}
          onChange={handleNameChange}
          placeholder="Enter entity name"
        />
      </div>

      {/* Entity Description Section */}
      <div className="property-section">
        <label htmlFor="entity-description-input" className="property-label">Description</label>
        <Input.TextArea
          id="entity-description-input"
          value={selectedEntity?.description || ''}
          onChange={(e) => {
            if (selectedEntity) {
              selectedEntity.description = e.target.value;
            }
          }}
          placeholder="Enter entity description"
          rows={3}
        />
      </div>

      {/* Attributes Section */}
      <div className="property-section">
        <div className="attribute-section-header">
          <label className="property-label">Attributes</label>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => selectedEntity && onAddAttribute(selectedEntity.id)}
          >
            Add
          </Button>
        </div>

        <List
          size="small"
          bordered
          dataSource={selectedEntity?.attributes || []}
          renderItem={(attr: Attribute) => (
            <List.Item
              actions={[
                <Tooltip title="Edit Attribute">
                  <Button type="text" shape="circle" icon={<EditOutlined />} onClick={() => selectedEntity && onEditAttribute(selectedEntity.id, attr.id)} />
                </Tooltip>,
                <Popconfirm
                  title="Delete Attribute"
                  description={`Are you sure you want to delete "${attr.name}"?`}
                  onConfirm={() => selectedEntity && onDeleteAttribute(selectedEntity.id, attr.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Tooltip title="Delete Attribute">
                    <Button type="text" danger shape="circle" icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>
              ]}
            >
              <div className="attribute-list-item-content">
                <div className="attribute-icons">
                  {attr.isPrimaryKey && <Tooltip title="Primary Key"><KeyOutlined style={{ color: '#faad14' }} /></Tooltip>}
                  {attr.isForeignKey && <Tooltip title={`Foreign Key to ${attr.foreignKeyRelation?.referencesEntity}`}><LinkOutlined style={{ color: '#1677ff' }} /></Tooltip>}
                </div>
                <span className={attr.isPrimaryKey ? "attribute-name pk" : "attribute-name"}>{attr.name}</span>
                <span className="attribute-type">{attr.type}</span>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: "No attributes yet." }}
        />
      </div>

      {/* Danger Zone */}
      <div className="property-section danger-zone">
        <Popconfirm
          title="Delete Entity"
          description={`Delete "${selectedEntity?.name}"? This cannot be undone.`}
          onConfirm={() => selectedEntity && onDeleteEntity(selectedEntity.id)}
          okText="Yes, Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button type="primary" danger block>
            Delete Entity
          </Button>
        </Popconfirm>
      </div>
    </>
  );

  return (
    <>
      {/* 💻 Desktop View */}
      <aside className="properties-panel desktop-panel">
        <div className="properties-panel-header">
          <h2 className="properties-title">Properties</h2>
        </div>
        <div className="properties-panel-content">
          {selectedEntity ? panelContent : (
            <div className="properties-placeholder-container">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Select an entity to view its properties."
              />
            </div>
          )}
        </div>
      </aside>

      {/* 📱 Mobile View */}
      <FloatButton
        shape='square'
        icon={<SlidersOutlined />}
        type="primary"
        style={{ right: 24, bottom: 24 }}
        onClick={() => setDrawerOpen(true)}
        className="mobile-properties-trigger"
      />
      <Drawer
        title="Properties"
        placement="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        height="70%"
        className="mobile-properties-drawer"
      >
        {selectedEntity ? panelContent : (
          <div className="properties-placeholder-container">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Select an entity to view its properties."
            />
          </div>
        )}
      </Drawer>
    </>
  );
}
