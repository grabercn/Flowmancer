// frontend/src/components/WelcomeScreen.tsx

import React, { useState, useEffect } from 'react';
import {
    Modal,
    Typography,
    Button,
    Space,
    Divider,
    Steps,
    Form, // Import Ant Design Form
    App as AntApp,
    Image,
} from 'antd';
import {
    GithubOutlined,
    CoffeeOutlined,
    ToolOutlined,
    SmileOutlined,
} from '@ant-design/icons';
import confetti from 'canvas-confetti';
import Cookies from 'js-cookie';
import { useUniversal } from '../context/UniversalProvider';
import { SettingsForm } from './SettingsForm'; // <-- Import the reusable form component
import type { FormInstance } from 'antd';
import brandLogo from "../assets/branding/no-bg-flowmancer-brand-logo.png"
import brandText from "../assets/branding/no-bg-flowmancer-brand-text.png"

const { Title, Paragraph } = Typography;

const WELCOME_COOKIE_NAME = 'er2_backend_welcome_shown';

// --- Step 1: Welcome Content ---
const WelcomeStepContent = () => (
    <div style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <Space align="center" size="middle" direction="vertical">
                <Image src={brandLogo} width={100} alt="Flowmancer Logo" preview={false} />
                <Title>Welcome to Flowmancer</Title>
            </Space>
        </div>
        <Paragraph style={{ fontSize: '16px', marginTop: '16px' }}>
            Visually design your database schema on the canvas and instantly generate production-ready backend code for FastAPI, Spring Boot, and more.
        </Paragraph>
        <Divider />
        <Paragraph>
            This project is open-source. You can view the source code, contribute, or report issues on GitHub. If you find it useful, consider supporting its development!
        </Paragraph>
        <Space wrap size="large" style={{ marginTop: '24px', justifyContent: 'center', width: '100%' }}>
            <Button
                icon={<GithubOutlined />}
                href="https://github.com/your-username/er2-backend" // TODO: Replace
                target="_blank"
            >
                View on GitHub
            </Button>
            <Button
                icon={<CoffeeOutlined />}
                href="https://www.buymeacoffee.com/your-username" // TODO: Replace
                target="_blank"
            >
                Buy me a coffee
            </Button>
        </Space>
        <Paragraph style={{ textAlign: 'center', marginTop: '12px', color: '#8c8c8c' }}>
            This tool is completely free to use.
        </Paragraph>
    </div>
);

// --- Step 2: Settings Content (Now uses the reusable form) ---
const SettingsStepContent = ({ form }: { form: FormInstance }) => (
    <div className="settings-content" style={{ padding: '0 24px', marginTop: '24px' }}>
        <Paragraph>
            Configure your application settings. An API key is required for AI-powered features.
        </Paragraph>
        {/* Render the reusable form component, passing the form instance */}
        <SettingsForm form={form} />
    </div>
);

// --- Main WelcomeScreen Component ---
const WelcomeScreen: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [form] = Form.useForm(); // Create the form instance here
    const universalProvider = useUniversal();
    const { message: messageApi } = AntApp.useApp();

    useEffect(() => {
        const welcomeShown = Cookies.get(WELCOME_COOKIE_NAME);
        if (!welcomeShown) {
            setIsModalVisible(true);
            // Set initial form values from context when modal opens
            form.setFieldsValue({
                apiKey: universalProvider.settings.apiKey,
                geminiModel: universalProvider.settings.geminiModel,
                theme: universalProvider.settings.darkMode,
            });
        }
    }, []); // useEffect now has an empty dependency array as it should only run once on mount

    const handleNext = () => setCurrentStep(prev => prev + 1);
    const handlePrev = () => setCurrentStep(prev => prev - 1);

    const handleDone = () => {
        // Validate the form fields before proceeding
        form.validateFields()
            .then(async values => {
                // On success, save the settings to our global context
                universalProvider.settings.setApiKey(values.apiKey);
                universalProvider.settings.setGeminiModel(values.geminiModel);
                universalProvider.settings.setDarkMode(values.theme);

                messageApi.success("Settings saved! Welcome to Flowmancer!");

                // Close the modal and set the cookie
                fireConfetti();
                await wait(1200); // Let the animation run for a moment
                setIsModalVisible(false);
                Cookies.set(WELCOME_COOKIE_NAME, 'true', { expires: 365 });
            })
            .catch(info => {
                // If validation fails, Ant Design's form will automatically show the error messages
                console.log('Validation Failed:', info);
                messageApi.error("Please fill in all required fields.");
            });
    };

    // Simulate delay
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const fireConfetti = () => {
    const confettiInstance = confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
    });

    // Wait a moment and bump the z-index
    const canvas = document.querySelector('canvas');
    if (canvas) {
        canvas.style.zIndex = '9999';
        canvas.style.position = 'fixed'; // Ensure it sits on top
        canvas.style.pointerEvents = 'none'; // Prevent mouse issues
    }

    return confettiInstance;
    };


    const steps = [
        { title: 'Welcome', icon: <SmileOutlined /> },
        { title: 'Settings', icon: <ToolOutlined /> },
    ];

    const modalFooter = (
        <div style={{ marginTop: '24px' }}>
            {currentStep > 0 && (
                <Button style={{ margin: '0 8px' }} onClick={handlePrev}>
                    Previous
                </Button>
            )}
            {currentStep < steps.length - 1 && (
                <Button type="primary" onClick={handleNext}>
                    Next
                </Button>
            )}
            {currentStep === steps.length - 1 && (
                <Button type="primary" onClick={handleDone}>
                    Finish Setup
                </Button>
            )}
        </div>
    );

    return (
        <Modal
            title={
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                    <Space align="center" size="middle" direction="vertical">
                        <Image src={brandText} width={200} alt="Flowmancer Logo" preview={false} style={{ marginTop: '-16px' }} />
                    </Space>
                </div>
            }
            open={isModalVisible}
            footer={modalFooter}
            closable={false}
            maskClosable={false}
            width={720}
        >
            <Steps
                current={currentStep}
                items={steps}
                style={{ padding: '32px 0 24px' }}
            />
            <div className="steps-content">
                {currentStep === 0 && <WelcomeStepContent />}
                {/* Pass the form instance to the settings content component */}
                {currentStep === 1 && <SettingsStepContent form={form} />}
            </div>
        </Modal>
    );
};

// You need to wrap this component in AntApp to use the form and message hooks
const WelcomeScreenWithContext: React.FC = () => (
    <AntApp>
        <WelcomeScreen />
    </AntApp>
);

export default WelcomeScreenWithContext;
