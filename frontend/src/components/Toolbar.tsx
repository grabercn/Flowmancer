import React, { useEffect, useRef, useState } from 'react';
import { Button, Select, Drawer, Popover, Input, Image, Tooltip } from 'antd';
import {
    PlusCircleOutlined,
    SaveOutlined,
    FolderOpenOutlined,
    MenuOutlined,
    GoldOutlined,
    CodeOutlined,
} from '@ant-design/icons';
import { SettingsPopup } from './SettingsForm';
import { useUniversal } from '../context/UniversalProvider';
import brandLogo from '../assets/branding/no-bg-flowmancer-brand-logo.png';
import brandText from '../assets/branding/no-bg-flowmancer-brand-text.png';
import { AnimateWrapper } from './AnimateWrapper';
import { AddComponentButton } from './frontend-specific/AddComponentButton';

const { Option } = Select;
const { TextArea } = Input;

interface ToolbarProps {
    targetStack: string;
    onTargetStackChange: (stack: string) => void;
    onAddEntity: () => void;
    onAddComponent: () => void;
    onSaveDesign: () => void;
    onLoadDesign: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onGenerate: () => void;
    onGenerateAIDesign: (prompt: string) => void;
}

export function Toolbar({
    targetStack,
    onTargetStackChange,
    onAddEntity,
    onAddComponent,
    onSaveDesign,
    onLoadDesign,
    onGenerate,
    onGenerateAIDesign,
}: ToolbarProps) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [aiPopoverOpen, setAiPopoverOpen] = useState(false);
    const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isMobile, setIsMobile] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const UniversalProvider = useUniversal();

    useEffect(() => {
        const updateDevice = () => setIsMobile(window.innerWidth <= 768);
        updateDevice();
        window.addEventListener('resize', updateDevice);
        return () => window.removeEventListener('resize', updateDevice);
    }, []);

    const handleLoadClick = () => {
        fileInputRef.current?.click();
        setDrawerOpen(false);
    };

    const handleAIGenerate = () => {
        onGenerateAIDesign(aiPrompt);
        setAiPopoverOpen(false);
        setAiDrawerOpen(false);
        setDrawerOpen(false);
        setAiPrompt('');
    };

    const aiInputUI = (
        <div style={{ width: '100%' }} onMouseDown={(e) => e.stopPropagation()}>
            <p>Describe your desired schema. <i>This will replace the current schema.</i></p>
            <TextArea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                placeholder="Describe your design requirements..."
                style={{ marginBottom: 8 }}
            />
            <Button
                type="primary"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleAIGenerate}
                disabled={
                    !aiPrompt.trim() ||
                    UniversalProvider.settings.apiKey.trim() === '' ||
                    UniversalProvider.settings.geminiModel.trim() === ''
                }
                block
            >
                Generate
            </Button>
        </div>
    );

    const Actions = (
        <div className="toolbar-actions">
            <div className="toolbar-settings">
                {/* this renders as a similar button to the one/s below, but its in its own component for simplicity */}
                <SettingsPopup />

                <Tooltip title="Toggle Frontend Mode">
                    <Button
                        shape="circle"
                        type={UniversalProvider.state.isFrontEndMode ? 'primary' : 'dashed'}
                        icon={<CodeOutlined />}
                        onClick={() => {
                            UniversalProvider.state.setIsFrontEndMode(!UniversalProvider.state.isFrontEndMode);
                        }}
                        disabled={UniversalProvider.state.isLoading}
                        style={{
                            backgroundColor: UniversalProvider.state.isFrontEndMode ? '#e6f7ff' : undefined,
                            borderColor: UniversalProvider.state.isFrontEndMode ? '#91d5ff' : undefined,
                            color: UniversalProvider.state.isFrontEndMode ? '#1890ff' : undefined,
                        }}
                    />
                </Tooltip>
            </div>

                <AnimateWrapper show={!UniversalProvider.state.isFrontEndMode} containerClassName="in" childClassName="in">
                    <div className='toolbar-actions'>
                    <Button
                        icon={<PlusCircleOutlined />}
                        onClick={() => {
                            onAddEntity();
                            setDrawerOpen(false);
                        }}
                        disabled={UniversalProvider.state.isLoading}
                        block
                        size="large"
                    >
                        Add Entity
                    </Button>
                    <Button
                        icon={<SaveOutlined />}
                        onClick={onSaveDesign}
                        disabled={UniversalProvider.state.isLoading}
                        block
                        size="large"
                    >
                        Save Design
                    </Button>
                    <Button
                        icon={<FolderOpenOutlined />}
                        onClick={handleLoadClick}
                        disabled={UniversalProvider.state.isLoading}
                        block
                        size="large"
                    >
                        Load Design
                    </Button>
                    {isMobile ? (
                        <Button
                            type="default"
                            disabled={
                                !UniversalProvider.settings.apiKey.trim() ||
                                !UniversalProvider.settings.geminiModel.trim() ||
                                UniversalProvider.state.isLoading
                            }
                            icon={<GoldOutlined />}
                            block
                            size="large"
                            onClick={() => setAiDrawerOpen(true)}
                        >
                            {UniversalProvider.settings.apiKey.trim() && UniversalProvider.settings.geminiModel.trim()
                                ? 'Generate AI Design'
                                : 'Check Settings'}
                        </Button>
                    ) : (
                        <Popover
                            content={aiInputUI}
                            title="Generate Schema with AI"
                            trigger="click"
                            open={aiPopoverOpen}
                            onOpenChange={setAiPopoverOpen}
                            getPopupContainer={(triggerNode) => triggerNode.parentElement!}
                            placement="bottom"
                        >
                            <Button
                                type="default"
                                disabled={
                                    !UniversalProvider.settings.apiKey.trim() ||
                                    !UniversalProvider.settings.geminiModel.trim() ||
                                    UniversalProvider.state.isLoading
                                }
                                icon={<GoldOutlined />}
                                block
                                size="large"
                            >
                                {UniversalProvider.settings.apiKey.trim() && UniversalProvider.settings.geminiModel.trim()
                                    ? 'Generate AI Design'
                                    : 'Check Settings'}
                            </Button>
                        </Popover>
                    )}
                </div>
            </AnimateWrapper>
            <AnimateWrapper show={UniversalProvider.state.isFrontEndMode} containerClassName="out" childClassName="out">
                <div className='toolbar-actions'>
                    <AddComponentButton onAdd={onAddComponent}/>
                </div>
            </AnimateWrapper>
        </div>
    );

    return (
        <header className="app-toolbar">
            <div className="toolbar-section-left" style={{ filter: UniversalProvider.settings.darkMode.includes('dark') ? 'brightness(0) invert(1)' : 'none' }}>
                <Image src={brandLogo} width={45} preview={false} className="brand-logo" />
                <Image src={brandText} width={200} preview={false} style={{ marginLeft: '-12px' }} className="brand-text" />
            </div>

            <nav className="toolbar-section-center desktop-only">{Actions}</nav>

            <div className="toolbar-section-right">
                <Select
                    value={targetStack}
                    className="toolbar-target-stack"
                    onChange={onTargetStackChange}
                    disabled={UniversalProvider.state.isLoading}
                >
                    <Option value="fastapi">FastAPI (Python)</Option>
                    <Option value="springboot">Spring Boot (Java)</Option>
                    <Option value="dotnet">.NET (MS C#)</Option>
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
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ filter: UniversalProvider.settings.darkMode.includes('dark') ? 'brightness(0) invert(1)' : 'none' }}>
                        <Image src={brandLogo} width={45} preview={false} className="brand-logo" style={{ marginBottom: 8, marginRight: 8 }} />
                        <Image src={brandText} width={100} preview={false} />
                    </div>
                </div>
                {Actions}
            </Drawer>

            {/* Mobile AI Input Drawer */}
            <Drawer
                title="Generate Schema with AI"
                placement="bottom"
                onClose={() => setAiDrawerOpen(false)}
                open={aiDrawerOpen}
                height="40%"
                styles={{ body: { padding: 16 } }}
            >
                {aiInputUI}
            </Drawer>
        </header>
    );
}
