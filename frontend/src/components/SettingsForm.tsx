// frontend/src/components/SettingsForm.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  Form, Input, Select, Space, Button,
  Popover, Drawer, App as AntApp
} from 'antd';
import type { FormInstance } from 'antd';
import { useUniversal } from '../context/UniversalProvider';
import {
  SunOutlined,
  MoonOutlined,
  FireOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  SettingOutlined,
  SyncOutlined,
  ToolOutlined
} from '@ant-design/icons';

const { Option } = Select;

interface SettingsFormProps {
  form: FormInstance;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ form }) => {
  return (
    <Form
      form={form}
      layout="vertical"
      name="settings_form"
      style={{ width: '100%' }}
    >
      <Form.Item
        name="apiKey"
        label="Gemini API Key"
        rules={[{ required: true, message: 'An API key is required.' }]}
        tooltip={{
          title: (
            <Space direction="vertical" size={4}>
              <span>Your API key is stored locally in your browser and never sent to any server.</span>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                Get your key here
              </a>
            </Space>
          )
        }}
      >
        <Input.Password placeholder="Enter your Gemini API key" />
      </Form.Item>

      <Form.Item
        name="geminiModel"
        label="Gemini Model"
        rules={[{ required: true, message: 'Please select a model.' }]}
      >
        <Select placeholder="Select a Gemini model">
          <Option value="gemini-2.5-flash-preview-05-20">
            <Space><ThunderboltOutlined style={{ color: '#fa8c16' }} />gemini-2.5-flash-preview-05-20</Space>
          </Option>
          <Option value="gemini-2.5-flash">
            <Space><FireOutlined style={{ color: '#fa541c' }} />gemini-2.5-flash</Space>
          </Option>
          <Option value="gemini-2.5-pro">
            <Space><RocketOutlined style={{ color: '#722ed1' }} />gemini-2.5-pro</Space>
          </Option>
          <Option value="gemini-2.0-flash">
            <Space><FireOutlined />gemini-2.0-flash</Space>
          </Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="theme"
        label="Theme"
        rules={[{ required: true, message: 'Please select a theme.' }]}
      >
        <Select>
          <Option value="system"><Space><ToolOutlined />System</Space></Option>
          <Option value="light"><Space><SunOutlined />Light</Space></Option>
          <Option value="dark"><Space><MoonOutlined />Dark</Space></Option>
          <Option value="dark-red"><Space><FireOutlined style={{ color: '#ff4d4f' }} />Dark Red</Space></Option>
          <Option value="dark-blue"><Space><ThunderboltOutlined style={{ color: '#40a9ff' }} />Dark Blue</Space></Option>
        </Select>
      </Form.Item>
    </Form>
  );
};

interface SettingsPopupProps {}

export const SettingsPopup: React.FC<SettingsPopupProps> = () => {
  const [form] = Form.useForm();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const universalProvider = useUniversal();
  const { message: messageApi } = AntApp.useApp();
  const WELCOME_COOKIE_NAME = 'er2_backend_welcome_shown';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const populateForm = () => {
      form.setFieldsValue({
        apiKey: universalProvider.settings.apiKey,
        geminiModel: universalProvider.settings.geminiModel,
        theme: universalProvider.settings.darkMode,
      });
    };
    if (isPopoverOpen || isDrawerOpen) {
      populateForm();
    }
  }, [isPopoverOpen, isDrawerOpen]);

  const handleSave = () => {
    form.validateFields()
      .then(values => {
        universalProvider.settings.setApiKey(values.apiKey);
        universalProvider.settings.setGeminiModel(values.geminiModel);
        universalProvider.settings.setDarkMode(values.theme);
        messageApi.success("Settings saved successfully!");
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);
      })
      .catch(info => console.log('Validation Failed:', info));
  };

  const handleReset = useCallback(() => {
    document.cookie = `${WELCOME_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    universalProvider.settings.setApiKey('');
    universalProvider.settings.setGeminiModel('gemini-2.5-flash');
    universalProvider.settings.setDarkMode('light');
    messageApi.success("Settings have been reset. Reload the page to apply changes.");
  }, [messageApi]);

  const settingsContent = (
    <div>
      <SettingsForm form={form} />
      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <Button
          danger
          icon={<SyncOutlined />}
          onClick={handleReset}
          style={{ float: 'left' }}
        >
          Reset
        </Button>
        <Button onClick={() => {
          setIsPopoverOpen(false);
          setIsDrawerOpen(false);
        }} style={{ marginLeft: 8, marginRight: 8 }}>
          Cancel
        </Button>
        <Button type="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <>
          <Button
            shape="circle"
            icon={<SettingOutlined />}
            type="dashed"
            onClick={() => setIsDrawerOpen(true)}
          />
          <Drawer
            title="Settings"
            open={isDrawerOpen}
            placement="bottom"
            height="65%"
            onClose={() => setIsDrawerOpen(false)}
            styles={{ body: { padding: 16 } }}
          >
            {settingsContent}
          </Drawer>
        </>
      ) : (
        <Popover
          content={settingsContent}
          title="Application Settings"
          trigger="click"
          placement="bottomLeft"
          open={isPopoverOpen}
          onOpenChange={setIsPopoverOpen}
          getPopupContainer={(triggerNode) => triggerNode.parentElement!}
        >
          <Button shape="circle" icon={<SettingOutlined />} type="dashed" />
        </Popover>
      )}
    </>
  );
};
