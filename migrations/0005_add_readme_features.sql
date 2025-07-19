-- Migration: Add all README feature tables to database schema
-- Created: 2024-12-19
-- Description: Adds comprehensive schema support for all features mentioned in README.md

-- ======================
-- VOICE INTERFACE FEATURES
-- ======================

-- Voice Session Status Enum
CREATE TYPE "voice_session_status" AS ENUM('active', 'inactive', 'paused', 'completed');

-- Voice Command Type Enum
CREATE TYPE "voice_command_type" AS ENUM('query', 'booking', 'expense', 'report', 'navigation', 'help');

-- Voice Sessions Table
CREATE TABLE "voice_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
    "session_token" text NOT NULL UNIQUE,
    "status" "voice_session_status" DEFAULT 'active',
    "started_at" timestamp NOT NULL DEFAULT now(),
    "ended_at" timestamp,
    "total_commands" integer DEFAULT 0,
    "successful_commands" integer DEFAULT 0,
    "language" text DEFAULT 'en',
    "metadata" jsonb DEFAULT '{}',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Voice Commands Table
CREATE TABLE "voice_commands" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "session_id" uuid NOT NULL REFERENCES "voice_sessions"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
    "command" text NOT NULL,
    "processed_command" text,
    "command_type" "voice_command_type" NOT NULL,
    "intent" text,
    "confidence" integer,
    "response" text,
    "success" boolean DEFAULT false,
    "execution_time" integer,
    "metadata" jsonb DEFAULT '{}',
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- ======================
-- AI ASSISTANT FEATURES
-- ======================

-- AI Conversation Status Enum
CREATE TYPE "ai_conversation_status" AS ENUM('active', 'archived', 'deleted');

-- AI Message Role Enum
CREATE TYPE "ai_message_role" AS ENUM('user', 'assistant', 'system');

-- AI Conversations Table
CREATE TABLE "ai_conversations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
    "title" text,
    "status" "ai_conversation_status" DEFAULT 'active',
    "context" jsonb DEFAULT '{}',
    "total_messages" integer DEFAULT 0,
    "last_message_at" timestamp,
    "archived_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- AI Messages Table
CREATE TABLE "ai_messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "conversation_id" uuid NOT NULL REFERENCES "ai_conversations"("id") ON DELETE CASCADE,
    "role" "ai_message_role" NOT NULL,
    "content" text NOT NULL,
    "token_count" integer,
    "model" text DEFAULT 'gpt-4',
    "response_time" integer,
    "metadata" jsonb DEFAULT '{}',
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- ======================
-- SMART CITY INTEGRATION
-- ======================

-- Smart City Data Type Enum
CREATE TYPE "smart_city_data_type" AS ENUM('weather', 'traffic', 'air_quality', 'public_transport', 'events', 'emergency');

-- IoT Device Type Enum
CREATE TYPE "iot_device_type" AS ENUM('sensor', 'camera', 'beacon', 'display', 'kiosk');

-- Smart Cities Table
CREATE TABLE "smart_cities" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "country" text NOT NULL,
    "latitude" text NOT NULL,
    "longitude" text NOT NULL,
    "timezone" text NOT NULL,
    "is_active" boolean DEFAULT true,
    "api_endpoints" jsonb DEFAULT '{}',
    "configuration" jsonb DEFAULT '{}',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Smart City Data Table
CREATE TABLE "smart_city_data" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "city_id" uuid NOT NULL REFERENCES "smart_cities"("id") ON DELETE CASCADE,
    "data_type" "smart_city_data_type" NOT NULL,
    "data" jsonb NOT NULL,
    "location" jsonb,
    "quality" integer,
    "source" text,
    "expires_at" timestamp,
    "collected_at" timestamp NOT NULL DEFAULT now(),
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- IoT Devices Table
CREATE TABLE "iot_devices" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "city_id" uuid NOT NULL REFERENCES "smart_cities"("id") ON DELETE CASCADE,
    "device_id" text NOT NULL UNIQUE,
    "device_type" "iot_device_type" NOT NULL,
    "name" text NOT NULL,
    "location" jsonb NOT NULL,
    "is_online" boolean DEFAULT true,
    "last_seen" timestamp,
    "capabilities" jsonb DEFAULT '[]',
    "metadata" jsonb DEFAULT '{}',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ======================
