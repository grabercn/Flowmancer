import React, { useState } from 'react';
import {
  Button, Popover, Drawer, List, Typography, Divider, Modal, Input, Empty
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import useBreakpoint from 'antd/lib/grid/hooks/useBreakpoint';

// Import the pre-processed lists from our new definitions file
import { ALL_COMPONENTS_LIST, QUICK_COMPONENTS_LIST, type ComponentDefinition } from './componentDefinitions';

interface AddComponentButtonProps {
  // The onAdd callback passes the full definition object,
  // which includes the key, defaultProps, and more.
  onAdd: (componentDefinition: ComponentDefinition) => void;
}

export function AddComponentButton({ onAdd }: AddComponentButtonProps) {
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const handleOpenPopover = () => setPopoverVisible(true);
  const handleClosePopover = () => setPopoverVisible(false);

  const handleOpenModal = () => {
    setModalOpen(true);
    handleClosePopover(); // Close the popover when opening the modal
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSearchTerm(''); // Reset search on close
  };

  const handleAddComponent = (componentDef: ComponentDefinition) => {
    onAdd(componentDef);
    // Close both popover and modal after selection
    handleClosePopover();
    if(modalOpen) {
        handleCloseModal();
    }
  };

  // Filter full list by search term
  const filteredFullComponents = ALL_COMPONENTS_LIST.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reusable styles for list items
  const listItemStyle: React.CSSProperties = {
    cursor: 'pointer',
    padding: '12px 16px',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease-in-out',
  };

  // Renders a single list item for either the popover or the modal
  const renderListItem = (item: ComponentDefinition, inModal: boolean) => (
    <List.Item
      key={item.key}
      onClick={() => handleAddComponent(item)}
      style={{
        ...listItemStyle,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: hoveredItem === item.key ? (inModal ? '#f5f5f5' : '#f0f5ff') : 'transparent',
      }}
      onMouseEnter={() => setHoveredItem(item.key)}
      onMouseLeave={() => setHoveredItem(null)}
    >
      <List.Item.Meta
        avatar={!inModal ? <span style={{ marginRight: 8, fontSize: 18, color: '#4096ff' }}>{item.icon}</span> : undefined}
        title={<Typography.Text strong>{item.label}</Typography.Text>}
        description={inModal ? item.description : undefined}
        style={{ flex: 1 }}
      />
      {inModal && (
        <div style={{
          width: 120, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#f7f9fc', borderRadius: 6, border: '1px solid #e8e8e8',
        }}>
          {item.preview}
        </div>
      )}
    </List.Item>
  );

  // The content for the Popover (desktop) or Drawer (mobile)
  const quickListContent = (
    <div style={{ width: 280 }}>
      <Typography.Title level={5} style={{ padding: '8px 16px 0', margin: 0 }}>
        Add Component
      </Typography.Title>
      <Typography.Text type="secondary" style={{ padding: '0 16px 8px', display: 'block' }}>
        Common elements
      </Typography.Text>
      <Divider style={{ margin: '0 0 8px 0' }} />
      <List
        dataSource={QUICK_COMPONENTS_LIST}
        renderItem={(item) => renderListItem(item, false)}
      />
      <Divider style={{ margin: '8px 0' }}/>
      <div style={{ padding: '0 8px 8px' }}>
        <Button type="default" block onClick={handleOpenModal}>
          View All Components...
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <>
          <Button icon={<PlusOutlined />} onClick={handleOpenPopover} size="large">
            Add Component
          </Button>
          <Drawer
            title={<Typography.Title level={5} style={{margin: 0}}>Add Component</Typography.Title>}
            placement="bottom"
            onClose={handleClosePopover}
            open={popoverVisible}
            height="50%"
            styles={{ body: { padding: '16px' } }}
          >
            {quickListContent}
          </Drawer>
        </>
      ) : (
        <Popover
          content={quickListContent}
          trigger="click"
          open={popoverVisible}
          onOpenChange={setPopoverVisible}
          placement="bottomLeft"
        >
          <Button icon={<PlusOutlined />} size="large">
            Add Component
          </Button>
        </Popover>
      )}

      <Modal
        title="All Components"
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={650}
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto', padding: '8px 16px' }}
      >
        <Input
          placeholder="Search components (e.g., 'Alert', 'Table')"
          prefix={<SearchOutlined style={{ color: '#aaa' }} />}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: 20, position: 'sticky', top: -8, zIndex: 10, padding: '12px', margin: '0 -16px 16px -16px', width: 'calc(100% + 32px)', background: '#fff', borderBottom: '1px solid #f0f0f0' }}
          allowClear
        />
        <List
          dataSource={filteredFullComponents}
          renderItem={(item) => renderListItem(item, true)}
          locale={{ emptyText: <Empty description="No components found." /> }}
        />
      </Modal>
    </>
  );
}
