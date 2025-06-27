import React, { useState, useMemo } from 'react';
import type { Entity, Attribute } from '../types';
import { ALL_COMPONENTS_LIST, type PropSchema, SHARED_PROP_SCHEMAS } from './frontend-designer/componentDefinitions';
import { useUniversal } from '../context/UniversalProvider';
import {
  Button, Input, List, Tooltip, Empty, Popconfirm, Drawer, FloatButton,
  Select, Switch, InputNumber
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  LinkOutlined,
  SlidersOutlined
} from '@ant-design/icons';
import { AnimateWrapper } from './AnimateWrapper';

const { TextArea } = Input;

interface PropertiesPanelProps {
  selectedEntity: Entity | null; // Can be a backend entity or a frontend component
  onUpdateEntityName: (entityId: string, newName: string) => void;
  onDeleteEntity: (entityId: string) => void;
  onAddAttribute: (entityId: string) => void;
  onEditAttribute: (entityId: string, attributeId: string) => void;
  onDeleteAttribute: (entityId: string, attributeId: string) => void;
  onUpdateComponentProps?: (componentId: string, newProps: any) => void;
}

export function PropertiesPanel({
  selectedEntity,
  onUpdateEntityName,
  onDeleteEntity,
  onAddAttribute,
  onEditAttribute,
  onDeleteAttribute,
  onUpdateComponentProps,
}: PropertiesPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { state: { isFrontEndMode } } = useUniversal();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedEntity) {
      onUpdateEntityName(selectedEntity.id, e.target.value);
    }
  };

  const handlePropChange = (propName: string, value: any) => {
    if (selectedEntity && onUpdateComponentProps) {
      const newProps = { ...selectedEntity.props, [propName]: value };
      onUpdateComponentProps(selectedEntity.id, newProps);
    }
  };
  
  // Dynamically renders the correct input control based on the prop's schema type
  const renderPropEditor = (prop: PropSchema) => {
      const { name, type, options } = prop;
      const value = selectedEntity?.props?.[name];

      switch (type) {
          case 'string':
              return <Input value={value} onChange={(e) => handlePropChange(name, e.target.value)} />;
          case 'textarea':
              return <TextArea rows={3} value={value} onChange={(e) => handlePropChange(name, e.target.value)} />;
          case 'number':
              return <InputNumber style={{width: '100%'}} value={value} onChange={(val) => handlePropChange(name, val)} />;
          case 'boolean':
              return <Switch checked={value} onChange={(checked) => handlePropChange(name, checked)} />;
          case 'select':
              return (
                  <Select
                      style={{ width: '100%' }}
                      value={value}
                      onChange={(val) => handlePropChange(name, val)}
                  >
                      {options?.map(opt => <Select.Option key={String(opt)} value={opt}>{String(opt)}</Select.Option>)}
                  </Select>
              );
          default:
              return <Input value={value} disabled />;
      }
  };

  const componentDef = useMemo(() => isFrontEndMode && selectedEntity?.componentType
    ? ALL_COMPONENTS_LIST.find(def => def.key === selectedEntity.componentType)
    : null, [isFrontEndMode, selectedEntity]);

  const visibleProps = useMemo(() => {
    if (!componentDef || !selectedEntity) return [];
    
    // Flatten the schema by replacing string keys with the actual shared schema objects
    const flattenedSchema = componentDef.propsSchema.flatMap(item => 
        typeof item === 'string' ? (SHARED_PROP_SCHEMAS[item] || []) : [item as PropSchema]
    );

    // Filter properties based on the condition function, with a type guard
    return flattenedSchema.filter(prop => {
      // Type guard to ensure prop is a valid PropSchema object before access
      if (typeof prop === 'object' && prop !== null && 'name' in prop) {
        // Now that TS knows prop is a PropSchema, we can safely access .condition
        return !prop.condition || prop.condition(selectedEntity.props);
      }
      return false;
    });
  }, [componentDef, selectedEntity]);


  const renderFrontendPanel = () => (
    <AnimateWrapper show={true} animation="zoom"containerClassName="in" childClassName="in">
    <>
      <div className="property-section">
        <label htmlFor="component-name-input" className="property-label">Component Name</label>
        <Input
          id="component-name-input"
          value={selectedEntity?.name}
          onChange={handleNameChange}
          placeholder="Enter component name"
        />
      </div>
      <div className="property-section">
        <label className="property-label">Component Properties</label>
        {componentDef ? (
            <List
                size="small"
                bordered
                dataSource={visibleProps}
                renderItem={(prop: PropSchema) => (
                    <List.Item>
                        <div className="prop-editor-item">
                           <span className="prop-editor-label">{prop.label}</span>
                           <div className="prop-editor-control">
                            {renderPropEditor(prop)}
                           </div>
                        </div>
                    </List.Item>
                )}
            />
        ) : <Empty description="No editable properties." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </div>
       <div className="property-section danger-zone">
        <Popconfirm
          title="Delete Component"
          description={`Delete "${selectedEntity?.name}"? This cannot be undone.`}
          onConfirm={() => selectedEntity && onDeleteEntity(selectedEntity.id)}
          okText="Yes, Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button type="primary" danger block>
            Delete Component
          </Button>
        </Popconfirm>
      </div>
    </>
    </AnimateWrapper>
  );

  const renderBackendPanel = () => (
    <AnimateWrapper show={true} animation='zoom' containerClassName="in" childClassName="in">
    <>
      <div className="property-section">
        <label htmlFor="entity-name-input" className="property-label">Entity Name</label>
        <Input
          id="entity-name-input"
          value={selectedEntity?.name}
          onChange={handleNameChange}
          placeholder="Enter entity name"
        />
      </div>
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
                <Tooltip title="Edit Attribute" key="edit">
                  <Button type="text" shape="circle" icon={<EditOutlined />} onClick={() => selectedEntity && onEditAttribute(selectedEntity.id, attr.id)} />
                </Tooltip>,
                <Popconfirm
                  key="delete"
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
    </AnimateWrapper>
  );

  const panelContent = isFrontEndMode ? renderFrontendPanel() : renderBackendPanel();
  const placeholderText = isFrontEndMode ? "Select a component to view its properties." : "Select an entity to view its properties.";

  return (
    <>
      <aside className="properties-panel desktop-panel">
        <div className="properties-panel-header">
          <h2 className="properties-title">Properties</h2>
        </div>
        <div className="properties-panel-content">
          {selectedEntity ? panelContent : (
            <div className="properties-placeholder-container">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={placeholderText}
              />
            </div>
          )}
        </div>
      </aside>

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
              description={placeholderText}
            />
          </div>
        )}
      </Drawer>
    </>
  );
}
