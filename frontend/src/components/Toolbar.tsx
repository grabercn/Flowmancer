// frontend/src/components/Toolbar.tsx

import React, { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';

// Import Ant Design components and icons
import { Button, Select, Drawer, Space, Typography, Popover, Input } from 'antd';
import {
    PlusCircleOutlined,
    SaveOutlined,
    FolderOpenOutlined,
    CodeOutlined,
    MenuOutlined,
    GoldOutlined,
} from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// --- STEP 1: Define a separate, stable component for the Popover content ---
// This prevents the TextArea from being re-created on every keystroke.
interface AIPromptContentProps {
    prompt: string;
    onPromptChange: (value: string) => void;
    onGenerate: () => void;
}

const AIPromptContent = ({ prompt, onPromptChange, onGenerate }: AIPromptContentProps) => (
    <div style={{ width: 280 }}>
        <p style={{ marginBottom: '8px' }}>Describe your desired schema. e.g., "A blog with users, posts, and comments."</p>
        <TextArea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            rows={4}
            style={{ width: '100%', marginBottom: '8px' }}
            placeholder="Describe your design requirements..."
        />
        <Button
            type="primary"
            onClick={onGenerate}
            disabled={!prompt.trim()}
        >
            Generate
        </Button>
    </div>
);


// --- STEP 2: Define a stable MenuActions component outside of Toolbar ---
interface MenuActionsProps {
    isMobile?: boolean;
    onAddEntity: () => void;
    onSaveDesign: () => void;
    onLoadClick: () => void;
    // Props for the AI Popover
    popoverOpen: boolean;
    onPopoverOpenChange: (visible: boolean) => void;
    aiPromptContent: React.ReactNode;
}

const MenuActions = ({
    isMobile = false,
    onAddEntity,
    onSaveDesign,
    onLoadClick,
    popoverOpen,
    onPopoverOpenChange,
    aiPromptContent,
}: MenuActionsProps) => {
    return (
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={isMobile ? { width: '100%' } : {}}>
            <Button icon={<PlusCircleOutlined />} onClick={onAddEntity}>
                Add Entity
            </Button>
            <Button icon={<SaveOutlined />} onClick={onSaveDesign}>
                Save Design
            </Button>
            <Button icon={<FolderOpenOutlined />} onClick={onLoadClick}>
                Load Design
            </Button>
            
            {/* Popover now wraps the button that triggers it */}
            <Popover
                content={aiPromptContent}
                title="Generate Schema with AI"
                trigger="click"
                open={popoverOpen}
                onOpenChange={onPopoverOpenChange}
                placement="bottom"
            >
                <Button type='text' icon={<GoldOutlined />}>
                    Generate AI Design
                </Button>
            </Popover>
        </Space>
    );
};


// --- STEP 3: Define the main Toolbar component ---
interface ToolbarProps {
    targetStack: string;
    onTargetStackChange: (stack: string) => void;
    onAddEntity: () => void;
    onSaveDesign: () => void;
    onLoadDesign: (event: ChangeEvent<HTMLInputElement>) => void;
    onGenerate: () => void;
    onGenerateAIDesign: (prompt: string) => void;
}

export function Toolbar({
    targetStack,
    onTargetStackChange,
    onAddEntity,
    onSaveDesign,
    onLoadDesign,
    onGenerate,
    onGenerateAIDesign,
}: ToolbarProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showPromptPopover, setShowPromptPopover] = useState(false);
    const [designPrompt, setDesignPrompt] = useState("");

    const handleLoadClick = () => {
        fileInputRef.current?.click();
    };

    const handleGenerateFromAi = () => {
        onGenerateAIDesign(designPrompt);
        setShowPromptPopover(false); // Close the popover after clicking generate
    };

    const showDrawer = () => setIsDrawerOpen(true);
    const closeDrawer = () => setIsDrawerOpen(false);
    
    // Memoize the content for the popover so it's not recreated unless dependencies change
    const aiPromptContent = React.useMemo(() => (
        <AIPromptContent 
            prompt={designPrompt}
            onPromptChange={setDesignPrompt}
            onGenerate={handleGenerateFromAi}
        />
    ), [designPrompt]);


    return (
        <header className="app-toolbar">
            <div className="toolbar-section-left">
                <CodeOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
                <Title level={4} style={{ margin: 0, display: 'none' }} className="desktop-only-title">
                    ER 2 Backend - Designer
                </Title>
            </div>

            {/* Desktop Navigation */}
            <nav className="toolbar-section-center">
                <MenuActions 
                    onAddEntity={onAddEntity}
                    onSaveDesign={onSaveDesign}
                    onLoadClick={handleLoadClick}
                    popoverOpen={showPromptPopover}
                    onPopoverOpenChange={setShowPromptPopover}
                    aiPromptContent={aiPromptContent}
                />
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

            {/* Hidden file input for the "Load Design" action */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={onLoadDesign}
                style={{ display: 'none' }}
                accept=".json"
            />

            {/* Mobile Drawer */}
            <Drawer
                title="Actions"
                placement="right"
                onClose={closeDrawer}
                open={isDrawerOpen}
                bodyStyle={{ padding: '16px' }}
            >
                <MenuActions 
                    isMobile={true}
                    onAddEntity={onAddEntity}
                    onSaveDesign={onSaveDesign}
                    onLoadClick={handleLoadClick}
                    popoverOpen={showPromptPopover}
                    onPopoverOpenChange={setShowPromptPopover}
                    aiPromptContent={aiPromptContent}
                />
            </Drawer>
        </header>
    );
}
// Toolbar component for the ER 2 Backend Designer
// This component provides a responsive toolbar with options to add entities, save/load designs, and generate backend code.