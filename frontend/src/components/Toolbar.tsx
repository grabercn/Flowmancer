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
import { AddComponentButton } from './frontend-designer/AddComponentButton';
import { SummaryForm } from './SummaryForm';
import type { ComponentDefinition } from './frontend-designer/componentDefinitions';
const { Option } = Select;
const { TextArea } = Input;

interface ToolbarProps {
    targetStack: string;
    onTargetStackChange: (stack: string) => void;
    onAddEntity: () => void; // This is for backend entities
    onAddComponent: (componentDefinition: ComponentDefinition) => void;
    onSaveDesign: (fileName?: string, backendSummary?: string) => void;
    onLoadDesign: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onGenerate: () => Promise<void>;
    onGenerateAIDesign: (designPrompt: string) => Promise<void>;
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

    const BackendActions = (
        <div className="toolbar-actions">
            <Button icon={<PlusCircleOutlined />} onClick={onAddEntity} disabled={UniversalProvider.state.isLoading} block size="large">
                Add Entity
            </Button>
            <Button icon={<SaveOutlined />} onClick={() => onSaveDesign()} disabled={UniversalProvider.state.isLoading} block size="large">
                Save Design
            </Button>
            <Button icon={<FolderOpenOutlined />} onClick={() => fileInputRef.current?.click()} disabled={UniversalProvider.state.isLoading} block size="large">
                Load Design
            </Button>
            {isMobile ? (
                <Button
                    type="default"
                    disabled={UniversalProvider.settings.apiKey.trim() === '' || UniversalProvider.settings.geminiModel.trim() === '' || UniversalProvider.state.isLoading}
                    icon={<GoldOutlined />}
                    block
                    size="large"
                    onClick={() => setAiDrawerOpen(true)}
                >
                    {UniversalProvider.settings.apiKey && UniversalProvider.settings.geminiModel ? 'Generate AI Design' : 'Check Settings'}
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
                        disabled={UniversalProvider.settings.apiKey.trim() === '' || UniversalProvider.settings.geminiModel.trim() === '' || UniversalProvider.state.isLoading}
                        icon={<GoldOutlined />}
                        block
                        size="large"
                    >
                        {UniversalProvider.settings.apiKey && UniversalProvider.settings.geminiModel ? 'Generate AI Design' : 'Check Settings'}
                    </Button>
                </Popover>
            )}
        </div>
    );

    const FrontendActions = (
        <div className="toolbar-actions">
            <AddComponentButton onAdd={onAddComponent} />
            <Button icon={<SaveOutlined />} onClick={() => onSaveDesign()} disabled={UniversalProvider.state.isLoading} block size="large">
                Save Design
            </Button>
            <Button icon={<FolderOpenOutlined />} onClick={() => fileInputRef.current?.click()} disabled={UniversalProvider.state.isLoading} block size="large">
                Load Design
            </Button>
        </div>
    );

    const SettingsActions = (
        <div className="toolbar-settings">
            <SettingsPopup />
            <SummaryForm initialSummary={UniversalProvider.data.backendSummary} />
            <Tooltip title="Toggle Frontend Mode">
                <Button
                    shape="circle"
                    type={UniversalProvider.state.isFrontEndMode ? 'primary' : 'dashed'}
                    icon={<CodeOutlined />}
                    onClick={() => UniversalProvider.state.setIsFrontEndMode(!UniversalProvider.state.isFrontEndMode)}
                    disabled={UniversalProvider.state.isLoading}
                    style={{
                        backgroundColor: UniversalProvider.state.isFrontEndMode ? '#e6f7ff' : undefined,
                        borderColor: UniversalProvider.state.isFrontEndMode ? '#91d5ff' : undefined,
                        color: UniversalProvider.state.isFrontEndMode ? '#1890ff' : undefined,
                    }}
                />
            </Tooltip>
        </div>
    );

