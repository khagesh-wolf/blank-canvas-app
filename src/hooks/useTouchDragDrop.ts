import { useRef, useCallback } from 'react';

interface UseTouchDragDropOptions {
  onReorder: (fromIndex: number, toIndex: number) => void;
  containerSelector: string;
}

export function useTouchDragDrop({ onReorder, containerSelector }: UseTouchDragDropOptions) {
  const dragState = useRef<{
    isDragging: boolean;
    startIndex: number;
    currentIndex: number;
    startY: number;
    element: HTMLElement | null;
    placeholder: HTMLElement | null;
  }>({
    isDragging: false,
    startIndex: -1,
    currentIndex: -1,
    startY: 0,
    element: null,
    placeholder: null,
  });

  const getItemElements = useCallback(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return [];
    return Array.from(container.children) as HTMLElement[];
  }, [containerSelector]);

  const getIndexFromY = useCallback((y: number) => {
    const items = getItemElements();
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (y < midY) return i;
    }
    return items.length - 1;
  }, [getItemElements]);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    const element = e.currentTarget as HTMLElement;
    
    dragState.current = {
      isDragging: true,
      startIndex: index,
      currentIndex: index,
      startY: touch.clientY,
      element,
      placeholder: null,
    };

    // Add visual feedback
    element.style.opacity = '0.5';
    element.style.transform = 'scale(1.02)';
    element.style.zIndex = '50';
    element.style.position = 'relative';
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.current.isDragging || !dragState.current.element) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const newIndex = getIndexFromY(touch.clientY);
    
    if (newIndex !== dragState.current.currentIndex) {
      dragState.current.currentIndex = newIndex;
      
      // Update visual feedback for drop target
      const items = getItemElements();
      items.forEach((item, i) => {
        if (i === newIndex && i !== dragState.current.startIndex) {
          item.classList.add('ring-2', 'ring-primary');
        } else {
          item.classList.remove('ring-2', 'ring-primary');
        }
      });
    }
  }, [getIndexFromY, getItemElements]);

  const handleTouchEnd = useCallback(() => {
    if (!dragState.current.isDragging) return;
    
    const { startIndex, currentIndex, element } = dragState.current;
    
    // Reset visual state
    if (element) {
      element.style.opacity = '';
      element.style.transform = '';
      element.style.zIndex = '';
      element.style.position = '';
    }
    
    // Clear all ring styles
    const items = getItemElements();
    items.forEach(item => {
      item.classList.remove('ring-2', 'ring-primary');
    });
    
    // Perform reorder if position changed
    if (startIndex !== currentIndex && startIndex !== -1 && currentIndex !== -1) {
      onReorder(startIndex, currentIndex);
    }
    
    // Reset drag state
    dragState.current = {
      isDragging: false,
      startIndex: -1,
      currentIndex: -1,
      startY: 0,
      element: null,
      placeholder: null,
    };
  }, [onReorder, getItemElements]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
