import { describe, test, expect, beforeAll } from "jest";
import supertest from "supertest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.VITE_API_URL || "http://localhost:5000";
const request = supertest(BASE_URL);

// Test data
const testTrip = {
  title: "Test Trip",
  startDate: new Date("2025-07-01").toISOString(),
  endDate: new Date("2025-07-05").toISOString(),
  city: "Test City",
  isPublic: false,
  sharingEnabled: true,
  sharePermission: "read-only"
};

let authToken: string;
let testTripId: string;

describe("Comprehensive API Endpoint Check", () => {
  beforeAll(async () => {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    // Sign in with test credentials
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL || "test@example.com",
      password: process.env.TEST_USER_PASSWORD || "test123"
    });

    if (error) throw error;
    authToken = session?.access_token || "";
  });

  // Auth Endpoints
  describe("Authentication Endpoints", () => {
    test("GET /api/auth/session - Should return current session", async () => {
      const response = await request
        .get("/api/auth/session")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("user");
    });

    test("GET /api/auth/user - Should return user profile", async () => {
      const response = await request
        .get("/api/auth/user")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("email");
    });
  });

  // Trip Endpoints
  describe("Trip Management Endpoints", () => {
    test("POST /api/trips - Should create a new trip", async () => {
      const response = await request
        .post("/api/trips")
        .set("Authorization", `Bearer ${authToken}`)
        .send(testTrip);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      testTripId = response.body.id;
    });

    test("GET /api/trips - Should list all trips", async () => {
      const response = await request
        .get("/api/trips")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test("GET /api/trips/:id - Should get specific trip", async () => {
      const response = await request
        .get(`/api/trips/${testTripId}`)
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", testTripId);
    });

    test("PUT /api/trips/:id - Should update trip", async () => {
      const response = await request
        .put(`/api/trips/${testTripId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ ...testTrip, title: "Updated Test Trip" });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("title", "Updated Test Trip");
    });
  });

  // AI Features
  describe("AI Feature Endpoints", () => {
    test("POST /api/ai/find-location - Should return location data", async () => {
      const response = await request
        .post("/api/ai/find-location")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ description: "Eiffel Tower" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name");
    });

    test("POST /api/ai/optimize-itinerary - Should return optimized schedule", async () => {
      const response = await request
        .post("/api/ai/optimize-itinerary")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          tripId: testTripId,
          preferences: {
            startTime: "09:00",
            endTime: "18:00",
            maxActivitiesPerDay: 4
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("schedule");
    });
  });

  // Team & Organization
  describe("Team Management Endpoints", () => {
    test("GET /api/organizations/members - Should list organization members", async () => {
      const response = await request
        .get("/api/organizations/members")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test("GET /api/organization/roles - Should list available roles", async () => {
      const response = await request
        .get("/api/organization/roles")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // Billing & Subscription
  describe("Billing Endpoints", () => {
    test("GET /api/billing/subscription - Should return subscription status", async () => {
      const response = await request
        .get("/api/billing/subscription")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status");
    });

    test("GET /api/billing/invoices - Should list invoices", async () => {
      const response = await request
        .get("/api/billing/invoices")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // Cleanup
  describe("Cleanup", () => {
    test("DELETE /api/trips/:id - Should delete test trip", async () => {
      const response = await request
        .delete(`/api/trips/${testTripId}`)
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
    });
  });
}); 