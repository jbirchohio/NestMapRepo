import React from 'react';

export const DragDropContext: React.FC<{ onDragEnd?: (result: any) => void; children: React.ReactNode }> = ({ children }) => (
  <div>{children}</div>
);

export const Droppable: React.FC<{ droppableId: string; children: (provided: any) => React.ReactNode }> = ({ children }) => {
  const provided = { innerRef: React.createRef<HTMLDivElement>(), droppableProps: {}, placeholder: null };
  return <div ref={provided.innerRef}>{children(provided)}</div>;
};

export const Draggable: React.FC<{ draggableId: string; index: number; children: (provided: any) => React.ReactNode }> = ({ children }) => {
  const provided = { innerRef: React.createRef<HTMLDivElement>(), draggableProps: {}, dragHandleProps: {} };
  return <div ref={provided.innerRef}>{children(provided)}</div>;
};
