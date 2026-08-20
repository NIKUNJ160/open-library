import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Album } from '../../../shared/types/library';

interface DndProviderProps {
  albums: Album[];
  onDragEnd: (event: DragEndEvent) => void;
  children: React.ReactNode;
}

export const DndProvider: React.FC<DndProviderProps> = ({ albums, onDragEnd, children }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const albumIds = albums.map((a) => a.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={albumIds} strategy={rectSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
};
