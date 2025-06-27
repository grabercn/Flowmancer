// frontend/src/App.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { App as AntApp, message } from 'antd';

// Custom Components
import { Toolbar } from './components/Toolbar';
import { EntityCard } from './components/EntityCard';
import { PropertiesPanel } from './components/PropertiesPanel';
import { AttributeEditorModal } from './components/AttributeEditorModal';
import { useUniversal } from './context/UniversalProvider';

// Custom Hook
import { useEntityDrag } from './hooks/useEntityDrag';

// API Service and Types
import { askGeminiForDesign, generateBackendCode } from './services/apiService';
import type { Entity, Attribute } from './types';
import { PlusCircleOutlined } from '@ant-design/icons';
import WelcomeScreen from './components/WelcomeScreen';
import confetti from 'canvas-confetti';
import { encryptApiKey } from './utils/cryptoUtils';
import { parseBackendSummary } from './utils/parseBackendSummary';
import { loadFlowmancerFile, saveFlowmancerFile } from './utils/handleFlowmancerFile';
import { GenerationResultModal } from './components/GenerationResultModal';
import { FrontendDesignerMain } from './components/frontend-designer/FrontEndDesignerMain';
import type { ComponentDefinition } from './components/frontend-designer/componentDefinitions';

function SchemaDesigner() {
  // --- STATE MANAGEMENT ---
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [entityCounter, setEntityCounter] = useState<number>(0);
  const [backendSummary, setBackendSummary] = useState('');
  const [generateResult, setGenerateResult] = useState<any>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);

  // New state for frontend components (reusing the Entity type for simplicity)
  const [uiComponents, setUiComponents] = useState<Entity[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [componentCounter, setComponentCounter] = useState<number>(0);
  const frontendDrag = useEntityDrag(setUiComponents);


  const [targetStack, setTargetStack] = useState<string>('fastapi');
  const UniversalProvider = useUniversal();

  const { message: messageApi } = AntApp.useApp();

  const { handleDragStart, handleDragMove, handleDragEnd, isDragging, handleTouchEnd, handleTouchMove, handleTouchStart } = useEntityDrag(setEntities);

  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // --- DERIVED STATE ---
  const selectedEntity = entities.find(e => e.id === selectedEntityId) || null;

  // --- HANDLER FUNCTIONS ---

  // --- COMPONENT HANDLERS (FRONTEND) ---
  const handleAddComponent = useCallback((definition: ComponentDefinition) => {
    const nextCounter = componentCounter + 1;
    const newComponent: Entity = {
        id: `component-${Date.now()}`,
        name: `${definition.label}${nextCounter}`,
        attributes: [],
        componentType: definition.key,
        props: { ...definition.defaultProps },
        ui: {
            x: 100 + ((uiComponents.length % 5) * 70),
            y: 100 + (Math.floor(uiComponents.length / 5) * 70),
        },
    };
    setUiComponents(prev => [...prev, newComponent]);
    setSelectedComponentId(newComponent.id);
    setComponentCounter(nextCounter);
    messageApi.success(`Added ${definition.label} component`);
  }, [componentCounter, uiComponents.length, messageApi]);

  const handleSelectComponent = useCallback((componentId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedComponentId(componentId);
  }, []);

  const handleUpdateComponentProps = useCallback((componentId: string, newProps: any) => {
      setUiComponents(prev => prev.map(c =>
        c.id === componentId ? { ...c, props: newProps } : c
      ));
  }, []);

  const handleUpdateComponentName = useCallback((componentId: string, newName: string) => {
    setUiComponents(prev => prev.map(c =>
      c.id === componentId ? { ...c, name: newName } : c
    ));
  }, []);

  const handleDeleteComponent = useCallback((componentId: string) => {
      const componentName = uiComponents.find(c => c.id === componentId)?.name;
      setUiComponents(prev => prev.filter(c => c.id !== componentId));
      if (selectedComponentId === componentId) {
          setSelectedComponentId(null);
      }
      messageApi.success(`Component "${componentName}" deleted.`);
  }, [uiComponents, selectedComponentId, messageApi]);

  // --- ENTITY HANDLERS (BACKEND) ---
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
    e.stopPropagation();
    setSelectedEntityId(entityId);
  };

  const handleUpdateEntityName = useCallback((entityId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName.length > 50) {
      messageApi.error("Entity name cannot exceed 50 characters.");
      return;
    }
    if (!trimmedName && trimmedName.length === -1) {
      messageApi.error("Entity name cannot be empty.");
      return;
    }
    const oldName = entities.find(e => e.id === entityId)?.name;
    if (entities.some(e => e.name.toLowerCase() === trimmedName.toLowerCase() && e.id !== entityId)) {
      messageApi.error(`Entity name "${trimmedName}" already exists.`);
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
  }, [entities, messageApi]);

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
    messageApi.success(`Entity "${entityToDelete.name}" deleted.`);
  }, [entities, selectedEntityId, messageApi]);

  // Attribute Modal and CRUD Handlers
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
    messageApi.success(`Attribute "${attributeData.name}" saved.`);
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
      messageApi.warning('Cannot generate code. Please add at least one entity.');
      return;
    }

    const geminiApiKey = encryptApiKey(UniversalProvider.settings.apiKey);
    const geminiModel = UniversalProvider.settings.geminiModel;

    UniversalProvider.state.setIsLoading(true);

    const loadingKey = 'generate';
    messageApi.loading({ content: 'Generating code... This may take several minutes!', key: loadingKey, duration: 0 });

    try {
      const result = await generateBackendCode(entities, targetStack, geminiApiKey, geminiModel);
      fireConfetti();

      // Parse and store the backend summary
      const parsedSummary = parseBackendSummary(result.download_url, result.summary);
      UniversalProvider.data.setBackendSummary(parsedSummary);
      setBackendSummary(parsedSummary); // local state for saving helper

      // Store generation result & open the popover for download/save
      setGenerateResult(result);
      setPopoverOpen(true);

      messageApi.success({ content: 'Code generated successfully! Use the buttons to download or save.', key: loadingKey, duration: 3 });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      messageApi.error({ content: `Generation failed: ${errorMessage}`, key: loadingKey, duration: 5 });
    } finally {
      UniversalProvider.state.setIsLoading(false);
    }
  };

  const handleSaveDesign = (fileName: string = 'project', currentBackendSummary?: string) => {
    // This payload now correctly matches the structure expected by the saveFlowmancerFile utility
    const dataToSave = {
        entities: entities,
        entityCounter: entityCounter,
        backendSummary: currentBackendSummary || backendSummary,
        frontendSchema: {
            components: uiComponents,
            componentCounter: componentCounter,
        },
    };
    if (dataToSave.entities.length === 0 && dataToSave.frontendSchema.components.length === 0) {
      messageApi.warning("No changes to save. Add entities or components to continue.")
      return;
    }
    saveFlowmancerFile(fileName, dataToSave);
  };

  const handleLoadDesign = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const parsed = await loadFlowmancerFile(file);

        // Load Backend Data
        setEntities(parsed.designData.entities || []);
        setEntityCounter(parsed.designData.entityCounter || 0);
        setBackendSummary(parsed.backendSummary || '');
        UniversalProvider.data.setBackendSummary(parsed.backendSummary || '');
        
        // Load Frontend Data if it exists
        if (parsed.frontendSchema) {
            setUiComponents(parsed.frontendSchema.components || []);
            setComponentCounter(parsed.frontendSchema.componentCounter || 0);
        } else {
            // Reset frontend state if loading an older file without it
            setUiComponents([]);
            setComponentCounter(0);
        }

        setSelectedEntityId(null);
        setSelectedComponentId(null);

        messageApi.success('Flowmancer project loaded!');
    } catch (err) {
        messageApi.error(err instanceof Error ? err.message : 'Failed to load file.');
    } finally {
        event.target.value = '';
    }
  };


  const handleSendDesignPrompt = async (designPrompt: string) => {
    // Call the AI design generation function
    // Assuming askGeminiForDesign returns a promise that resolves to the JSON object
    messageApi.loading({ content: 'Generating design with AI...', key: 'ai-design', duration: 0 });
    if (!designPrompt || designPrompt.trim() === '') {
      messageApi.error({ content: "Design prompt cannot be empty.", key: 'ai-design' });
      return;
    }

    UniversalProvider.state.setIsLoading(true);

    const geminiApiKey = encryptApiKey(UniversalProvider.settings.apiKey);
    const geminiModel = UniversalProvider.settings.geminiModel;

    // Call the AI service to generate the design
    askGeminiForDesign(designPrompt, encryptApiKey(geminiApiKey), geminiModel)
      .then(response => {
        const incomingEntities = response.entities;

        if (!incomingEntities || !Array.isArray(incomingEntities)) {
          messageApi.error({ content: "Invalid AI response format.", key: 'ai-design' });
          throw new Error("Invalid or missing 'entities' array in AI response.");
        }

        // Hydrate entities with default UI positions
        const hydratedEntities = incomingEntities.map((entity, index) => {
          return {
            ...entity,
            id: entity.id || `entity-${Date.now()}-${index}`, // Ensure unique ID
            ui: {
              x: entity.ui?.x || 50 + ((index % 8) * 60),
              y: entity.ui?.y || 50 + (Math.floor(index / 8) * 60),
            },
          };
        });

        // Clear existing entities and set the new, hydrated design
        setEntities(hydratedEntities);
        setEntityCounter(hydratedEntities.length);
        setSelectedEntityId(null); // Deselect any currently selected entity

        fireConfetti();
        messageApi.success({ content: "AI design generated successfully!", key: 'ai-design' });
      })
      .catch(error => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        messageApi.error({ content: `AI design generation failed: ${errorMessage}`, key: 'ai-design' });
      })
      .finally(() => {
        UniversalProvider.state.setIsLoading(false);
      });
  }

  // Set target stack (and other default settings in the future) when switching modes
  useEffect(() => {
    if (UniversalProvider.state.isFrontEndMode) {
      setTargetStack('react'); // default frontend stack
      messageApi.warning("Frontend mode is in beta. Expect bugs and missing features!");      
    } else {
      setTargetStack('fastapi'); // default backend stack
    }
  }, [UniversalProvider.state.isFrontEndMode]);


  // --- EFFECTS ---

  // misc Confetti handler to fire confetti
  const fireConfetti = (particleCount?: number, spread?: number, origin?: any) => {
    const confettiInstance = confetti({
      particleCount: particleCount || 100,
      spread: spread || 70,
      origin: origin || { y: 0.6 },
    })
    // bump z Index
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.zIndex = '9999';
      canvas.style.position = 'fixed'; // Ensure it sits on top
      canvas.style.pointerEvents = 'none'; // Prevent mouse issues
    }
    return confettiInstance;
  };

  return (
    <div className="app-container">

      <WelcomeScreen />

      <Toolbar
        targetStack={targetStack}
        onTargetStackChange={setTargetStack}
        onAddEntity={handleAddEntity} // This is for backend entities
        onAddComponent={handleAddComponent}
        onSaveDesign={handleSaveDesign}
        onLoadDesign={handleLoadDesign}
        onGenerate={handleGenerateCode}
        onGenerateAIDesign={handleSendDesignPrompt}
      />
      {UniversalProvider.state.isFrontEndMode ? (
        <FrontendDesignerMain
          components={uiComponents}
          selectedComponentId={selectedComponentId}
          onSelectComponent={handleSelectComponent}
          onDragStart={frontendDrag.handleDragStart as any}
          onTouchStart={frontendDrag.handleTouchStart as any}
          onTouchMove={frontendDrag.handleTouchMove as any}
          onTouchEnd={frontendDrag.handleTouchEnd as any}
          onDragMove={frontendDrag.handleDragMove as any}
          onDragEnd={frontendDrag.handleDragEnd as any} 
          isDragging={frontendDrag.isDragging}
          selectedComponent={uiComponents.find(c => c.id === selectedComponentId) || null}
          onUpdateComponentName={handleUpdateComponentName}
          onUpdateComponentProps={handleUpdateComponentProps}
          onDeleteComponent={handleDeleteComponent}
          canvasWrapperRef={canvasWrapperRef as React.RefObject<HTMLDivElement>}
        />
      ) : (
        <main
          className="main-content"
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div ref={canvasWrapperRef} className="canvas-area">
            <div className="canvas-area-inner" style={{ cursor: isDragging ? 'grabbing' : 'default' }}>
              {entities.map(entity => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  isSelected={entity.id === selectedEntityId}
                  onSelect={handleSelectEntity}
                  onDragStart={handleDragStart}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
              ))}
              {entities.length === 0 && (
                <div className="canvas-placeholder-container">
                  <PlusCircleOutlined className="canvas-placeholder" />
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
      )}

      <GenerationResultModal
        open={popoverOpen}
        onClose={() => {
          setGenerateResult(null);
          setPopoverOpen(false);
        }}
        resultDownloadUrl={generateResult?.download_url || ''}
        parsedSummary={backendSummary}
        onSaveFlowmancer={(projectName: string | undefined, summary: string | undefined) => {
          handleSaveDesign(projectName, summary);
          messageApi.success('.flowmancer file saved!');
        }}
        disabled={
          !UniversalProvider.settings.apiKey.trim() ||
          !UniversalProvider.settings.geminiModel.trim() ||
          UniversalProvider.state.isLoading
        }
      />

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

// Wrap the main export in AntApp to enable the message API
export default function AppWrapper() {
  return (
    <AntApp>
      <SchemaDesigner />
    </AntApp>
  )
}
