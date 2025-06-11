// frontend/src/components/AttributeEditorModal.tsx

import { useState, useEffect } from 'react';
import type { Entity, Attribute } from '../types';

// Import Ant Design components
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Row,
  Col,
  Space,
  Tooltip
} from 'antd';
import { KeyOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const { Option } = Select;

// Define the props interface for the component
interface AttributeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (attributeData: Attribute) => void;
  attributeToEdit: Attribute | null; // Null when adding a new attribute
  entityAttributes: Attribute[]; // For validating duplicate names
  allEntities: Entity[]; // For populating FK dropdown
  currentEntityName: string; // To prevent self-referencing FKs
}

// Define the initial state for a new attribute form
const defaultAttributeState: Omit<Attribute, 'id'> = {
  name: '',
  type: 'String',
  isPrimaryKey: false,
  isNotNull: false,
  isUnique: false,
  isForeignKey: false,
  foreignKeyRelation: undefined,
};

export function AttributeEditorModal({
  isOpen,
  onClose,
  onSave,
  attributeToEdit,
  entityAttributes,
  allEntities,
  currentEntityName,
}: AttributeEditorModalProps) {
  // Ant Design's Form hook provides powerful state management and validation
  const [form] = Form.useForm();
  
  // State to track if the FK checkbox is checked, to show/hide conditional fields
  const [isFk, setIsFk] = useState(false);

  // useEffect to reset and populate the form when the modal opens or attribute changes
  useEffect(() => {
    if (isOpen) {
      if (attributeToEdit) {
        // If editing, set form fields with existing attribute data
        form.setFieldsValue({
            ...attributeToEdit,
            referencesEntity: attributeToEdit.foreignKeyRelation?.referencesEntity,
            referencesField: attributeToEdit.foreignKeyRelation?.referencesField
        });
        setIsFk(attributeToEdit.isForeignKey);
      } else {
        // If adding, reset to defaults and generate a new client-side ID
        form.setFieldsValue({
            ...defaultAttributeState,
            id: `attr-${Date.now()}`
        });
        setIsFk(false);
      }
    }
  }, [attributeToEdit, isOpen, form]);

  const handleSave = () => {
    form
      .validateFields()
      .then(values => {
        // The `values` object from the form contains all the field data
        const attributeData: Attribute = {
          id: attributeToEdit?.id || `attr-${Date.now()}`, // Use existing ID or create new
          name: values.name,
          type: values.type,
          isPrimaryKey: values.isPrimaryKey || false,
          isNotNull: values.isNotNull || false,
          isUnique: values.isUnique || false,
          isForeignKey: values.isForeignKey || false,
          foreignKeyRelation: values.isForeignKey
            ? {
                referencesEntity: values.referencesEntity,
                referencesField: values.referencesField,
              }
            : undefined,
        };
        onSave(attributeData);
        onClose(); // Close modal on successful save
      })
      .catch(info => {
        console.log('Validate Failed:', info);
      });
  };

  const getReferencedEntityFields = () => {
    const selectedReferencedEntity = form.getFieldValue('referencesEntity');
    if (!selectedReferencedEntity) return [];
    const refEntity = allEntities.find(e => e.name === selectedReferencedEntity);
    // Suggest referencing the primary key by default
    return refEntity ? refEntity.attributes.filter(attr => attr.isPrimaryKey) : [];
  };

  // When the "Primary Key" checkbox is changed
  const onPkChange = (e: { target: { checked: boolean; }; }) => {
    if (e.target.checked) {
      // PKs must be not null
      form.setFieldsValue({ isNotNull: true });
    }
  };
  
  return (
    <Modal
      title={attributeToEdit ? "Edit Attribute" : "Add New Attribute"}
      open={isOpen}
      onOk={handleSave}
      onCancel={onClose}
      okText="Save"
      width={600}
      destroyOnClose // Reset form state when modal is closed
    >
      <Form
        form={form}
        layout="vertical"
        name="attribute_editor"
        initialValues={defaultAttributeState}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Attribute Name"
              rules={[
                { required: true, message: 'Please input the attribute name!' },
                // Custom validator to check for duplicate names
                () => ({
                  validator(_, value) {
                    const isDuplicate = entityAttributes.some(attr => 
                      attr.name.toLowerCase() === value?.toLowerCase() &&
                      attr.id !== (attributeToEdit?.id || '')
                    );
                    if (!value || !isDuplicate) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('This attribute name already exists in the entity.'));
                  },
                }),
              ]}
            >
              <Input placeholder="e.g., user_id, first_name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="type"
              label="Data Type"
              rules={[{ required: true, message: 'Please select a data type!' }]}
            >
              <Select>
                <Option value="String">String</Option>
                <Option value="Text">Text (Large String)</Option>
                <Option value="Integer">Integer</Option>
                <Option value="Long">Long</Option>
                <Option value="Double">Double</Option>
                <Option value="Decimal">Decimal</Option>
                <Option value="Boolean">Boolean</Option>
                <Option value="Date">Date</Option>
                <Option value="Timestamp">Timestamp</Option>
                <Option value="UUID">UUID</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
            <Space size="large">
                <Form.Item name="isPrimaryKey" valuePropName="checked" noStyle>
                    <Checkbox onChange={onPkChange}>Primary Key (PK)</Checkbox>
                </Form.Item>
                <Form.Item name="isNotNull" valuePropName="checked" noStyle>
                    <Checkbox disabled={form.getFieldValue('isPrimaryKey')}>Not Null (NN)</Checkbox>
                </Form.Item>
                <Form.Item name="isUnique" valuePropName="checked" noStyle>
                    <Checkbox>Unique (UN)</Checkbox>
                </Form.Item>
                <Form.Item name="isForeignKey" valuePropName="checked" noStyle>
                    <Checkbox onChange={(e) => setIsFk(e.target.checked)}>Foreign Key (FK)</Checkbox>
                </Form.Item>
            </Space>
        </Form.Item>
        
        {isFk && (
          <div className="fk-details-section">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="referencesEntity"
                  label="References Entity"
                  rules={[{ required: true, message: 'Please select the entity to reference!' }]}
                >
                  <Select placeholder="Select an entity" onChange={() => form.setFieldsValue({ referencesField: undefined })}>
                    {allEntities
                      .filter(e => e.name !== currentEntityName) // Prevent self-reference
                      .map(e => (
                        <Option key={e.id} value={e.name}>{e.name}</Option>
                      ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) => prevValues.referencesEntity !== currentValues.referencesEntity}
                >
                  {() => (
                    <Form.Item
                      name="referencesField"
                      label={
                        <span>
                            References Field &nbsp;
                            <Tooltip title="Foreign keys typically reference the Primary Key of another table.">
                                <QuestionCircleOutlined />
                            </Tooltip>
                        </span>
                      }
                      rules={[{ required: true, message: 'Please select the field to reference!' }]}
                    >
                      <Select placeholder="Select a field" disabled={!form.getFieldValue('referencesEntity')}>
                        {getReferencedEntityFields().map(attr => (
                          <Option key={attr.id} value={attr.name}>
                            {attr.name} <KeyOutlined style={{ marginLeft: '4px', color: '#faad14' }}/>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )}
                </Form.Item>
              </Col>
            </Row>
          </div>
        )}
      </Form>
    </Modal>
  );
}
