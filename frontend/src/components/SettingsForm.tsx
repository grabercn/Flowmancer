// frontend/src/components/SettingsForm.tsx

import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Space, Button, Popover, App as AntApp } from 'antd';
import type { FormInstance } from 'antd';
import { useUniversal } from '../context/UniversalProvider';
import {
  SunOutlined,
  MoonOutlined,
  FireOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  SettingOutlined,
  EyeOutlined,
  HistoryOutlined,
} from '@ant-design/icons';

const { Option } = Select;

// --- 1. Reusable Settings Form Component ---
// This component is "dumb" and only contains the form fields.
// It receives its form instance from the parent.
interface SettingsFormProps {
  form: FormInstance;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ form }) => {
  return (
    <Form
      form={form}
      layout="vertical"
      name="settings_form"
      style={{ width: 320 }}
    >
      <Form.Item
        name="apiKey"
        label="Gemini API Key"
        rules={[{ required: true, message: 'An API key is required.' }]}
        tooltip="Your API key is stored locally in your browser's cookies and is never sent to our servers."
      >
        <Input.Password placeholder="Enter your Gemini API key" />
      </Form.Item>

      <Form.Item
        name="geminiModel"
        label="Gemini Model"
        rules={[{ required: true, message: 'Please select a model.' }]}
      >
        <Select placeholder="Select a Gemini model">
          {/* Latest models */}
          <Option value="gemini-2.5-flash-preview-05-20">
            <Space>
              <ThunderboltOutlined style={{ color: '#fa8c16' }} />
              gemini-2.5-flash-preview-05-20 (Recommended Preview)
            </Space>
          </Option>
          <Option value="gemini-2.5-flash">
            <Space>
              <FireOutlined style={{ color: '#fa541c' }} />
              gemini-2.5-flash (Default Model)
            </Space>
          </Option>
          <Option value="gemini-2.5-pro">
            <Space>
              <RocketOutlined style={{ color: '#722ed1' }} />
              gemini-2.5-pro (Advanced Reasoning)
            </Space>
          </Option>

          {/* Older models */}
          <Option value="gemini-2.0-flash">
            <Space>
              <FireOutlined style={{ color: '#fa8c16' }} />
              gemini-2.0-flash (High Performance)
            </Space>
          </Option>
          <Option value="gemini-2.0-flash-001">
            <Space>
              <HistoryOutlined style={{ color: '#8c8c8c' }} />
              gemini-2.0-flash-001 (Stable Release)
            </Space>
          </Option>
          <Option value="gemini-2.0-pro-exp-02-05">
            <Space>
              <RocketOutlined style={{ color: '#722ed1' }} />
              gemini-2.0-pro-exp-02-05 (Experimental Pro)
            </Space>
          </Option>
          <Option value="gemini-2.0-flash-thinking-exp-01-21">
            <Space>
              <EyeOutlined style={{ color: '#13c2c2' }} />
              gemini-2.0-flash-thinking-exp-01-21 (Reasoning Experimental)
            </Space>
          </Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="theme"
        label="Theme"
        rules={[{ required: true, message: 'Please select a theme.' }]}
      >
        <Select>
          <Option value="light">
            <Space><SunOutlined /> Light</Space>
          </Option>
          <Option value="dark">
            <Space><MoonOutlined /> Dark</Space>
          </Option>
          <Option value="dark-red" >
            <Space><FireOutlined style={{ color: '#ff4d4f' }} /> Dark Red</Space>
          </Option>
          <Option value="dark-blue" >
            <Space><ThunderboltOutlined style={{ color: '#40a9ff' }} /> Dark Blue</Space>
          </Option>
        </Select>
      </Form.Item>
    </Form>
  );
};


// --- 2. Popup Wrapper Component ---
// This component uses the SettingsForm and adds the Popover and logic.
// This is what you will import into your Toolbar.
interface SettingsPopupProps {
  // You can add props here if needed, e.g., onSave callback
}

export const SettingsPopup: React.FC<SettingsPopupProps> = () => {
  const [form] = Form.useForm();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const universalProvider = useUniversal();
  const { message: messageApi } = AntApp.useApp();

  // When the popover opens, sync the form with the latest context state.
  useEffect(() => {
    if (isPopoverOpen) {
      form.setFieldsValue({
        apiKey: universalProvider.apiKey,
        geminiModel: universalProvider.geminiModel,
        theme: universalProvider.darkMode,
      });
    }
  }, [isPopoverOpen, universalProvider, form]);

  const handleSave = () => {
    form.validateFields()
      .then(values => {
        universalProvider.setApiKey(values.apiKey);
        universalProvider.setGeminiModel(values.geminiModel);
        universalProvider.setDarkMode(values.theme);
        messageApi.success({ content: "Settings saved successfully!" });
        setIsPopoverOpen(false); // Close popover on successful save
      })
      .catch(info => {
        console.log('Validation Failed:', info);
        // Antd form will show validation errors on the fields automatically
      });
  };

  const popoverContent = (
    <div>
      <SettingsForm form={form} />
      <div style={{ textAlign: 'right', marginTop: '16px' }}>
        <Button onClick={() => setIsPopoverOpen(false)} style={{ marginRight: 8 }}>
          Cancel
        </Button>
        <Button type="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      title="Application Settings"
      trigger="click"
      placement="bottomLeft"
      open={isPopoverOpen}
      onOpenChange={setIsPopoverOpen}
    >
      <Button icon={<SettingOutlined />} type="dashed" />
    </Popover>
  );
};