-- AUTONOMOUS VEHICLES
-- ======================

-- Vehicle Type Enum
CREATE TYPE "vehicle_type" AS ENUM('sedan', 'suv', 'van', 'truck', 'bus', 'motorcycle');

-- Vehicle Status Enum
CREATE TYPE "vehicle_status" AS ENUM('available', 'booked', 'in_transit', 'maintenance', 'offline');

-- Autonomy Level Enum
CREATE TYPE "autonomy_level" AS ENUM('level_0', 'level_1', 'level_2', 'level_3', 'level_4', 'level_5');

-- Vehicle Booking Status Enum
CREATE TYPE "vehicle_booking_status" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- Autonomous Vehicles Table
CREATE TABLE "autonomous_vehicles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "fleet_id" text NOT NULL,
    "vehicle_id" text NOT NULL UNIQUE,
    "provider" text NOT NULL,
    "vehicle_type" "vehicle_type" NOT NULL,
    "autonomy_level" "autonomy_level" NOT NULL,
    "status" "vehicle_status" DEFAULT 'available',
    "current_location" jsonb,
    "capacity" integer NOT NULL,
    "battery_level" integer,
    "features" jsonb DEFAULT '{}',
    "operating_zones" jsonb DEFAULT '[]',
    "last_maintenance" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Vehicle Bookings Table
CREATE TABLE "vehicle_bookings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "organization_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL,
    "trip_id" uuid REFERENCES "trips"("id") ON DELETE SET NULL,
    "vehicle_id" uuid NOT NULL REFERENCES "autonomous_vehicles"("id") ON DELETE CASCADE,
    "status" "vehicle_booking_status" DEFAULT 'pending',
    "pickup_location" jsonb NOT NULL,
    "dropoff_location" jsonb NOT NULL,
    "scheduled_pickup" timestamp NOT NULL,
    "actual_pickup" timestamp,
    "actual_dropoff" timestamp,
    "estimated_duration" integer,
    "actual_duration" integer,
    "estimated_cost" integer,
    "actual_cost" integer,
    "passenger_count" integer DEFAULT 1,
    "special_requirements" jsonb,
    "route_data" jsonb,
    "provider_booking_id" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ======================
-- PLATFORM MARKETPLACE
-- ======================

-- App Category Enum
CREATE TYPE "app_category" AS ENUM('travel', 'expense', 'productivity', 'communication', 'analytics', 'automation', 'other');

-- App Status Enum
CREATE TYPE "app_status" AS ENUM('active', 'inactive', 'pending_review', 'suspended', 'deprecated');

-- Installation Status Enum
CREATE TYPE "installation_status" AS ENUM('installed', 'uninstalled', 'updating', 'failed');

-- Marketplace Apps Table
CREATE TABLE "marketplace_apps" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "slug" text NOT NULL UNIQUE,
    "category" "app_category" NOT NULL,
    "status" "app_status" DEFAULT 'pending_review',
    "developer_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "description" text,
    "long_description" text,
    "version" text NOT NULL,
    "icon_url" text,
    "screenshot_urls" jsonb DEFAULT '[]',
    "pricing" jsonb NOT NULL,
    "permissions" jsonb DEFAULT '[]',
    "api_endpoints" jsonb,
    "configuration" jsonb DEFAULT '{}',
    "install_count" integer DEFAULT 0,
    "rating" integer,
    "review_count" integer DEFAULT 0,
    "published_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- App Installations Table
CREATE TABLE "app_installations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "app_id" uuid NOT NULL REFERENCES "marketplace_apps"("id") ON DELETE CASCADE,
    "installed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "status" "installation_status" DEFAULT 'installed',
    "version" text NOT NULL,
    "configuration" jsonb DEFAULT '{}',
    "permissions" jsonb DEFAULT '[]',
    "api_key" text,
    "webhook_url" text,
    "last_used" timestamp,
    "usage_count" integer DEFAULT 0,
    "installed_at" timestamp NOT NULL DEFAULT now(),
    "uninstalled_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- App Reviews Table
