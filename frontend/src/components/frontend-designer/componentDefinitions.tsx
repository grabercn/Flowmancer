import React from 'react';
import {
  // Component Imports
  Alert, Avatar, Badge, Button, Card, Checkbox, Col, DatePicker,
  Divider, Form, Image, Input, InputNumber,
  Progress, Row, Select, Slider, Space,
  Spin, Statistic, Switch, Table, Tag,
  Typography
} from 'antd';
import {
  // Icon Imports
  AppstoreAddOutlined, EditOutlined, CheckSquareOutlined, DownSquareOutlined, TableOutlined,
  IdcardOutlined, UserOutlined, PictureOutlined, FontSizeOutlined,
  LayoutOutlined, BorderOutlined, MinusOutlined,
  BarChartOutlined, MoreOutlined, InfoCircleOutlined, LoadingOutlined, LinkOutlined
} from '@ant-design/icons';

/**
 * Defines the schema for an editable property in the properties panel.
 */
export interface PropSchema {
  name: string;
  label: string;
  type: 'string' | 'boolean' | 'number' | 'select' | 'textarea';
  options?: (string | number)[]; // For 'select' type
  condition?: (props: any) => boolean; // Conditionally show this prop
}

// Reusable property schemas that can be shared across multiple components
export const SHARED_PROP_SCHEMAS: { [key: string]: PropSchema[] } = {
    link: [
        { name: 'href', label: 'URL', type: 'string', condition: (props) => props.type === 'link' || props.href },
        { name: 'target', label: 'Target', type: 'select', options: ['_self', '_blank'], condition: (props) => props.type === 'link' || props.href  },
    ],
    size: [
        { name: 'size', label: 'Size', type: 'select', options: ['small', 'middle', 'large'] }
    ],
    backendDescription: [
        { name: 'backendDescription', label: 'AI Generation Instructions', type: 'textarea' }
    ]
};

/**
 * Defines the full metadata for a component.
 * propsSchema can contain direct definitions or references to shared schemas.
 */
export interface ComponentDefinition {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
  isQuickComponent: boolean;
  defaultProps: { [key: string]: any };
  propsSchema: (PropSchema | keyof typeof SHARED_PROP_SCHEMAS)[];
}

