import React, { useRef, useState } from 'react';
import { Button, Select, Drawer, Space, Popover, Input, Image } from 'antd';
import {
    PlusCircleOutlined,
    SaveOutlined,
    FolderOpenOutlined,
    MenuOutlined,
    GoldOutlined,
} from '@ant-design/icons';
import { SettingsPopup } from './SettingsForm';
import { useUniversal } from '../context/UniversalProvider';
import brandLogo from '../assets/branding/no-bg-flowmancer-brand-logo.png'
import brandText from "../assets/branding/no-bg-flowmancer-brand-text.png"


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
            <Button icon={<PlusCircleOutlined />} onClick={onAddEntity} disabled={UniversalProvider.state.isLoading}>Add Entity</Button>
            <Button icon={<SaveOutlined />} onClick={onSaveDesign} disabled={UniversalProvider.state.isLoading}>Save Design</Button>
            <Button icon={<FolderOpenOutlined />} onClick={handleLoadClick} disabled={UniversalProvider.state.isLoading}>Load Design</Button>
            <Popover
                content={
                    <div style={{ width: 260 }}>
                        <p>Describe your desired schema. <i>This will replace the current schema.</i></p>
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
                            disabled={!aiPrompt.trim() || UniversalProvider.settings.apiKey.trim() === '' || UniversalProvider.settings.geminiModel.trim() === ''}
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
                    disabled={!UniversalProvider.settings.apiKey.trim() || !UniversalProvider.settings.geminiModel.trim() || UniversalProvider.state.isLoading}
                    icon={<GoldOutlined />}
                >{!UniversalProvider.settings.apiKey.trim() || !UniversalProvider.settings.geminiModel.trim() ? 'Check Settings' : 'Generate AI Design'}</Button>
            </Popover>
        </Space>
    );

    return (
        <header className="app-toolbar">
            <div className="toolbar-section-left">
                <Image src={brandLogo} width={45} preview={false} />
                <Image src={brandText} width={200} preview={false} style={{ marginLeft: '-12px' }} />
            </div>
            <nav className="toolbar-section-center desktop-only">{Actions}</nav>
            <div className="toolbar-section-right">
                <Select value={targetStack} onChange={onTargetStackChange} disabled={UniversalProvider.state.isLoading} style={{ width: 180 }}>
                    <Option value="fastapi">FastAPI (Python)</Option>
                    <Option value="springboot">Spring Boot (Java)</Option>
                    <Option value="dotnet" disabled>.NET (soon)</Option>
                </Select>
                <Button
                    type="primary"
                    className={`toolbar-generate-button ${UniversalProvider.state.isLoading ? 'loading' : 'idle'}`}
                    disabled={
                        !UniversalProvider.settings.apiKey.trim() ||
                        !UniversalProvider.settings.geminiModel.trim() ||
                        UniversalProvider.state.isLoading
                    }
                    onClick={onGenerate}
                >
                    {
                        !UniversalProvider.settings.apiKey.trim() ||
                            !UniversalProvider.settings.geminiModel.trim()
                            ? 'Check Settings'
                            : 'Generate Backend'
                    }
                </Button>
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
                styles={{ body: { padding: 16 } }}
            >
                {Actions}
            </Drawer>
        </header>
    );
}