CREATE TABLE "app_reviews" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "app_id" uuid NOT NULL REFERENCES "marketplace_apps"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
    "rating" integer NOT NULL,
    "title" text,
    "review" text,
    "is_verified" boolean DEFAULT false,
    "helpful_count" integer DEFAULT 0,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ======================
-- AUTOMATION WORKFLOWS
-- ======================

-- Workflow Status Enum
CREATE TYPE "workflow_status" AS ENUM('draft', 'active', 'inactive', 'archived');

-- Workflow Trigger Type Enum
CREATE TYPE "workflow_trigger_type" AS ENUM('manual', 'schedule', 'event', 'webhook', 'condition');

-- Workflow Execution Status Enum
CREATE TYPE "workflow_execution_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');

-- Automation Workflows Table
CREATE TABLE "automation_workflows" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "description" text,
    "status" "workflow_status" DEFAULT 'draft',
    "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "trigger_type" "workflow_trigger_type" NOT NULL,
    "trigger_config" jsonb NOT NULL,
    "actions" jsonb DEFAULT '[]',
    "is_template" boolean DEFAULT false,
    "execution_count" integer DEFAULT 0,
    "last_executed" timestamp,
    "next_execution" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Workflow Executions Table
CREATE TABLE "workflow_executions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workflow_id" uuid NOT NULL REFERENCES "automation_workflows"("id") ON DELETE CASCADE,
    "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "triggered_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "status" "workflow_execution_status" DEFAULT 'pending',
    "trigger_data" jsonb,
    "execution_data" jsonb DEFAULT '{"actions": []}',
    "started_at" timestamp DEFAULT now(),
    "completed_at" timestamp,
    "duration" integer,
    "error_message" text,
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- ======================
-- CARBON FOOTPRINT TRACKING
-- ======================

-- Emission Source Enum
CREATE TYPE "emission_source" AS ENUM('flight', 'hotel', 'car', 'train', 'taxi', 'food', 'other');

-- Offset Status Enum
CREATE TYPE "offset_status" AS ENUM('none', 'pending', 'purchased', 'verified', 'retired');

-- Carbon Footprints Table
CREATE TABLE "carbon_footprints" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
    "trip_id" uuid REFERENCES "trips"("id") ON DELETE CASCADE,
    "booking_id" uuid REFERENCES "bookings"("id") ON DELETE CASCADE,
    "source" "emission_source" NOT NULL,
    "source_details" jsonb,
    "co2_emissions" integer NOT NULL,
    "ch4_emissions" integer,
    "n2o_emissions" integer,
    "total_co2_equivalent" integer NOT NULL,
    "calculation_method" text NOT NULL,
    "calculation_date" timestamp NOT NULL DEFAULT now(),
    "offset_status" "offset_status" DEFAULT 'none',
    "offset_cost" integer,
    "offset_provider" text,
    "offset_certificate" text,
    "metadata" jsonb,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Carbon Offsets Table
CREATE TABLE "carbon_offsets" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
    "footprint_ids" jsonb NOT NULL,
    "total_co2_offset" integer NOT NULL,
    "cost" integer NOT NULL,
    "provider" text NOT NULL,
    "project_type" text,
    "certificate_number" text,
    "verification_standard" text,
    "purchase_date" timestamp NOT NULL,
    "retirement_date" timestamp,
    "status" "offset_status" DEFAULT 'pending',
    "metadata" jsonb,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ======================
-- PREDICTIVE ANALYTICS
-- ======================

-- Model Type Enum
CREATE TYPE "model_type" AS ENUM('demand_forecasting', 'cost_optimization', 'disruption_prediction', 'behavior_analysis', 'recommendation');

-- Model Status Enum
CREATE TYPE "model_status" AS ENUM('training', 'active', 'inactive', 'deprecated', 'failed');

-- Prediction Status Enum
CREATE TYPE "prediction_status" AS ENUM('pending', 'completed', 'failed', 'expired');

