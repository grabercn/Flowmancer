import { useState, useCallback } from 'react';
import type { Entity } from '../types';

type EntitiesStateSetter = React.Dispatch<React.SetStateAction<Entity[]>>;

interface DraggedState {
  id: string;
  offsetX: number;
  offsetY: number;
}

export function useEntityDrag(setEntities: EntitiesStateSetter) {
  const [draggedEntity, setDraggedEntity] = useState<DraggedState | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  // Start drag with mouse
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>, entity: Entity) => {
    e.preventDefault();
    const offsetX = e.clientX - entity.ui.x;
    const offsetY = e.clientY - entity.ui.y;
    setDraggedEntity({ id: entity.id, offsetX, offsetY });
  }, []);

  // Start drag with touch
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, entity: Entity) => {
    const touch = e.touches[0];
    if (!touch) return;

    const offsetX = touch.clientX - entity.ui.x;
    const offsetY = touch.clientY - entity.ui.y;
    setDraggedEntity({ id: entity.id, offsetX, offsetY });
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  // Move entity with mouse
  const handleDragMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedEntity) return;
    e.preventDefault();

    const newX = e.clientX - draggedEntity.offsetX;
    const newY = e.clientY - draggedEntity.offsetY;

    setEntities(prev =>
      prev.map(entity =>
        entity.id === draggedEntity.id ? { ...entity, ui: { x: newX, y: newY } } : entity
      )
    );
  }, [draggedEntity, setEntities]);

  // Move entity with touch
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!draggedEntity) return;
    const touch = e.touches[0];
    if (!touch) return;

    const newX = touch.clientX - draggedEntity.offsetX;
    const newY = touch.clientY - draggedEntity.offsetY;

    setEntities(prev =>
      prev.map(entity =>
        entity.id === draggedEntity.id ? { ...entity, ui: { x: newX, y: newY } } : entity
      )
    );
  }, [draggedEntity, setEntities]);

  // End drag (mouse or touch)
  const handleDragEnd = useCallback(() => {
    setDraggedEntity(null);
    setTouchStart(null);
  }, []);

  // Detect swipe
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    const threshold = 50; // Minimum px to qualify as a swipe

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > threshold) {
        console.log("Swipe →");
        // handleSwipeRight()
      } else if (deltaX < -threshold) {
        console.log("Swipe ←");
        // handleSwipeLeft()
      }
    } else {
      if (deltaY > threshold) {
        console.log("Swipe ↓");
        // handleSwipeDown()
      } else if (deltaY < -threshold) {
        console.log("Swipe ↑");
        // handleSwipeUp()
      }
    }

    handleDragEnd(); // Finish dragging
  }, [touchStart, handleDragEnd]);

  return {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging: !!draggedEntity,
  };
}
