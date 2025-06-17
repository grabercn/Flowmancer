import React, { useRef, useState } from 'react';
import { Button, Select, Drawer, Space, Typography, Popover, Input } from 'antd';
import {
    PlusCircleOutlined,
    SaveOutlined,
    FolderOpenOutlined,
    CodeOutlined,
    MenuOutlined,
    GoldOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { SettingsPopup } from './SettingsForm';
import { useUniversal } from '../context/UniversalProvider';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface ToolbarProps {
    targetStack: string;
    onTargetStackChange: (stack: string) => void;
    onAddEntity: () => void;
    onSaveDesign: () => void;
    onLoadDesign: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [aiPopoverOpen, setAiPopoverOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const UniversalProvider = useUniversal();
    

    const handleLoadClick = () => fileInputRef.current?.click();
    const handleAIGenerate = () => {
        onGenerateAIDesign(aiPrompt);
        setAiPopoverOpen(false);
    };

    const Actions = (
        <Space direction="horizontal" style={{ width: '100%' }}>
            <SettingsPopup />
            <Button icon={<PlusCircleOutlined />} onClick={onAddEntity} disabled={UniversalProvider.isLoading}>Add Entity</Button>
            <Button icon={<SaveOutlined />} onClick={onSaveDesign} disabled={UniversalProvider.isLoading}>Save Design</Button>
            <Button icon={<FolderOpenOutlined />} onClick={handleLoadClick} disabled={UniversalProvider.isLoading}>Load Design</Button>
            <Popover
                content={
                    <div style={{ width: 260 }}>
                        <p>Describe your desired schema.</p>
                        <TextArea
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                            rows={3}
                            placeholder="Describe your design requirements..."
                            style={{ marginBottom: 8 }}
                        />
                        <Button
                            type="primary"
                            onClick={handleAIGenerate}
                            disabled={!aiPrompt.trim() || UniversalProvider.apiKey.trim() === '' || UniversalProvider.geminiModel.trim() === ''}
                            block
                        >
                            Generate
                        </Button>
                    </div>
                }
                title="Generate Schema with AI"
                trigger="click"
                open={aiPopoverOpen}
                onOpenChange={setAiPopoverOpen}
                placement="bottom"
            >
                <Button
                    type="text"
                    disabled={!UniversalProvider.apiKey.trim() || !UniversalProvider.geminiModel.trim() || UniversalProvider.isLoading}
                    icon={<GoldOutlined />}
                >{!UniversalProvider.apiKey.trim() || !UniversalProvider.geminiModel.trim() ? 'Check Settings' : 'Generate AI Design'}</Button>
            </Popover>
        </Space>
    );

    return (
        <header className="app-toolbar">
            <div className="toolbar-section-left">
                <CodeOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                <Title level={4} style={{ margin: 0, display: 'none' }} className="desktop-only-title">
                    ER 2 Backend - Designer
                </Title>
            </div>
            <nav className="toolbar-section-center desktop-only">{Actions}</nav>
            <div className="toolbar-section-right">
                <Select value={targetStack} onChange={onTargetStackChange} disabled={UniversalProvider.isLoading} style={{ width: 180 }}>
                    <Option value="fastapi">FastAPI (Python)</Option>
                    <Option value="springboot">Spring Boot (Java)</Option>
                    <Option value="dotnet" disabled>.NET (soon)</Option>
                </Select>
                <Button
                    type="primary"
                    disabled={!UniversalProvider.apiKey.trim() || !UniversalProvider.geminiModel.trim() || UniversalProvider.isLoading }
                    onClick={onGenerate}
                >{!UniversalProvider.apiKey.trim() || !UniversalProvider.geminiModel.trim() ? 'Check Settings' : 'Generate Backend'}</Button>
                <div className="mobile-only-menu">
                    <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />
                </div>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={onLoadDesign}
                style={{ display: 'none' }}
                accept=".json"
            />
            <Drawer
                title="Actions"
                placement="right"
                onClose={() => setDrawerOpen(false)}
                open={drawerOpen}
                bodyStyle={{ padding: 16 }}
            >
                {Actions}
            </Drawer>
        </header>
    );
}