-- Analytics Models Table
CREATE TABLE "analytics_models" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "model_type" "model_type" NOT NULL,
    "status" "model_status" DEFAULT 'training',
    "version" text NOT NULL,
    "description" text,
    "algorithm" text NOT NULL,
    "parameters" jsonb DEFAULT '{}',
    "training_data" jsonb,
    "accuracy" integer,
    "last_training" timestamp,
    "next_training" timestamp,
    "prediction_count" integer DEFAULT 0,
    "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Predictions Table
CREATE TABLE "predictions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "model_id" uuid NOT NULL REFERENCES "analytics_models"("id") ON DELETE CASCADE,
    "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
    "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "entity_type" text,
    "entity_id" uuid,
    "input_data" jsonb NOT NULL,
    "prediction" jsonb NOT NULL,
    "status" "prediction_status" DEFAULT 'pending',
    "accuracy" integer,
    "feedback" jsonb,
    "expires_at" timestamp,
    "processed_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- Analytics Reports Table
CREATE TABLE "analytics_reports" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "report_type" text NOT NULL,
    "configuration" jsonb NOT NULL,
    "data" jsonb,
    "schedule" text,
    "last_generated" timestamp,
    "next_generation" timestamp,
    "is_public" boolean DEFAULT false,
    "share_token" text UNIQUE,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ======================
-- INDEXES FOR PERFORMANCE
-- ======================

-- Voice Interface Indexes
CREATE INDEX "voice_sessions_user_id_idx" ON "voice_sessions"("user_id");
CREATE INDEX "voice_sessions_token_idx" ON "voice_sessions"("session_token");
CREATE INDEX "voice_sessions_status_idx" ON "voice_sessions"("status");

CREATE INDEX "voice_commands_session_id_idx" ON "voice_commands"("session_id");
CREATE INDEX "voice_commands_user_id_idx" ON "voice_commands"("user_id");
CREATE INDEX "voice_commands_type_idx" ON "voice_commands"("command_type");
CREATE INDEX "voice_commands_success_idx" ON "voice_commands"("success");

-- AI Assistant Indexes
CREATE INDEX "ai_conversations_user_id_idx" ON "ai_conversations"("user_id");
CREATE INDEX "ai_conversations_status_idx" ON "ai_conversations"("status");
CREATE INDEX "ai_conversations_last_message_idx" ON "ai_conversations"("last_message_at");

CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");
CREATE INDEX "ai_messages_role_idx" ON "ai_messages"("role");
CREATE INDEX "ai_messages_created_at_idx" ON "ai_messages"("created_at");

-- Smart City Indexes
CREATE INDEX "smart_cities_name_idx" ON "smart_cities"("name");
CREATE INDEX "smart_cities_country_idx" ON "smart_cities"("country");
CREATE INDEX "smart_cities_active_idx" ON "smart_cities"("is_active");

CREATE INDEX "smart_city_data_city_type_idx" ON "smart_city_data"("city_id", "data_type");
CREATE INDEX "smart_city_data_collected_at_idx" ON "smart_city_data"("collected_at");
CREATE INDEX "smart_city_data_expires_at_idx" ON "smart_city_data"("expires_at");

CREATE INDEX "iot_devices_city_id_idx" ON "iot_devices"("city_id");
CREATE INDEX "iot_devices_device_id_idx" ON "iot_devices"("device_id");
CREATE INDEX "iot_devices_type_idx" ON "iot_devices"("device_type");
CREATE INDEX "iot_devices_online_idx" ON "iot_devices"("is_online");

-- Autonomous Vehicle Indexes
CREATE INDEX "autonomous_vehicles_provider_idx" ON "autonomous_vehicles"("provider");
CREATE INDEX "autonomous_vehicles_status_idx" ON "autonomous_vehicles"("status");
CREATE INDEX "autonomous_vehicles_vehicle_id_idx" ON "autonomous_vehicles"("vehicle_id");
CREATE INDEX "autonomous_vehicles_type_idx" ON "autonomous_vehicles"("vehicle_type");

