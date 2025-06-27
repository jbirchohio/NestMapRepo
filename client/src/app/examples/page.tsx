import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TodoList from '../../components/examples/TodoList';

// Create a client for React Query
const queryClient = new QueryClient();

/**
 * Example page demonstrating the TodoList component with API integration
 */
const ExamplesPage: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="examples-container">
        <header>
          <h1>API Integration Example</h1>
          <p>
            This page demonstrates how to use the API client with React Query.
            The TodoList below is fully functional and uses the API client we created.
          </p>
        </header>
        
        <section className="example-section">
          <h2>Todo List</h2>
          <TodoList />
        </section>
        
        <style jsx>{`
          .examples-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          header {
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #eee;
          }
          
          h1 {
            margin: 0 0 0.5rem 0;
            color: #333;
          }
          
          p {
            margin: 0;
            color: #666;
            line-height: 1.6;
          }
          
          .example-section {
            margin-top: 2rem;
            padding: 1.5rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          
          .example-section h2 {
            margin-top: 0;
            color: #333;
            font-size: 1.5rem;
          }
        `}</style>
      </div>
    </QueryClientProvider>
  );
};

export default ExamplesPage;