// A centralized map of all component definitions.
const COMPONENT_DEFINITIONS: { [key: string]: ComponentDefinition } = {
  // --- LAYOUT ---
  row: {
    key: 'row',
    label: 'Row',
    description: 'A responsive grid row.',
    icon: <LayoutOutlined />,
    isQuickComponent: true,
    preview: <Row gutter={2} style={{width: '100%', height: '100%', padding: 5, alignItems:'stretch'}}><Col span={16}><div style={{height: '100%', background: '#1677ff', opacity: 0.8, borderRadius: 2}}></div></Col><Col span={8}><div style={{height: '100%', background: '#1677ff', opacity: 0.6, borderRadius: 2}}></div></Col></Row>,
    defaultProps: { gutter: 16, children: [], style: { padding: '10px', backgroundColor: 'rgba(22, 119, 255, 0.1)', border: '1px dashed #1677ff' } },
    propsSchema: [
        { name: 'gutter', label: 'Gutter', type: 'number' },
        'backendDescription'
    ],
  },
  divider: {
    key: 'divider',
    label: 'Divider',
    description: 'A separator line.',
    icon: <MinusOutlined />,
    isQuickComponent: false,
    preview: <div style={{width: 80, padding: '16px 0'}}><Divider /></div>,
    defaultProps: { children: '' },
    propsSchema: [
      { name: 'children', label: 'Text', type: 'string' },
      { name: 'dashed', label: 'Dashed', type: 'boolean' },
      { name: 'type', label: 'Type', type: 'select', options: ['horizontal', 'vertical'] },
      'backendDescription'
    ],
  },
  space: {
    key: 'space',
    label: 'Space',
    description: 'Set spacing between items.',
    icon: <BorderOutlined />,
    isQuickComponent: false,
    preview: <Space><Button size="small">A</Button><Button size="small">B</Button></Space>,
    defaultProps: { size: 'small', children: [] },
    propsSchema: [
      'size',
      { name: 'direction', label: 'Direction', type: 'select', options: ['horizontal', 'vertical'] },
      'backendDescription'
    ],
  },

  // --- GENERAL ---
  button: {
    key: 'button',
    label: 'Button',
    description: 'An interactive button.',
    icon: <AppstoreAddOutlined />,
    isQuickComponent: true,
    preview: <Button type="primary" size="small">Button</Button>,
    defaultProps: { children: 'Button' },
    propsSchema: [
      { name: 'children', label: 'Text', type: 'string' },
      { name: 'type', label: 'Type', type: 'select', options: ['primary', 'default', 'dashed', 'link', 'text'] },
      'link', // Reference to shared schema
      { name: 'danger', label: 'Danger', type: 'boolean' },
      { name: 'disabled', label: 'Disabled', type: 'boolean' },
      { name: 'shape', label: 'Shape', type: 'select', options: ['default', 'circle', 'round'] },
      'size',
      'backendDescription'
    ],
  },
  'typography.text': {
    key: 'typography.text',
    label: 'Text',
    description: 'For displaying text.',
    icon: <FontSizeOutlined />,
    isQuickComponent: true,
    preview: <Typography.Text>Text</Typography.Text>,
    defaultProps: { children: 'Some text content' },
    propsSchema: [
      { name: 'children', label: 'Content', type: 'string' },
      { name: 'type', label: 'Type', type: 'select', options: ['secondary', 'success', 'warning', 'danger'] },
      { name: 'disabled', label: 'Disabled', type: 'boolean' },
      { name: 'strong', label: 'Bold', type: 'boolean' },
      { name: 'italic', label: 'Italic', type: 'boolean' },
      'backendDescription'
    ],
  },
  'typography.title': {
    key: 'typography.title',
    label: 'Title',
    description: 'A heading.',
    icon: <FontSizeOutlined style={{ fontWeight: 'bold' }} />,
    isQuickComponent: false,
    preview: <Typography.Title level={5} style={{margin: 0}}>Title</Typography.Title>,
    defaultProps: { children: 'Heading Text', level: 3 },
    propsSchema: [
      { name: 'children', label: 'Content', type: 'string' },
      { name: 'level', label: 'Level', type: 'select', options: [1, 2, 3, 4, 5] },
      { name: 'type', label: 'Type', type: 'select', options: ['secondary', 'success', 'warning', 'danger'] },
      'backendDescription'
    ],
  },
  'typography.link': {
    key: 'typography.link',
    label: 'Link',
    description: 'A text hyperlink.',
    icon: <LinkOutlined />,
    isQuickComponent: false,
    preview: <Typography.Link>Link</Typography.Link>,
    defaultProps: { children: 'Link URL', href: '#'},
    propsSchema: [
      { name: 'children', label: 'Text', type: 'string' },
      { name: 'href', label: 'URL', type: 'string' },
      { name: 'target', label: 'Target', type: 'select', options: ['_self', '_blank'] },
      'backendDescription'
    ],
  },

  // --- DATA ENTRY ---
  form: {
      key: 'form',
      label: 'Form',
      description: 'A data entry form.',
      icon: <IdcardOutlined />,
      isQuickComponent: true,
      preview: <Form style={{border: '1px dashed #ccc', padding: 8, borderRadius: 4}}><Form.Item label="Field" style={{marginBottom: 0}}><Input size="small"/></Form.Item></Form>,
      defaultProps: { children: [] },
      propsSchema: [
          { name: 'layout', label: 'Layout', type: 'select', options: ['horizontal', 'vertical', 'inline'] },
          'backendDescription'
      ]
  },
  input: {
    key: 'input',
    label: 'Input',
    description: 'A text input field.',
    icon: <EditOutlined />,
    isQuickComponent: true,
    preview: <Input placeholder="Input" size="small" style={{ width: 80 }} />,
    defaultProps: { placeholder: 'Enter text...' },
    propsSchema: [
      { name: 'placeholder', label: 'Placeholder', type: 'string' },
      { name: 'disabled', label: 'Disabled', type: 'boolean' },
      { name: 'allowClear', label: 'Allow Clear', type: 'boolean' },
      'size',
      'backendDescription'
    ],
  },
  inputnumber: {
    key: 'inputnumber',
    label: 'Input Number',
    description: 'A numeric input field.',
    icon: <EditOutlined />,
    isQuickComponent: false,
    preview: <InputNumber size="small" defaultValue={1} />,
    defaultProps: { defaultValue: 0 },
    propsSchema: [
      { name: 'min', label: 'Min Value', type: 'number' },
      { name: 'max', label: 'Max Value', type: 'number' },
      { name: 'disabled', label: 'Disabled', type: 'boolean' },
      'size',
      'backendDescription'
    ],
  },
  select: {
    key: 'select',
    label: 'Select',
    description: 'A dropdown selection.',
    icon: <DownSquareOutlined />,
    isQuickComponent: false,
    preview: <Select placeholder="Select" size="small" style={{ width: 90 }} />,
    defaultProps: {
        placeholder: 'Select an option',
        options: [
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2' },
        ]
    },
    propsSchema: [
      { name: 'placeholder', label: 'Placeholder', type: 'string' },
      { name: 'disabled', label: 'Disabled', type: 'boolean' },
      { name: 'allowClear', label: 'Allow Clear', type: 'boolean' },
      { name: 'mode', label: 'Mode', type: 'select', options: ['multiple', 'tags'] },
      'size',
      'backendDescription'
    ],
  },
  checkbox: {
    key: 'checkbox',
    label: 'Checkbox',
    description: 'A single checkbox.',
    icon: <CheckSquareOutlined />,
    isQuickComponent: false,
    preview: <Checkbox>Checkbox</Checkbox>,
    defaultProps: { children: 'Checkbox' },
    propsSchema: [
        { name: 'children', label: 'Label', type: 'string' },
        { name: 'disabled', label: 'Disabled', type: 'boolean' },
        'backendDescription'
    ],
  },
  switch: {
    key: 'switch',
    label: 'Switch',
    description: 'A toggle switch.',
    icon: <CheckSquareOutlined />,
    isQuickComponent: false,
    preview: <Switch defaultChecked />,
    defaultProps: { defaultChecked: true },
    propsSchema: [
      { name: 'disabled', label: 'Disabled', type: 'boolean' },
      { name: 'size', label: 'Size', type: 'select', options: ['default', 'small'] },
      'backendDescription'
    ],
  },
  datepicker: {
    key: 'datepicker',
    label: 'Date Picker',
    description: 'A date selection component.',
    icon: <IdcardOutlined />,
    isQuickComponent: false,
    preview: <DatePicker size="small" style={{ width: 100 }} />,
    defaultProps: { placeholder: "Select date" },
    propsSchema: [
        { name: 'placeholder', label: 'Placeholder', type: 'string' },
        { name: 'picker', label: 'Picker', type: 'select', options: ['date', 'week', 'month', 'quarter', 'year'] },
        { name: 'disabled', label: 'Disabled', type: 'boolean' },
        'size',
        'backendDescription'
    ],
  },
  slider: {
    key: 'slider',
    label: 'Slider',
    description: 'A slider for selecting a value.',
    icon: <BarChartOutlined />,
    isQuickComponent: false,
    preview: <Slider defaultValue={50} style={{ width: 60, margin: 0 }} />,
    defaultProps: { defaultValue: 30 },
    propsSchema: [
        { name: 'min', label: 'Min', type: 'number' },
        { name: 'max', label: 'Max', type: 'number' },
        { name: 'disabled', label: 'Disabled', type: 'boolean' },
        { name: 'range', label: 'Range', type: 'boolean' },
        'backendDescription'
    ],
  },

  // --- DATA DISPLAY ---
  table: {
    key: 'table',
    label: 'Table',
    description: 'A grid for tabular data.',
    icon: <TableOutlined />,
    isQuickComponent: true,
    preview: <div style={{width: 100, height: 45, border: '1px solid #f0f0f0', borderRadius: 4}}><div style={{height: 15, background: '#fafafa', borderBottom: '1px solid #f0f0f0'}}></div><div style={{height: 15, borderBottom: '1px solid #f0f0f0'}}></div><div style={{height: 15}}></div></div>,
    defaultProps: {
        columns: [
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Age', dataIndex: 'age', key: 'age' },
        ],
        dataSource: [
            { key: '1', name: 'John Brown', age: 32 },
            { key: '2', name: 'Jim Green', age: 42 },
        ]
    },
    propsSchema: [
      'size',
      { name: 'bordered', label: 'Bordered', type: 'boolean' },
      'backendDescription'
    ],
  },
  card: {
    key: 'card',
    label: 'Card',
    description: 'A styled content container.',
    icon: <IdcardOutlined />,
    isQuickComponent: true,
    preview: <Card size="small" title="Card" style={{ width: 100 }} styles={{ body: { padding: 4 } }}>Content</Card>,
    defaultProps: { title: 'Card Title', children: [] },
    propsSchema: [
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'bordered', label: 'Bordered', type: 'boolean' },
      { name: 'hoverable', label: 'Hoverable', type: 'boolean' },
      'size',
      'backendDescription'
    ],
  },
  avatar: {
    key: 'avatar',
    label: 'Avatar',
    description: 'Represents a user or entity.',
    icon: <UserOutlined />,
    isQuickComponent: false,
    preview: <Avatar icon={<UserOutlined />} />,
    defaultProps: { shape: 'circle', size: 'default' },
    propsSchema: [
      { name: 'shape', label: 'Shape', type: 'select', options: ['circle', 'square'] },
      'size',
      { name: 'src', label: 'Image URL', type: 'string' },
      'backendDescription'
    ],
  },
  badge: {
    key: 'badge',
    label: 'Badge',
    description: 'A small count or status dot.',
    icon: <MoreOutlined />,
    isQuickComponent: false,
    preview: <Badge count={5}><Avatar shape="square" size="small" /></Badge>,
    defaultProps: { count: 5, children: [] },
    propsSchema: [
      { name: 'count', label: 'Count', type: 'number' },
      { name: 'dot', label: 'Dot', type: 'boolean' },
      { name: 'showZero', label: 'Show Zero', type: 'boolean' },
      'size',
      'backendDescription'
    ],
  },
  tag: {
    key: 'tag',
    label: 'Tag',
    description: 'A tag for categorization.',
    icon: <CheckSquareOutlined />,
    isQuickComponent: false,
    preview: <Tag color="blue">Tag</Tag>,
    defaultProps: { children: 'Tag', color: 'blue' },
    propsSchema: [
        { name: 'children', label: 'Text', type: 'string' },
        { name: 'color', label: 'Color', type: 'select', options: ['blue', 'green', 'red', 'orange', 'purple', 'default', 'geekblue', 'magenta', 'cyan', 'gold', 'lime'] },
        { name: 'closable', label: 'Closable', type: 'boolean' },
        'backendDescription'
    ],
  },
  image: {
    key: 'image',
    label: 'Image',
    description: 'A component for images.',
    icon: <PictureOutlined />,
    isQuickComponent: false,
    preview: <Image width={60} preview={false} src="https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png" />,
    defaultProps: {
        width: 200,
        src: 'https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png',
    },
    propsSchema: [
      { name: 'width', label: 'Width', type: 'number' },
      { name: 'height', label: 'Height', type: 'number' },
      { name: 'src', label: 'Image URL', type: 'string' },
      { name: 'preview', label: 'Enable Preview', type: 'boolean' },
      'backendDescription'
    ],
  },
  statistic: {
    key: 'statistic',
    label: 'Statistic',
    description: 'Displays a statistic value.',
    icon: <BarChartOutlined />,
    isQuickComponent: false,
    preview: <Statistic title="Users" value={1128} valueStyle={{fontSize: 16}} />,
    defaultProps: { title: 'Active Users', value: 112893 },
    propsSchema: [
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'value', label: 'Value', type: 'string' },
      'backendDescription'
    ],
  },

  // --- FEEDBACK ---
  alert: {
    key: 'alert',
    label: 'Alert',
    description: 'A component for showing alerts.',
    icon: <InfoCircleOutlined />,
    isQuickComponent: false,
    preview: <Alert message="Success" type="success" style={{ padding: '4px 8px', transform: 'scale(0.9)' }} />,
    defaultProps: { message: 'Alert Message', type: 'info', showIcon: true },
    propsSchema: [
      { name: 'message', label: 'Message', type: 'string' },
      { name: 'description', label: 'Description', type: 'string' },
      { name: 'type', label: 'Type', type: 'select', options: ['success', 'info', 'warning', 'error'] },
      { name: 'showIcon', label: 'Show Icon', type: 'boolean' },
      { name: 'closable', label: 'Closable', type: 'boolean' },
      'backendDescription'
    ],
  },
  progress: {
    key: 'progress',
    label: 'Progress',
    description: 'A progress bar or circle.',
    icon: <BarChartOutlined />,
    isQuickComponent: false,
    preview: <Progress percent={50} showInfo={false} style={{width: 80}} />,
    defaultProps: { percent: 50 },
    propsSchema: [
      { name: 'percent', label: 'Percent', type: 'number' },
      { name: 'type', label: 'Type', type: 'select', options: ['line', 'circle', 'dashboard'] },
      { name: 'status', label: 'Status', type: 'select', options: ['success', 'exception', 'normal', 'active'] },
      { name: 'showInfo', label: 'Show Info', type: 'boolean' },
      'size',
      'backendDescription'
    ],
  },
  spin: {
    key: 'spin',
    label: 'Spin',
    description: 'Indicates a loading state.',
    icon: <LoadingOutlined />,
    isQuickComponent: false,
    preview: <Spin />,
    defaultProps: { spinning: true, size: 'default' },
    propsSchema: [
        { name: 'spinning', label: 'Spinning', type: 'boolean' },
        'size',
        'backendDescription'
    ],
  },
};

// --- Component Map for Rendering ---
export const componentMap: { [key: string]: React.ElementType } = {
  'row': Row,
  'divider': Divider,
  'space': Space,
  'button': Button,
  'typography.text': Typography.Text,
  'typography.title': Typography.Title,
  'typography.link': Typography.Link,
  'form': Form,
  'input': Input,
  'inputnumber': InputNumber,
  'select': Select,
  'checkbox': Checkbox,
  'switch': Switch,
  'datepicker': DatePicker,
  'slider': Slider,
  'table': Table,
  'card': Card,
  'avatar': Avatar,
  'badge': Badge,
  'tag': Tag,
  'image': Image,
  'statistic': Statistic,
  'alert': Alert,
  'progress': Progress,
  'spin': Spin,
};


// --- EXPORTS ---
// The full, sorted list of all component definitions.
export const ALL_COMPONENTS_LIST = Object.values(COMPONENT_DEFINITIONS)
  .sort((a, b) => a.label.localeCompare(b.label));

// A filtered list containing only the components marked as "quick".
export const QUICK_COMPONENTS_LIST = ALL_COMPONENTS_LIST
  .filter(c => c.isQuickComponent);
