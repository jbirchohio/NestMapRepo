import React from 'react';
export const DragDropContext: React.FC<{
    onDragEnd?: (result: any) => void;
    children: React.ReactNode;
}> = ({ children }) => (<div>{children}</div>);
export const Droppable: React.FC<{
    droppableId: string;
    children: (provided: any, snapshot: any) => React.ReactNode;
}> = ({ children }) => {
    const provided = { 
        innerRef: React.createRef<HTMLDivElement>(), 
        droppableProps: {}, 
        placeholder: null 
    };
    const snapshot = { isDraggingOver: false, draggingOverWith: null, draggingFromThisWith: null };
    return <div ref={provided.innerRef}>{children(provided, snapshot)}</div>;
};
export const Draggable: React.FC<{
    draggableId: string;
    index: number;
    children: (provided: any, snapshot: any) => React.ReactNode;
}> = ({ children }) => {
    const provided = { innerRef: React.createRef<HTMLDivElement>(), draggableProps: {}, dragHandleProps: {} };
    const snapshot = { isDragging: false, isDropAnimating: false, dropAnimation: null, mode: 'SNAP' as const };
    return <div ref={provided.innerRef}>{children(provided, snapshot)}</div>;
};
