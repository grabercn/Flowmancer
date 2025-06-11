// frontend/src/App.tsx

import React, { useState, useRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';

// Ant Design Components and Global Message API
import { message, App as AntApp } from 'antd';

// Custom Components
import { Toolbar } from './components/Toolbar';
import { EntityCard } from './components/EntityCard';
import { PropertiesPanel } from './components/PropertiesPanel';
import { AttributeEditorModal } from './components/AttributeEditorModal';

// Custom Hook
import { useEntityDrag } from './hooks/useEntityDrag';

// API Service and Types
import { generateBackendCode } from './services/apiService';
import type { Entity, Attribute, DesignData } from './types';

function SchemaDesigner() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [entityCounter, setEntityCounter] = useState<number>(0);

  // State for the Attribute Editor Modal
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);

  // State for API and UI status
  const [targetStack, setTargetStack] = useState<string>('fastapi');
  const [, setIsLoading] = useState<boolean>(false);
  
  // Custom hook for managing drag-and-drop state and logic
  const { handleDragStart, handleDragMove, handleDragEnd, isDragging } = useEntityDrag(setEntities);
  
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // --- Derived State ---
  // Memoize selectedEntity for performance if needed, but this is fine for now
  const selectedEntity = entities.find(e => e.id === selectedEntityId) || null;

  // --- Entity Handlers ---
  const handleAddEntity = () => {
    const nextCounter = entityCounter + 1;
    const newEntity: Entity = {
      id: `entity-${Date.now()}`,
      name: `NewEntity${nextCounter}`,
      attributes: [],
      ui: {
        x: 50 + ((entities.length % 8) * 60),
        y: 50 + (Math.floor(entities.length / 8) * 60),
      },
    };
    setEntities(prev => [...prev, newEntity]);
    setSelectedEntityId(newEntity.id);
    setEntityCounter(nextCounter);
  };

  const handleSelectEntity = (entityId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Important to prevent canvas deselect
    setSelectedEntityId(entityId);
  };

  const handleUpdateEntityName = useCallback((entityId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      message.error("Entity name cannot be empty.");
      return;
    }
    const oldName = entities.find(e => e.id === entityId)?.name;
    if (entities.some(e => e.name.toLowerCase() === trimmedName.toLowerCase() && e.id !== entityId)) {
      message.error(`Entity name "${trimmedName}" already exists.`);
      return;
    }

    setEntities(prev => prev.map(e => 
      e.id === entityId ? { ...e, name: trimmedName } : e
    ));

    if (oldName) {
      setEntities(prev => prev.map(e => ({
        ...e,
        attributes: e.attributes.map(attr => 
          attr.isForeignKey && attr.foreignKeyRelation?.referencesEntity === oldName 
          ? { ...attr, foreignKeyRelation: { ...attr.foreignKeyRelation, referencesEntity: trimmedName } } 
          : attr
        )
      })));
    }
  }, [entities]);

  const handleDeleteEntity = useCallback((entityId: string) => {
    const entityToDelete = entities.find(e => e.id === entityId);
    if (!entityToDelete) return;

    const remainingEntities = entities.filter(e => e.id !== entityId);
    const updatedEntities = remainingEntities.map(entity => ({
      ...entity,
      attributes: entity.attributes.filter(attr => !(attr.isForeignKey && attr.foreignKeyRelation?.referencesEntity === entityToDelete.name))
    }));

    setEntities(updatedEntities);
    if (selectedEntityId === entityId) {
      setSelectedEntityId(null);
    }
    message.success(`Entity "${entityToDelete.name}" deleted.`);
  }, [entities, selectedEntityId]);

  // --- Attribute Handlers ---
  const handleOpenAttributeModal = (entityId: string, attributeId?: string) => {
    setSelectedEntityId(entityId);
    const entity = entities.find(e => e.id === entityId);
    if (!entity) return;
    const attribute = attributeId ? entity.attributes.find(a => a.id === attributeId) : null;
    setEditingAttribute(attribute || null);
    setIsAttributeModalOpen(true);
  };

  const handleCloseAttributeModal = () => {
    setIsAttributeModalOpen(false);
    setEditingAttribute(null);
  };

  const handleSaveAttribute = (attributeData: Attribute) => {
    if (!selectedEntityId) return;

    setEntities(prev => prev.map(entity => {
      if (entity.id === selectedEntityId) {
        const existingAttrIndex = entity.attributes.findIndex(a => a.id === attributeData.id);
        const newAttributes = [...entity.attributes];
        if (existingAttrIndex > -1) {
          newAttributes[existingAttrIndex] = attributeData; // Update
        } else {
          newAttributes.push(attributeData); // Add new
        }
        return { ...entity, attributes: newAttributes };
      }
      return entity;
    }));
    message.success(`Attribute "${attributeData.name}" saved.`);
    handleCloseAttributeModal();
  };

  const handleDeleteAttribute = useCallback((entityId: string, attributeId: string) => {
     setEntities(prev => prev.map(entity => {
        if (entity.id === entityId) {
            return { ...entity, attributes: entity.attributes.filter(attr => attr.id !== attributeId) };
        }
        return entity;
    }));
  }, []);

  // --- Toolbar Action Handlers ---
  const handleGenerateCode = async () => {
    if (entities.length === 0) {
      message.warning('Cannot generate code. Please add at least one entity.');
      return;
    }
    setIsLoading(true);
    const key = 'generate';
    message.loading({ content: 'Generating backend code...', key });
    try {
      const result = await generateBackendCode(entities, targetStack);
      message.success({ content: 'Code generated successfully! Starting download...', key, duration: 2 });
      window.location.href = result.download_url; // Trigger download
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        message.error({ content: `Generation failed: ${errorMessage}`, key, duration: 5 });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveDesign = () => {
    if (entities.length === 0) {
      message.info('Nothing to save.');
      return;
    }
    const designData: DesignData = { entities, entityCounter };
    const dataStr = JSON.stringify(designData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'db_schema_design.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('Design saved!');
  };

  const handleLoadDesign = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') throw new Error("File could not be read.");
        const designData: DesignData = JSON.parse(result);
        if (designData && Array.isArray(designData.entities)) {
          setEntities(designData.entities);
          setEntityCounter(designData.entityCounter || designData.entities.length);
          setSelectedEntityId(null);
          message.success('Design loaded successfully!');
        } else {
          throw new Error("Invalid schema file format.");
        }
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Failed to parse file.");
      } finally {
        // Reset file input to allow loading the same file again
        if(event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  };


  return (
    <div className="app-container">
      <Toolbar
        targetStack={targetStack}
        onTargetStackChange={setTargetStack}
        onAddEntity={handleAddEntity}
        onSaveDesign={handleSaveDesign}
        onLoadDesign={handleLoadDesign}
        onGenerate={handleGenerateCode}
      />

      <main 
        className="main-content"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd} // Also stop dragging if mouse leaves the main area
      >
        <div ref={canvasWrapperRef} className="canvas-area">
          <div className="canvas-area-inner" style={{ cursor: isDragging ? 'grabbing' : 'default' }}>
            {/* Render Entities */}
            {entities.map(entity => (
              <EntityCard 
                key={entity.id}
                entity={entity}
                isSelected={entity.id === selectedEntityId}
                onSelect={handleSelectEntity}
                onDragStart={handleDragStart}
              />
            ))}
            {entities.length === 0 && (
               <div className="canvas-placeholder-container">
                  <p className="canvas-placeholder">Click "Add Entity" to begin</p>
               </div>
            )}
          </div>
        </div>

        <PropertiesPanel 
            selectedEntity={selectedEntity}
            onUpdateEntityName={handleUpdateEntityName}
            onDeleteEntity={handleDeleteEntity}
            onAddAttribute={handleOpenAttributeModal}
            onEditAttribute={handleOpenAttributeModal}
            onDeleteAttribute={handleDeleteAttribute}
        />
      </main>

      {isAttributeModalOpen && selectedEntity && (
          <AttributeEditorModal
            isOpen={isAttributeModalOpen}
            onClose={handleCloseAttributeModal}
            onSave={handleSaveAttribute}
            attributeToEdit={editingAttribute}
            entityAttributes={selectedEntity.attributes}
            allEntities={entities}
            currentEntityName={selectedEntity.name}
          />
      )}
    </div>
  );
}

// Wrap the main export in AntApp to enable message/notification APIs
export default function AppWrapper() {
    return (
        <AntApp>
            <SchemaDesigner />
        </AntApp>
    )
}
