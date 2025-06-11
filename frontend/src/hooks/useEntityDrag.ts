// frontend/src/hooks/useEntityDrag.ts

import { useState, useCallback } from 'react';
import type { Entity } from '../types';

// Type alias for the state setter function for clarity.
type EntitiesStateSetter = React.Dispatch<React.SetStateAction<Entity[]>>;

/**
 * A custom React hook to encapsulate the logic for dragging entities on the canvas.
 * @param setEntities - The state setter function for the entities array.
 * @returns An object containing event handlers for dragging and the current dragging state.
 */
export function useEntityDrag(
    setEntities: EntitiesStateSetter
) {
    // This state holds information about the entity being dragged and the initial mouse offset.
    const [draggedEntity, setDraggedEntity] = useState<{
        id: string;      // The ID of the entity being dragged
        offsetX: number; // The horizontal distance from the mouse click to the entity's left edge
        offsetY: number; // The vertical distance from the mouse click to the entity's top edge
    } | null>(null);

    /**
     * Initiates a drag operation. Called on `onMouseDown` on an EntityCard.
     */
    const handleDragStart = useCallback((
        e: React.MouseEvent<HTMLDivElement>, 
        entity: Entity
    ) => {
        // Prevent default browser behavior like text selection or image dragging.
        e.preventDefault();
        
        // Calculate the offset from the mouse pointer to the top-left corner of the entity.
        // This ensures the entity doesn't "jump" to the mouse position.
        const offsetX = e.clientX - entity.ui.x;
        const offsetY = e.clientY - entity.ui.y;
        
        setDraggedEntity({ 
            id: entity.id, 
            offsetX, 
            offsetY 
        });
    }, []); // This function is stable and doesn't need dependencies.

    /**
     * Updates the position of the entity being dragged. Called on `onMouseMove` on the canvas.
     */
    const handleDragMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Only run if a drag operation is active.
        if (!draggedEntity) return;

        e.preventDefault();

        // Calculate the new top-left coordinates for the entity.
        const newX = e.clientX - draggedEntity.offsetX;
        const newY = e.clientY - draggedEntity.offsetY;

        // Update the state. This is optimized to only rerender the entity that moved.
        setEntities(prevEntities =>
            prevEntities.map(entity =>
                entity.id === draggedEntity.id
                    ? { ...entity, ui: { ...entity.ui, x: newX, y: newY } }
                    : entity
            )
        );
    }, [draggedEntity, setEntities]); // Re-create this function only when the dragged entity changes.

    /**
     * Concludes a drag operation. Called on `onMouseUp` on the canvas.
     */
    const handleDragEnd = useCallback(() => {
        setDraggedEntity(null);
    }, []); // This function is stable.

    // Expose the handlers and a boolean indicating if a drag is in progress.
    return {
        handleDragStart,
        handleDragMove,
        handleDragEnd,
        isDragging: !!draggedEntity,
    };
}
