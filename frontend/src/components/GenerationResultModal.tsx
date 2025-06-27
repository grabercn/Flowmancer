import React, { useState, useEffect } from 'react';
import { Modal, Button, Typography, Space } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

const glowingBackgroundStyle: React.CSSProperties = {
  position: 'relative',
  borderRadius: 12,
  padding: 24,
  background: 'linear-gradient(270deg, #6e8efb, #a777e3, #6ee2f9, #a777e3)',
  backgroundSize: '800% 800%',
  animation: 'glowGradient 15s ease infinite',
  boxShadow: '0 0 20px rgba(110, 142, 251, 0.6)',
};

const innerContentStyle: React.CSSProperties = {
  position: 'relative',
  borderRadius: 10,
  backgroundColor: '#fff',
  padding: 20,
  boxShadow: '0 0 30px rgba(0,0,0,0.05)',
  zIndex: 1,
  maxWidth: 480,
  margin: '0 auto',
  overflow: 'hidden',
  transition: 'transform 0.3s ease, opacity 0.3s ease',
  transformOrigin: 'top center',
};

interface GenerationResultModalProps {
  open: boolean;
  onClose: () => void;
  resultDownloadUrl: string;
  parsedSummary: string;
  onSaveFlowmancer: (projectName: string | undefined, summary: string | undefined) => void;
  disabled?: boolean;
}

export function GenerationResultModal({
  open,
  onClose,
  resultDownloadUrl,
  parsedSummary,
  onSaveFlowmancer,
  disabled = false,
}: GenerationResultModalProps) {
  const projectName = resultDownloadUrl.split('/').pop()?.split('.')[0] || 'project';
  const [expanded, setExpanded] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [buttonClicked, setButtonClicked] = useState<string | null>(null);

  // Animate modal entrance (fade + scale)
  useEffect(() => {
    if (open) {
      // small delay to trigger animation
      setTimeout(() => setAnimateIn(true), 10);
    } else {
      setAnimateIn(false);
      setExpanded(false); // reset expanded on close if you want
    }
  }, [open]);

  // Animate button click effect
  function handleButtonClick(type: string, action: () => void) {
    if (disabled) return;
    setButtonClicked(type);
    setTimeout(() => setButtonClicked(null), 150);
    action();
  }

  return (
    <>
      <style>
        {`
          @keyframes glowGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .ant-modal-header,
          .ant-modal-footer {
            display: none !important;
          }
          .custom-modal-content {
            pointer-events: auto;
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
            transition: opacity 300ms ease, transform 300ms ease;
          }
          .custom-modal-content.animate-in {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          .summary-paragraph {
            transition: max-height 350ms ease, overflow 350ms ease;
          }
          .summary-paragraph.collapsed {
            max-height: 120px;
            overflow-y: auto;
          }
          .summary-paragraph.expanded {
            max-height: 1000px; /* large enough */
            overflow-y: visible;
          }
          .expand-button {
            cursor: pointer;
            transition: color 200ms ease;
          }
          .expand-button:hover {
            color: #6e8efb;
          }
          .animated-button {
            transition: transform 150ms ease, box-shadow 150ms ease;
          }
          .animated-button:active {
            transform: scale(0.95);
            box-shadow: 0 0 8px #6e8efb;
          }
          /* extra pulse on download button click */
          .animated-button.pulse {
            animation: pulseScale 300ms ease forwards;
          }
          @keyframes pulseScale {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        `}
      </style>

      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        destroyOnClose={false}
        closeIcon={<CloseOutlined />}
        maskClosable={false}
        keyboard={!disabled}
        transitionName=""
        maskTransitionName=""
        modalRender={() => (
          <div
            className={`custom-modal-content ${animateIn ? 'animate-in' : ''}`}
            style={glowingBackgroundStyle}
            onClick={e => e.stopPropagation()}
          >
            <div style={innerContentStyle}>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => handleButtonClick('close', onClose)}
                style={{ position: 'absolute', top: 12, right: 12, padding: 0, fontSize: 18 }}
                aria-label="Close"
                disabled={disabled}
                className="animated-button"
              />

              <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 20 }}>
                Backend Generated!
              </Text>

              <Text strong>Your backend code has been successfully generated.</Text>
              
              <Paragraph style={{ marginTop: 12, fontSize: 14 }}>
                You can now download the generated backend code. Additionally, you can switch to "Frontend Mode" in the toolbar to start designing your frontend based on this backend!
              </Paragraph>


              <Paragraph
                className={`summary-paragraph ${expanded ? 'expanded' : 'collapsed'}`}
                style={{
                  marginTop: 12,
                  marginBottom: 8,
                  whiteSpace: 'pre-wrap',
                  fontSize: 14,
                  lineHeight: 1.5,
                  border: '1px solid #f0f0f0',
                  padding: 12,
                  borderRadius: 4,
                  backgroundColor: '#fafafa',
                }}
              >
                {parsedSummary}
              </Paragraph>

              <Button
                type="link"
                onClick={() => setExpanded(!expanded)}
                style={{ paddingLeft: 0, marginBottom: 16 }}
                disabled={disabled}
                className="expand-button"
              >
                {expanded ? 'Show Less ▲' : 'Show More ▼'}
              </Button>

              <Space
                size="middle"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  href={resultDownloadUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  disabled={disabled}
                  style={{ minWidth: 180, flex: '1 1 200px' }}
                  onClick={(e) => {
                    e.preventDefault(); // prevent default immediately
                    handleButtonClick('download', () => {
                      // create temporary <a> to trigger download programmatically
                      const a = document.createElement('a');
                      a.href = resultDownloadUrl;
                      a.download = projectName + '.zip';
                      a.target = '_blank';
                      a.rel = 'noopener noreferrer';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    });
                  }}
                  className={`animated-button ${buttonClicked === 'download' ? 'pulse' : ''}`}
                >
                  Download Generated Project Zip
                </Button>

                <Button
                  type="default"
                  onClick={() => handleButtonClick('save', () => {
                    onSaveFlowmancer(projectName, parsedSummary);
                    onClose();
                  })}
                  disabled={disabled}
                  style={{ minWidth: 180, flex: '1 1 200px' }}
                  className={`animated-button ${buttonClicked === 'save' ? 'pulse' : ''}`}
                >
                  (Recommended) Save Project File
                </Button>
              </Space>
            </div>
          </div>
        )}
      />
    </>
  );
}
