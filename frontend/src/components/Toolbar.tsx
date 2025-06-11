// frontend/src/components/Toolbar.tsx

import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';

// Import Ant Design components and icons
import { Button, Select, Drawer, Space, Typography } from 'antd';
import {
  PlusCircleOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  CodeOutlined,
  MenuOutlined,
} from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

// Define the props interface for type-safety and reusability
interface ToolbarProps {
  targetStack: string;
  onTargetStackChange: (stack: string) => void;
  onAddEntity: () => void;
  onSaveDesign: () => void;
  onLoadDesign: (event: ChangeEvent<HTMLInputElement>) => void;
  onGenerate: () => void;
}

export function Toolbar({
  targetStack,
  onTargetStackChange,
  onAddEntity,
  onSaveDesign,
  onLoadDesign,
  onGenerate,
}: ToolbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };

  const showDrawer = () => {
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  // A component for menu actions to avoid repetition
  const MenuActions = ({ isMobile = false }) => (
    <Space direction={isMobile ? 'vertical' : 'horizontal'} style={isMobile ? { width: '100%' } : {}}>
      <Button icon={<PlusCircleOutlined />} onClick={onAddEntity}>
        Add Entity
      </Button>
      <Button icon={<SaveOutlined />} onClick={onSaveDesign}>
        Save Design
      </Button>
      <Button icon={<FolderOpenOutlined />} onClick={handleLoadClick}>
        Load Design
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onLoadDesign}
        style={{ display: 'none' }}
        accept=".json"
      />
    </Space>
  );

  return (
    <header className="app-toolbar">
      <div className="toolbar-section-left">
        <CodeOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
        <Title level={4} style={{ margin: 0, display: 'none' }} className="desktop-only-title">
          Visual Schema Designer
        </Title>
      </div>

      {/* Desktop Navigation */}
      <nav className="toolbar-section-center">
        <MenuActions />
      </nav>

      <div className="toolbar-section-right">
        <Select
          value={targetStack}
          onChange={onTargetStackChange}
          style={{ width: 180 }}
        >
          <Option value="fastapi">FastAPI (Python)</Option>
          <Option value="springboot">Spring Boot (Java)</Option>
          <Option value="dotnet" disabled>.NET (soon)</Option>
        </Select>

        <Button type="primary" onClick={onGenerate}>
          Generate Backend
        </Button>

        {/* Mobile Menu Trigger */}
        <div className="mobile-only-menu">
          <Button type="text" icon={<MenuOutlined />} onClick={showDrawer} />
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer
        title="Actions"
        placement="right"
        onClose={closeDrawer}
        open={isDrawerOpen}
        bodyStyle={{ padding: '16px' }}
      >
        <MenuActions isMobile={true} />
      </Drawer>
    </header>
  );
}

