import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import "@jest/globals";
// Load environment variables
dotenv.config();
// Declare jest globals
declare global {
    namespace NodeJS {
        interface Global {
            beforeAll: typeof beforeAll;
            afterAll: typeof afterAll;
        }
    }
}
// Increase timeout for API calls
jest.setTimeout(30000);
// Setup global test configuration
beforeAll(async () => {
    // Validate required environment variables
    const requiredEnvVars = [
        "VITE_SUPABASE_URL",
        "VITE_SUPABASE_ANON_KEY",
        "TEST_USER_EMAIL",
        "TEST_USER_PASSWORD"
    ];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(", ")}\n` +
            "Please set these variables in your .env file or environment.");
    }
    // Initialize Supabase client
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
    // Verify database connection
    try {
        const { error } = await supabase.auth.getSession();
        if (error) {
            throw error;
        }
    }
    catch (error) {
        console.error("Failed to connect to Supabase:", error);
        throw error;
    }
});
// Cleanup after all tests
afterAll(async () => {
    // Add any cleanup logic here
});