CREATE INDEX "vehicle_bookings_user_id_idx" ON "vehicle_bookings"("user_id");
CREATE INDEX "vehicle_bookings_trip_id_idx" ON "vehicle_bookings"("trip_id");
CREATE INDEX "vehicle_bookings_vehicle_id_idx" ON "vehicle_bookings"("vehicle_id");
CREATE INDEX "vehicle_bookings_status_idx" ON "vehicle_bookings"("status");
CREATE INDEX "vehicle_bookings_scheduled_pickup_idx" ON "vehicle_bookings"("scheduled_pickup");

-- Marketplace Indexes
CREATE INDEX "marketplace_apps_slug_idx" ON "marketplace_apps"("slug");
CREATE INDEX "marketplace_apps_category_idx" ON "marketplace_apps"("category");
CREATE INDEX "marketplace_apps_status_idx" ON "marketplace_apps"("status");
CREATE INDEX "marketplace_apps_rating_idx" ON "marketplace_apps"("rating");

CREATE INDEX "app_installations_org_app_idx" ON "app_installations"("organization_id", "app_id");
CREATE INDEX "app_installations_status_idx" ON "app_installations"("status");
CREATE INDEX "app_installations_last_used_idx" ON "app_installations"("last_used");

CREATE INDEX "app_reviews_app_id_idx" ON "app_reviews"("app_id");
CREATE INDEX "app_reviews_user_id_idx" ON "app_reviews"("user_id");
CREATE INDEX "app_reviews_rating_idx" ON "app_reviews"("rating");

-- Automation Indexes
CREATE INDEX "automation_workflows_org_id_idx" ON "automation_workflows"("organization_id");
CREATE INDEX "automation_workflows_status_idx" ON "automation_workflows"("status");
CREATE INDEX "automation_workflows_trigger_type_idx" ON "automation_workflows"("trigger_type");
CREATE INDEX "automation_workflows_next_execution_idx" ON "automation_workflows"("next_execution");

CREATE INDEX "workflow_executions_workflow_id_idx" ON "workflow_executions"("workflow_id");
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions"("status");
CREATE INDEX "workflow_executions_started_at_idx" ON "workflow_executions"("started_at");

-- Carbon Footprint Indexes
CREATE INDEX "carbon_footprints_user_id_idx" ON "carbon_footprints"("user_id");
CREATE INDEX "carbon_footprints_trip_id_idx" ON "carbon_footprints"("trip_id");
CREATE INDEX "carbon_footprints_source_idx" ON "carbon_footprints"("source");
CREATE INDEX "carbon_footprints_calculation_date_idx" ON "carbon_footprints"("calculation_date");

CREATE INDEX "carbon_offsets_org_id_idx" ON "carbon_offsets"("organization_id");
CREATE INDEX "carbon_offsets_user_id_idx" ON "carbon_offsets"("user_id");
CREATE INDEX "carbon_offsets_status_idx" ON "carbon_offsets"("status");
CREATE INDEX "carbon_offsets_purchase_date_idx" ON "carbon_offsets"("purchase_date");

-- Analytics Indexes
CREATE INDEX "analytics_models_org_id_idx" ON "analytics_models"("organization_id");
CREATE INDEX "analytics_models_type_idx" ON "analytics_models"("model_type");
CREATE INDEX "analytics_models_status_idx" ON "analytics_models"("status");

CREATE INDEX "predictions_model_id_idx" ON "predictions"("model_id");
CREATE INDEX "predictions_entity_idx" ON "predictions"("entity_type", "entity_id");
CREATE INDEX "predictions_status_idx" ON "predictions"("status");
CREATE INDEX "predictions_created_at_idx" ON "predictions"("created_at");

CREATE INDEX "analytics_reports_org_id_idx" ON "analytics_reports"("organization_id");
CREATE INDEX "analytics_reports_user_id_idx" ON "analytics_reports"("user_id");
CREATE INDEX "analytics_reports_type_idx" ON "analytics_reports"("report_type");
CREATE INDEX "analytics_reports_share_token_idx" ON "analytics_reports"("share_token");