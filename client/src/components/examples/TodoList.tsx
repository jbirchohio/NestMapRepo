import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createResourceHooks } from '../../lib/api';

// Define the Todo type
type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

// Create typed hooks for the todos resource
const todoHooks = createResourceHooks<Todo, Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>>('todos');

/**
 * Example component demonstrating API integration patterns
 */
const TodoList: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Fetch all todos
  const { 
    data: todos = [], 
    isLoading, 
    error,
    refetch 
  } = todoHooks.useGetAll();
  
  // Create a new todo
  const { mutate: createTodo } = todoHooks.useCreate({
    onSuccess: () => {
      // Invalidate and refetch todos after creation
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
  
  // Toggle todo completion
  const { mutate: toggleTodo } = todoHooks.usePatch({
    onSuccess: () => {
      // Invalidate and refetch todos after update
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
  
  // Delete a todo
  const { mutate: deleteTodo } = todoHooks.useDelete({
    onSuccess: () => {
      // Invalidate and refetch todos after deletion
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    
    if (title.trim()) {
      createTodo({ title, completed: false });
      e.currentTarget.reset();
    }
  };
  
  // Loading state
  if (isLoading) {
    return <div>Loading todos...</div>;
  }
  
  // Error state
  if (error) {
    return (
      <div>
        <div>Error loading todos: {error.message}</div>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }
  
  // Render the todo list
  return (
    <div className="todo-list">
      <h2>Todo List</h2>
      
      {/* Add new todo form */}
      <form onSubmit={handleSubmit} className="todo-form">
        <input
          type="text"
          name="title"
          placeholder="Add a new todo..."
          required
          className="todo-input"
        />
        <button type="submit" className="add-button">
          Add Todo
        </button>
      </form>
      
      {/* Todo list */}
      <ul className="todo-items">
        {todos.map((todo) => (
          <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => 
                toggleTodo({ 
                  id: todo.id, 
                  data: { completed: !todo.completed } 
                })
              }
              className="todo-checkbox"
            />
            <span className="todo-title">{todo.title}</span>
            <button 
              onClick={() => deleteTodo(todo.id)}
              className="delete-button"
              aria-label="Delete todo"
            >
              ×
            </button>
          </li>
        ))}
        {todos.length === 0 && (
          <li className="empty-state">No todos yet. Add one above!</li>
        )}
      </ul>
      
      <style jsx>{`
        .todo-list {
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .todo-form {
          display: flex;
          margin-bottom: 20px;
        }
        
        .todo-input {
          flex: 1;
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ddd;
          border-radius: 4px 0 0 4px;
        }
        
        .add-button {
          padding: 10px 20px;
          background-color: #0070f3;
          color: white;
          border: none;
          border-radius: 0 4px 4px 0;
          cursor: pointer;
          font-weight: 500;
        }
        
        .add-button:hover {
          background-color: #0051a2;
        }
        
        .todo-items {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .todo-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: white;
          border: 1px solid #eee;
          margin-bottom: 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .todo-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .todo-item.completed .todo-title {
          text-decoration: line-through;
          color: #888;
        }
        
        .todo-checkbox {
          margin-right: 12px;
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        .todo-title {
          flex: 1;
          margin: 0;
          font-size: 16px;
        }
        
        .delete-button {
          background: none;
          border: none;
          color: #ff4d4f;
          font-size: 20px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        
        .delete-button:hover {
          background-color: #fff1f0;
        }
        
        .empty-state {
          text-align: center;
          color: #888;
          padding: 20px;
          border: 1px dashed #eee;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default TodoList;
