import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/setupTests.ts'],
        alias: {
            '../supabaseClient': './src/__mocks__/supabaseClient.ts',
        },
    },
});
