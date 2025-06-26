import React, { useState, useEffect, useRef } from 'react';
import {
  Input, Button, Space, Popover, Drawer, Grid, Tooltip, App as AntApp
} from 'antd';
import {
  EditOutlined, SaveOutlined, CloseOutlined, FileTextOutlined,
  UploadOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useUniversal } from '../context/UniversalProvider';
import { parseBackendSummary } from '../utils/parseBackendSummary'; // Must return string or null

const { useBreakpoint } = Grid;

interface SummaryFormProps {
  initialSummary: string;
}

export const SummaryForm: React.FC<SummaryFormProps> = ({ initialSummary }) => {
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(initialSummary);
  const { message: messageApi } = AntApp.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [open, setOpen] = useState(false);
  const UniversalProvider = useUniversal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setSummary(initialSummary), [initialSummary]);

  const handleSave = () => {
    messageApi.success('Summary saved successfully!');
    UniversalProvider.data.setBackendSummary(summary);
    setEditing(false);
    setOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const parsedSummary = parseBackendSummary(text); // must return a string or null/undefined
        if (!parsedSummary || typeof parsedSummary !== 'string') {
          throw new Error('Invalid parsed output');
        }
        setSummary(parsedSummary);
        messageApi.success('Summary loaded from file!');
      } catch (err) {
        messageApi.error('Failed to load summary. File is not valid JSON or has incorrect layout.');
      }
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const renderContent = () => (
    <div style={{ width: isMobile ? '100%' : 400, maxWidth: '90vw' }}>
      <Input.TextArea
        value={summary}
        onChange={e => setSummary(e.target.value)}
        readOnly={!editing}
        autoSize={{ minRows: 4 }}
        placeholder={!initialSummary && !editing
          ? 'Generate a backend first, and a summary will appear here. Or edit to add one manually.'
          : undefined
        }
        style={editing ? {} : { backgroundColor: '#fafafa' }}
      />
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {editing && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <Space>
              <Button icon={<UploadOutlined />} onClick={triggerFileInput}>
                Load from File
              </Button>
              <Tooltip title="If this is empty, check your unzipped project folder for a summary.json file.">
                <InfoCircleOutlined style={{ fontSize: 16, color: '#999' }} />
              </Tooltip>
            </Space>
          </>
        )}
        <div style={{ marginLeft: 'auto' }}>
          {editing ? (
            <Space>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                Save
              </Button>
              <Button icon={<CloseOutlined />} onClick={() => {
                setSummary(initialSummary);
                setEditing(false);
              }}>
                Cancel
              </Button>
            </Space>
          ) : (
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const trigger = (
    <Tooltip title="Edit Backend Summary">
      <Button
        shape="circle"
        icon={<FileTextOutlined />}
        type="dashed"
        onClick={() => setOpen(true)}
      />
    </Tooltip>
  );

  return isMobile ? (
    <>
      {trigger}
      <Drawer
        title="Edit Backend Summary"
        placement="bottom"
        onClose={() => setOpen(false)}
        open={open}
        height="50%"
        bodyStyle={{ padding: 16 }}
      >
        {renderContent()}
      </Drawer>
    </>
  ) : (
    <Popover
      content={renderContent()}
      title="Edit Backend Summary"
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      getPopupContainer={triggerNode => triggerNode.parentElement!}
    >
      {trigger}
    </Popover>
  );
};
