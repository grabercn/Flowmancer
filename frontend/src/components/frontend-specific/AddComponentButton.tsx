import React, { useState } from 'react';
import { Button, Popover, Drawer, List, Typography, Grid } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import useBreakpoint from 'antd/lib/grid/hooks/useBreakpoint';

interface ComponentOption {
  key: string;
  label: string;
  description?: string;
}

const COMPONENT_OPTIONS: ComponentOption[] = [
  { key: 'button', label: 'Button', description: 'An Ant Design Button' },
  { key: 'input', label: 'Input', description: 'An Ant Design Input' },
  { key: 'checkbox', label: 'Checkbox', description: 'An Ant Design Checkbox' },
  { key: 'select', label: 'Select', description: 'An Ant Design Select' },
];

interface AddComponentButtonProps {
  onAdd: (componentKey: string) => void;
}

export function AddComponentButton({ onAdd }: AddComponentButtonProps) {
  const [visible, setVisible] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const handleOpen = () => setVisible(true);
  const handleClose = () => setVisible(false);

  const content = (
    <List
      dataSource={COMPONENT_OPTIONS}
      renderItem={(item) => (
        <List.Item onClick={() => { onAdd(item.key); handleClose(); }} style={{ cursor: 'pointer' }}>
          <List.Item.Meta
            title={<Typography.Text>{item.label}</Typography.Text>}
            description={item.description}
          />
        </List.Item>
      )}
    />
  );

  return (
    <>
      {isMobile ? (
        <Button icon={<PlusOutlined />} onClick={handleOpen} size='large'>
            Add Component
        </Button>
      ) : (
        <Popover
          content={content}
          title="Add UI Component"
          trigger="click"
          open={visible}
          onOpenChange={(open) => setVisible(open)}
        >
          <Button icon={<PlusOutlined />} size='large' >
            Add Component
          </Button>
        </Popover>
      )}
      {isMobile && (
        <Drawer
          title="Add UI Component"
          placement="bottom"
          onClose={handleClose}
          open={visible}
          height="40%"
        >
          {content}
        </Drawer>
      )}
    </>
  );
}
