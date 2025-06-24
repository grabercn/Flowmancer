document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('canvas');
    const propertiesPanel = document.getElementById('propertiesPanel');
    const selectedElementProps = document.getElementById('selectedElementProps');
    const editEntityForm = document.getElementById('editEntityForm');
    const entityNameInput = document.getElementById('entityNameInput');
    const attributesListDiv = document.getElementById('attributesList'); // Renamed from attributesList to avoid conflict
    const statusDiv = document.getElementById('status');
    const relationshipSvgLayer = document.getElementById('relationshipSvgLayer');

    // Toolbar Buttons
    const addEntityBtn = document.getElementById('addEntityBtn');
    const generateBtn = document.getElementById('generateBtn');
    const saveSchemaBtn = document.getElementById('saveSchemaBtn');
    const loadSchemaInput = document.getElementById('loadSchemaInput');

    // Attribute Modal Elements
    const attributeModal = document.getElementById('attributeModal');
    const attributeModalTitle = document.getElementById('attributeModalTitle');
    const closeAttributeModalBtn = document.getElementById('closeAttributeModalBtn');
    const editingAttributeIndexInput = document.getElementById('editingAttributeIndex'); // Renamed
    const attrNameInput = document.getElementById('attrName');
    const attrTypeSelect = document.getElementById('attrType');
    const attrIsPkCheckbox = document.getElementById('attrIsPk');
    const attrIsNnCheckbox = document.getElementById('attrIsNn');
    const attrIsUnCheckbox = document.getElementById('attrIsUn');
    const attrIsFkCheckbox = document.getElementById('attrIsFk');
    const fkDetailsDiv = document.getElementById('fkDetails');
    const attrFkRefTableSelect = document.getElementById('attrFkRefTable');
    const attrFkRefFieldSelect = document.getElementById('attrFkRefField'); // Changed to select
    const saveAttributeBtn = document.getElementById('saveAttributeBtn');

    // Properties Panel Buttons
    const addAttributeBtn = document.getElementById('addAttributeBtn');
    const deleteEntityBtn = document.getElementById('deleteEntityBtn');

    // Application State
    let entities = []; // Array to store entity objects { id, name, attributes, x, y, el }
    let selectedEntity = null; // The currently selected entity object
    let entityCounter = 0; // For generating unique entity names/IDs
    let isDragging = false;
    let dragOffsetX, dragOffsetY;
    let draggedElement = null; // The entity element being dragged

    const SVG_NS = "http://www.w3.org/2000/svg";

    // --- Initialization ---
    function init() {
        addEventListeners();
        renderPropertiesPanel(null); // Initial state of properties panel
        updateCanvasSize(); // Ensure SVG layer matches canvas scroll size initially
        window.addEventListener('resize', updateCanvasSize); // Adjust on window resize
        canvas.addEventListener('scroll', updateAllRelationshipLines); // Redraw lines on scroll
    }

    function addEventListeners() {
        addEntityBtn.addEventListener('click', handleAddEntity);
        generateBtn.addEventListener('click', generateSchemaAndSubmit);
        saveSchemaBtn.addEventListener('click', saveSchemaToFile);
        loadSchemaInput.addEventListener('change', loadSchemaFromFile);

        addAttributeBtn.addEventListener('click', () => openAttributeModal(null));
        saveAttributeBtn.addEventListener('click', handleSaveAttribute);
        closeAttributeModalBtn.addEventListener('click', closeAttributeModal);
        entityNameInput.addEventListener('change', handleUpdateSelectedEntityName);
        deleteEntityBtn.addEventListener('click', handleDeleteSelectedEntity);

        attrIsFkCheckbox.addEventListener('change', toggleFkDetails);
        attrFkRefTableSelect.addEventListener('change', populateFkRefFieldSelect);


        canvas.addEventListener('click', (e) => {
            // If click is on canvas itself (not an entity), deselect
            if (e.target === canvas || e.target === relationshipSvgLayer) {
                deselectAllEntities();
            }
        });
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    }

    // --- Entity Management ---
    function handleAddEntity() {
        entityCounter++;
        const entityId = `entity-${Date.now()}-${entityCounter}`;
        const initialX = 50 + (entities.length % 6) * 230 + canvas.scrollLeft; // Adjust for scroll
        const initialY = 50 + Math.floor(entities.length / 6) * 180 + canvas.scrollTop;

        const newEntity = {
            id: entityId,
            name: `Entity${entityCounter}`,
            attributes: [],
            x: initialX,
            y: initialY,
            el: null // DOM element will be created by renderEntityOnCanvas
        };
        entities.push(newEntity);
        renderEntityOnCanvas(newEntity);
        selectEntity(newEntity);
        updateCanvasSize(); // Check if canvas needs resizing due to new entity
    }

    function renderEntityOnCanvas(entity) {
        if (entity.el) { // If element exists, update it
            entity.el.style.left = entity.x + 'px';
            entity.el.style.top = entity.y + 'px';
            entity.el.querySelector('.entity-header').textContent = entity.name;
            const ul = entity.el.querySelector('.entity-attributes');
            ul.innerHTML = ''; // Clear existing attributes
            entity.attributes.forEach(attr => {
                const li = document.createElement('li');
                
                const nameTypeSpan = document.createElement('span');
                nameTypeSpan.className = 'attribute-name-type';
                nameTypeSpan.textContent = `${attr.name}: ${attr.type}`;
                li.appendChild(nameTypeSpan);

                const tagsSpan = document.createElement('span');
                tagsSpan.className = 'attribute-tags';
                if (attr.pk) tagsSpan.innerHTML += ' <span class="attribute-tag pk">PK</span>';
                if (attr.fk) tagsSpan.innerHTML += ` <span class="attribute-tag fk">FK</span>`;
                if (attr.nn) tagsSpan.innerHTML += ` <span class="attribute-tag nn">NN</span>`;
                if (attr.un) tagsSpan.innerHTML += ` <span class="attribute-tag un">UN</span>`;
                li.appendChild(tagsSpan);
                
                ul.appendChild(li);
            });
        } else { // Create new element
            const div = document.createElement('div');
            div.className = 'entity';
            div.id = entity.id;
            div.style.left = entity.x + 'px';
            div.style.top = entity.y + 'px';

            const header = document.createElement('div');
            header.className = 'entity-header';
            div.appendChild(header);

            const ul = document.createElement('ul');
            ul.className = 'entity-attributes';
            div.appendChild(ul);
            
            entity.el = div; // Store reference
            renderEntityOnCanvas(entity); // Call again to populate header and attributes

            div.addEventListener('mousedown', (e) => handleDragStart(e, entity));
            div.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent canvas click from deselecting
                selectEntity(entity);
            });
            canvas.appendChild(div);
        }
        updateAllRelationshipLines();
    }
    
    function selectEntity(entity) {
        if (selectedEntity && selectedEntity.el) {
            selectedEntity.el.classList.remove('selected');
        }
        selectedEntity = entity;
        if (selectedEntity && selectedEntity.el) {
            selectedEntity.el.classList.add('selected');
        }
        renderPropertiesPanel(entity);
    }

    function deselectAllEntities() {
        if (selectedEntity && selectedEntity.el) {
            selectedEntity.el.classList.remove('selected');
        }
        selectedEntity = null;
        renderPropertiesPanel(null);
    }

    function handleUpdateSelectedEntityName() {
        if (!selectedEntity) return;
        const oldName = selectedEntity.name;
        const newName = entityNameInput.value.trim();

        if (!newName) {
            alert("Entity name cannot be empty.");
            entityNameInput.value = oldName; // Revert
            return;
        }
        if (entities.some(e => e.name.toLowerCase() === newName.toLowerCase() && e.id !== selectedEntity.id)) {
            alert(`Entity name "${newName}" already exists or is a reserved keyword. Please choose a different name.`);
            entityNameInput.value = oldName; // Revert
            return;
        }

        selectedEntity.name = newName;
        renderEntityOnCanvas(selectedEntity); // Update visual on canvas

        // Update FK references if this entity's name changed
        entities.forEach(e => {
            let entityNeedsRerender = false;
            e.attributes.forEach(attr => {
                if (attr.fk && attr.references_entity === oldName) {
                    attr.references_entity = newName;
                    entityNeedsRerender = true;
                }
            });
            if (entityNeedsRerender) renderEntityOnCanvas(e);
        });
        
        // If the currently selected entity's FK dropdowns are open, repopulate them
        if (fkDetailsDiv.style.display === 'block') {
            populateFkRefTableSelect();
            // If the edited entity was selected in an FK dropdown, it might need updating
        }
        updateAllRelationshipLines();
    }

    function handleDeleteSelectedEntity() {
        if (!selectedEntity) return;
        if (!confirm(`Are you sure you want to delete entity "${selectedEntity.name}"? This will also remove attributes in other tables that reference it as a foreign key.`)) return;

        const deletedEntityName = selectedEntity.name;
        const deletedEntityId = selectedEntity.id;

        // Remove from entities array
        entities = entities.filter(e => e.id !== deletedEntityId);
        // Remove from canvas
        if (selectedEntity.el) {
            canvas.removeChild(selectedEntity.el);
        }
        
        // Remove FK attributes in other entities that reference the deleted entity
        entities.forEach(entity => {
            let attributesChanged = false;
            entity.attributes = entity.attributes.filter(attr => {
                if (attr.fk && attr.references_entity === deletedEntityName) {
                    attributesChanged = true;
                    return false; // Remove this attribute
                }
                return true;
            });
            if (attributesChanged) renderEntityOnCanvas(entity);
        });

        selectedEntity = null;
        renderPropertiesPanel(null);
        updateAllRelationshipLines();
        updateCanvasSize();
    }

    // --- Dragging Logic ---
    function handleDragStart(e, entity) {
        // Prevent dragging if interacting with internal elements of the entity (e.g., scrollbar)
        if (e.target !== entity.el && e.target !== entity.el.querySelector('.entity-header')) {
            return;
        }
        e.preventDefault(); // Prevent text selection during drag
        e.stopPropagation();

        selectEntity(entity); // Select entity on drag start
        draggedElement = entity.el;
        isDragging = true;
        // Calculate offset relative to the canvas, considering canvas scroll
        const canvasRect = canvas.getBoundingClientRect();
        dragOffsetX = e.clientX - canvasRect.left - entity.x + canvas.scrollLeft;
        dragOffsetY = e.clientY - canvasRect.top - entity.y + canvas.scrollTop;
        
        draggedElement.style.cursor = 'grabbing';
        draggedElement.style.zIndex = 20; // Bring to front while dragging
    }

    function handleDragMove(e) {
        if (!isDragging || !draggedElement || !selectedEntity) return;
        e.preventDefault();

        const canvasRect = canvas.getBoundingClientRect();
        // Calculate new position relative to canvas, accounting for scroll
        selectedEntity.x = e.clientX - canvasRect.left - dragOffsetX + canvas.scrollLeft;
        selectedEntity.y = e.clientY - canvasRect.top - dragOffsetY + canvas.scrollTop;

        // Keep within canvas bounds (optional, can be annoying)
        // selectedEntity.x = Math.max(0, Math.min(selectedEntity.x, canvas.scrollWidth - draggedElement.offsetWidth));
        // selectedEntity.y = Math.max(0, Math.min(selectedEntity.y, canvas.scrollHeight - draggedElement.offsetHeight));

        draggedElement.style.left = selectedEntity.x + 'px';
        draggedElement.style.top = selectedEntity.y + 'px';
        updateAllRelationshipLines();
    }

    function handleDragEnd() {
        if (!isDragging || !draggedElement) return;
        isDragging = false;
        draggedElement.style.cursor = 'grab';
        draggedElement.style.zIndex = 10; // Reset z-index
        draggedElement = null;
        updateCanvasSize(); // Check if canvas needs resizing due to entity move
    }

    // --- Properties Panel & Attribute Modal Logic ---
    function renderPropertiesPanel(entity) {
        if (entity) {
            selectedElementProps.style.display = 'none';
            editEntityForm.style.display = 'block';
            entityNameInput.value = entity.name;
            renderAttributesListForPanel(entity);
        } else {
            selectedElementProps.style.display = 'block';
            editEntityForm.style.display = 'none';
            attributesListDiv.innerHTML = ''; // Clear attributes list
        }
    }

    function renderAttributesListForPanel(entity) {
        attributesListDiv.innerHTML = ''; // Clear previous attributes
        if (!entity || !entity.attributes) return;

        entity.attributes.forEach((attr, index) => {
            const attrItemDiv = document.createElement('div');
            attrItemDiv.className = 'attribute-item-panel'; // For styling if needed

            const attrText = document.createElement('span');
            attrText.textContent = `${attr.name}: ${attr.type}`;
            attrItemDiv.appendChild(attrText);

            const tagsSpan = document.createElement('span');
            tagsSpan.className = 'attribute-tags';
            if (attr.pk) tagsSpan.innerHTML += ' <span class="attribute-tag pk">PK</span>';
            if (attr.fk) tagsSpan.innerHTML += ` <span class="attribute-tag fk">FK</span>`; // Simplified display here
            if (attr.nn) tagsSpan.innerHTML += ` <span class="attribute-tag nn">NN</span>`;
            if (attr.un) tagsSpan.innerHTML += ` <span class="attribute-tag un">UN</span>`;
            attrItemDiv.appendChild(tagsSpan);
            
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'attribute-controls';

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'secondary-btn';
            editBtn.onclick = () => openAttributeModal(index, attr);
            controlsDiv.appendChild(editBtn);

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Del';
            removeBtn.className = 'danger-btn';
            removeBtn.onclick = () => handleRemoveAttribute(index);
            controlsDiv.appendChild(removeBtn);
            
            attrItemDiv.appendChild(controlsDiv);
            attributesListDiv.appendChild(attrItemDiv);
        });
    }

    function openAttributeModal(attrIndex = null, attributeData = null) {
        editingAttributeIndexInput.value = attrIndex !== null ? String(attrIndex) : '';
        if (attributeData) {
            attributeModalTitle.textContent = 'Edit Attribute';
            attrNameInput.value = attributeData.name;
            attrTypeSelect.value = attributeData.type;
            attrIsPkCheckbox.checked = attributeData.pk;
            attrIsNnCheckbox.checked = attributeData.nn || false;
            attrIsUnCheckbox.checked = attributeData.un || false;
            attrIsFkCheckbox.checked = attributeData.fk;
            
            fkDetailsDiv.style.display = attributeData.fk ? 'block' : 'none';
            if (attributeData.fk) {
                populateFkRefTableSelect();
                attrFkRefTableSelect.value = attributeData.references_entity || '';
                populateFkRefFieldSelect(); // Populate fields based on selected table
                attrFkRefFieldSelect.value = attributeData.references_field || '';
            }
        } else { // Adding new attribute
            attributeModalTitle.textContent = 'Add Attribute';
            attrNameInput.value = '';
            attrTypeSelect.value = 'String';
            attrIsPkCheckbox.checked = false;
            attrIsNnCheckbox.checked = false;
            attrIsUnCheckbox.checked = false;
            attrIsFkCheckbox.checked = false;
            fkDetailsDiv.style.display = 'none';
        }
        attributeModal.style.display = 'block';
    }

    function closeAttributeModal() {
        attributeModal.style.display = 'none';
    }

    function handleSaveAttribute() {
        if (!selectedEntity) return;
        const name = attrNameInput.value.trim();
        if (!name) {
            alert('Attribute name cannot be empty.');
            return;
        }
        // Check for duplicate attribute name within the same entity
        const existingAttrIndex = editingAttributeIndexInput.value !== '' ? parseInt(editingAttributeIndexInput.value) : -1;
        if (selectedEntity.attributes.some((attr, idx) => attr.name.toLowerCase() === name.toLowerCase() && idx !== existingAttrIndex)) {
            alert(`Attribute name "${name}" already exists in this entity.`);
            return;
        }


        const attribute = {
            name: name,
            type: attrTypeSelect.value,
            pk: attrIsPkCheckbox.checked,
            nn: attrIsNnCheckbox.checked,
            un: attrIsUnCheckbox.checked,
            fk: attrIsFkCheckbox.checked,
            references_entity: attrIsFkCheckbox.checked ? attrFkRefTableSelect.value : null,
            references_field: attrIsFkCheckbox.checked ? attrFkRefFieldSelect.value : null,
        };

        if (attribute.fk && (!attribute.references_entity || !attribute.references_field)) {
            alert('For a Foreign Key, both the referenced entity and referenced field must be specified.');
            return;
        }
        if (attribute.pk && attribute.fk && attribute.references_entity === selectedEntity.name) {
            alert('An attribute cannot be a PK and also an FK referencing its own table via this UI logic.');
            // This is a simplification; composite keys or specific scenarios might allow this.
            return;
        }


        if (existingAttrIndex !== -1) {
            selectedEntity.attributes[existingAttrIndex] = attribute;
        } else {
            selectedEntity.attributes.push(attribute);
        }
        
        renderEntityOnCanvas(selectedEntity); // Update entity display on canvas
        renderAttributesListForPanel(selectedEntity); // Update properties panel
        closeAttributeModal();
        updateAllRelationshipLines();
    }
    
    function handleRemoveAttribute(index) {
        if (!selectedEntity || !selectedEntity.attributes[index]) return;
        const attrName = selectedEntity.attributes[index].name;
        if (!confirm(`Are you sure you want to delete attribute "${attrName}"?`)) return;

        selectedEntity.attributes.splice(index, 1);
        renderEntityOnCanvas(selectedEntity);
        renderAttributesListForPanel(selectedEntity);
        updateAllRelationshipLines(); // FK might have been removed
    }

    function toggleFkDetails() {
        fkDetailsDiv.style.display = attrIsFkCheckbox.checked ? 'block' : 'none';
        if (attrIsFkCheckbox.checked) {
            populateFkRefTableSelect();
            populateFkRefFieldSelect(); // Initial population
        }
    }

    function populateFkRefTableSelect() {
        attrFkRefTableSelect.innerHTML = '<option value="">-- Select Entity --</option>';
        entities.forEach(entity => {
            // Cannot create FK to self through this simple UI if it's not a self-referencing scenario
            // For simplicity, we prevent selecting the current entity if not strictly necessary.
            // if (selectedEntity && entity.id === selectedEntity.id) return; 
            const option = document.createElement('option');
            option.value = entity.name;
            option.textContent = entity.name;
            attrFkRefTableSelect.appendChild(option);
        });
    }
    
    function populateFkRefFieldSelect() {
        attrFkRefFieldSelect.innerHTML = '<option value="">-- Select Field --</option>';
        const referencedEntityName = attrFkRefTableSelect.value;
        if (referencedEntityName) {
            const referencedEntity = entities.find(e => e.name === referencedEntityName);
            if (referencedEntity) {
                // Typically, FKs reference PKs. Let's prioritize those.
                const pkAttributes = referencedEntity.attributes.filter(attr => attr.pk);
                const otherAttributes = referencedEntity.attributes.filter(attr => !attr.pk);

                pkAttributes.forEach(attr => {
                    const option = document.createElement('option');
                    option.value = attr.name;
                    option.textContent = `${attr.name} (PK)`;
                    attrFkRefFieldSelect.appendChild(option);
                });
                 otherAttributes.forEach(attr => { // Also list other attributes
                    const option = document.createElement('option');
                    option.value = attr.name;
                    option.textContent = attr.name;
                    attrFkRefFieldSelect.appendChild(option);
                });
                // Default to 'id' if it exists and is a PK
                const defaultPkId = pkAttributes.find(attr => attr.name.toLowerCase() === 'id');
                if (defaultPkId) {
                    attrFkRefFieldSelect.value = defaultPkId.name;
                } else if (pkAttributes.length > 0) {
                    attrFkRefFieldSelect.value = pkAttributes[0].name; // Default to first PK
                }
            }
        }
    }

    // --- Relationship Line Drawing (SVG) ---
    function updateAllRelationshipLines() {
        relationshipSvgLayer.innerHTML = ''; // Clear existing lines

        entities.forEach(entity => {
            entity.attributes.forEach(attr => {
                if (attr.fk && attr.references_entity && attr.references_field) {
                    const fromEntity = entities.find(e => e.name === attr.references_entity);
                    const toEntity = entity; // The entity containing the FK

                    if (fromEntity && toEntity && fromEntity.el && toEntity.el) {
                        drawRelationshipLineSVG(fromEntity, toEntity, attr);
                    }
                }
            });
        });
    }
    
    function getEntityRectOnCanvas(entity) {
        // Get position relative to the scrolled canvas, not viewport
        return {
            left: entity.x,
            top: entity.y,
            width: entity.el.offsetWidth,
            height: entity.el.offsetHeight,
            cx: entity.x + entity.el.offsetWidth / 2,
            cy: entity.y + entity.el.offsetHeight / 2
        };
    }

    function drawRelationshipLineSVG(fromEntity, toEntity, attribute) {
        const r1 = getEntityRectOnCanvas(fromEntity);
        const r2 = getEntityRectOnCanvas(toEntity);

        // Simple line between centers for now
        // More advanced: calculate intersection points with entity borders
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', r1.cx);
        line.setAttribute('y1', r1.cy);
        line.setAttribute('x2', r2.cx);
        line.setAttribute('y2', r2.cy);
        line.setAttribute('class', 'relationship-line');
        // TODO: Add markers for crow's foot notation if desired
        relationshipSvgLayer.appendChild(line);
    }

    // --- Canvas Sizing for SVG Layer ---
    function updateCanvasSize() {
        let maxX = canvas.clientWidth; // Start with visible width
        let maxY = canvas.clientHeight; // Start with visible height

        entities.forEach(entity => {
            if (entity.el) {
                maxX = Math.max(maxX, entity.x + entity.el.offsetWidth + 50); // Add some padding
                maxY = Math.max(maxY, entity.y + entity.el.offsetHeight + 50);
            }
        });
        
        // Set SVG dimensions to encompass all entities or be at least the scroll size
        relationshipSvgLayer.setAttribute('width', Math.max(maxX, canvas.scrollWidth) + 'px');
        relationshipSvgLayer.setAttribute('height', Math.max(maxY, canvas.scrollHeight) + 'px');
        updateAllRelationshipLines(); // Redraw lines after potential resize
    }


    // --- Schema Generation and Submission ---
    async function generateSchemaAndSubmit() {
        if (entities.length === 0) {
            alert("Please add at least one entity to the design.");
            return;
        }

        const schema = {
            entities: [],
            relationships: [] // This will be populated based on FKs
        };

        let validationPassed = true;
        entities.forEach(e => {
            if (!e.name.trim()) {
                alert(`Entity with ID ${e.id} has an empty name. Please provide a name.`);
                validationPassed = false;
            }
            e.attributes.forEach(attr => {
                if(!attr.name.trim()){
                    alert(`Entity "${e.name}" has an attribute with an empty name.`);
                    validationPassed = false;
                }
                if(attr.fk && (!attr.references_entity || !attr.references_field)){
                    alert(`Attribute "${attr.name}" in entity "${e.name}" is marked as FK but is missing reference details.`);
                    validationPassed = false;
                }
            });

            const entitySchema = {
                name: e.name,
                attributes: e.attributes.map(attr => ({
                    name: attr.name,
                    type: attr.type,
                    pk: attr.pk,
                    nn: attr.nn,
                    un: attr.un,
                    fk: attr.fk,
                    ...(attr.fk && { 
                        references_entity: attr.references_entity,
                        references_field: attr.references_field
                    })
                }))
            };
            schema.entities.push(entitySchema);

            // Populate relationships based on FKs
            e.attributes.forEach(attr => {
                if (attr.fk && attr.references_entity && attr.references_field) {
                    const fromEntity = entities.find(refE => refE.name === attr.references_entity);
                    if (fromEntity) {
                        const relExists = schema.relationships.some(
                            r => r.from_entity === fromEntity.name && 
                                 r.to_entity === e.name && 
                                 r.foreign_key_in_to_entity === attr.name
                        );
                        if (!relExists) {
                            schema.relationships.push({
                                from_entity: fromEntity.name,
                                to_entity: e.name,
                                type: "1:N", // Default assumption for simple FK
                                foreign_key_in_to_entity: attr.name
                            });
                        }
                    }
                }
            });
        });

        if (!validationPassed) {
            statusDiv.textContent = 'Schema validation failed. Please check entity and attribute names.';
            statusDiv.className = 'status error';
            return;
        }

        statusDiv.textContent = 'Generating schema...';
        statusDiv.className = 'status';
        console.log("Generated Schema:", JSON.stringify(schema, null, 2));

        const targetStack = document.getElementById('targetStack').value;
        const payload = {
            schema_data: schema,
            target_stack: targetStack
        };

        try {
            statusDiv.textContent = 'Sending to backend...';
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || data.error || `Server Error: ${response.status}`);
            }

            if (data.download_url) {
                statusDiv.innerHTML = `✅ Success! <a href="${data.download_url}" download>Download Generated ZIP</a>`;
                statusDiv.className = 'status success';
            } else {
                throw new Error(data.error || "Backend response missing download URL.");
            }
        } catch (err) {
            statusDiv.textContent = `❌ Error: ${err.message}`;
            statusDiv.className = 'status error';
            console.error("Submission Error:", err);
        }
    }

    // --- Save and Load Design Functionality ---
    function saveSchemaToFile() {
        if (entities.length === 0) {
            alert("Nothing to save. Design is empty.");
            return;
        }
        const designData = {
            entities: entities.map(e => ({ // Save only necessary data, not DOM elements
                id: e.id, // Keep ID for potential re-linking if structure is complex
                name: e.name,
                attributes: e.attributes,
                x: e.x,
                y: e.y
            })),
            // relationships: relationships, // If you had explicit M:N relationships
            entityCounter: entityCounter // To continue numbering correctly
        };
        const dataStr = JSON.stringify(designData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'db_schema_design.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        linkElement.remove();
        statusDiv.textContent = 'Design saved to file.';
        statusDiv.className = 'status success';
    }

    function loadSchemaFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const designData = JSON.parse(e.target.result);
                if (designData && designData.entities) {
                    // Clear current canvas
                    entities.forEach(entity => entity.el && entity.el.remove());
                    relationshipSvgLayer.innerHTML = '';
                    
                    entities = []; // Reset state
                    selectedEntity = null;
                    entityCounter = designData.entityCounter || 0;

                    // Recreate entities
                    designData.entities.forEach(entityData => {
                        const newEntity = {
                            id: entityData.id || `entity-${Date.now()}-${++entityCounter}`, // Ensure ID
                            name: entityData.name,
                            attributes: entityData.attributes || [],
                            x: entityData.x || 50,
                            y: entityData.y || 50,
                            el: null
                        };
                        entities.push(newEntity);
                        renderEntityOnCanvas(newEntity);
                    });
                    
                    deselectAllEntities(); // Clear properties panel
                    updateAllRelationshipLines();
                    updateCanvasSize();
                    statusDiv.textContent = 'Design loaded successfully.';
                    statusDiv.className = 'status success';
                } else {
                    throw new Error("Invalid file format.");
                }
            } catch (err) {
                alert('Error loading or parsing file: ' + err.message);
                statusDiv.textContent = 'Error loading design.';
                statusDiv.className = 'status error';
                console.error("Load Error:", err);
            } finally {
                loadSchemaInput.value = ''; // Reset file input
            }
        };
        reader.readAsText(file);
    }

    // --- Start the application ---
    init();
});