    return (
        <header className="app-toolbar">
            <div className="toolbar-section-left" style={{ filter: UniversalProvider.settings.darkMode.includes('dark') ? 'brightness(0) invert(1)' : 'none' }}>
                <Image src={brandLogo} width={45} preview={false} className="brand-logo" />
                <Image src={brandText} width={200} preview={false} style={{ marginLeft: '-12px' }} className="brand-text" />
            </div>

            <nav className="toolbar-section-center desktop-only">
                <AnimateWrapper show={!UniversalProvider.state.isFrontEndMode} containerClassName="in" childClassName="in" animation='zoom'>
                    {SettingsActions}
                </AnimateWrapper>

                <AnimateWrapper show={UniversalProvider.state.isFrontEndMode} containerClassName="out" childClassName="out" animation='zoom'>
                    {SettingsActions}
                </AnimateWrapper>

                <AnimateWrapper show={!UniversalProvider.state.isFrontEndMode} containerClassName="in" childClassName="in">
                    {BackendActions}
                </AnimateWrapper>

                <AnimateWrapper show={UniversalProvider.state.isFrontEndMode} containerClassName="out" childClassName="out">
                    {FrontendActions}
                </AnimateWrapper>
            </nav>

            <div className="toolbar-section-right">
                <Select
                    value={targetStack}
                    className="toolbar-target-stack"
                    onChange={onTargetStackChange}
                    disabled={UniversalProvider.state.isLoading}
                >
                    {UniversalProvider.state.isFrontEndMode ? (
                        <>
                            <Option value="react">React (TypeScript)</Option>
                            <Option value="vue">Vue.js</Option>
                            <Option value="nextjs">Next.js</Option>
                        </>
                    ) : (
                        <>
                            <Option value="fastapi">FastAPI (Python)</Option>
                            <Option value="springboot">Spring Boot (Java)</Option>
                            <Option value="dotnet">.NET (MS C#)</Option>
                        </>
                    )}
                </Select>

                <Button
                    type="primary"
                    className={`toolbar-generate-button ${UniversalProvider.state.isLoading ? 'loading' : 'idle'}`}
                    disabled={UniversalProvider.settings.apiKey.trim() === '' || UniversalProvider.settings.geminiModel.trim() === '' || UniversalProvider.state.isLoading}
                    onClick={onGenerate}
                >
                    {UniversalProvider.settings.apiKey && UniversalProvider.settings.geminiModel ? 'Generate Backend' : 'Check Settings'}
                </Button>

                <div className="mobile-only-menu">
                    <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={onLoadDesign} style={{ display: 'none' }} accept=".flowmancer" />

            <Drawer title="Actions" placement="right" onClose={() => setDrawerOpen(false)} open={drawerOpen} styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ filter: UniversalProvider.settings.darkMode.includes('dark') ? 'brightness(0) invert(1)' : 'none' }}>
                        <Image src={brandLogo} width={45} preview={false} className="brand-logo" style={{ marginBottom: 8, marginRight: 8 }} />
                        <Image src={brandText} width={100} preview={false} />
                    </div>
                </div>

                <AnimateWrapper show={!UniversalProvider.state.isFrontEndMode} containerClassName="in" childClassName="in" animation='zoom'>
                    {SettingsActions}
                </AnimateWrapper>

                <AnimateWrapper show={UniversalProvider.state.isFrontEndMode} containerClassName="out" childClassName="out" animation='zoom'>
                    {SettingsActions}
                </AnimateWrapper>

                <AnimateWrapper show={!UniversalProvider.state.isFrontEndMode} animation="slide-left" containerClassName="in" childClassName="in">
                    {BackendActions}
                </AnimateWrapper>
                
                <AnimateWrapper show={UniversalProvider.state.isFrontEndMode} animation="slide-left" containerClassName="out" childClassName="out">
                    {FrontendActions}
                </AnimateWrapper>

            </Drawer>

            <Drawer title="Generate Schema with AI" placement="bottom" onClose={() => setAiDrawerOpen(false)} open={aiDrawerOpen} height="40%" styles={{ body: { padding: 16 } }}>
                {aiInputUI}
            </Drawer>
        </header>
    );
}
