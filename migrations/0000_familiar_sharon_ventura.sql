CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"organization_id" integer,
	"title" text NOT NULL,
	"date" timestamp NOT NULL,
	"time" text NOT NULL,
	"location_name" text NOT NULL,
	"latitude" text,
	"longitude" text,
	"notes" text,
	"tag" text,
	"assigned_to" text,
	"order" integer NOT NULL,
	"travel_mode" text DEFAULT 'walking',
	"completed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"domain" text NOT NULL,
	"subdomain" text,
	"ssl_certificate" text,
	"dns_verified" boolean DEFAULT false,
	"ssl_verified" boolean DEFAULT false,
	"status" text DEFAULT 'pending',
	"verification_token" text,
	"created_at" timestamp DEFAULT now(),
	"verified_at" timestamp,
	CONSTRAINT "custom_domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"organization_id" integer,
	"invited_by" integer NOT NULL,
	"role" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending',
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"organization_id" integer,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"plan" text DEFAULT 'free',
	"white_label_enabled" boolean DEFAULT false,
	"white_label_plan" text DEFAULT 'none',
	"primary_color" text,
	"secondary_color" text,
	"accent_color" text,
	"logo_url" text,
	"support_email" text,
	"employee_count" integer,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text DEFAULT 'inactive',
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"organization_id" integer,
	"task" text NOT NULL,
	"completed" boolean DEFAULT false,
	"assigned_to" text
);
--> statement-breakpoint
CREATE TABLE "trip_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"invited_by" integer,
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"collaborators" jsonb DEFAULT '[]'::jsonb,
	"is_public" boolean DEFAULT false,
	"share_code" text,
	"sharing_enabled" boolean DEFAULT false,
	"share_permission" text DEFAULT 'read-only',
	"city" text,
	"country" text,
	"location" text,
	"city_latitude" text,
	"city_longitude" text,
	"hotel" text,
	"hotel_latitude" text,
	"hotel_longitude" text,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"trip_type" text DEFAULT 'personal',
	"client_name" text,
	"project_type" text,
	"budget" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "trips_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_id" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"role" text DEFAULT 'user',
	"role_type" text DEFAULT 'corporate',
	"organization_id" integer,
	"company" text,
	"job_title" text,
	"team_size" text,
	"use_case" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "white_label_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"custom_logo" boolean DEFAULT false,
	"custom_colors" boolean DEFAULT false,
	"custom_domain" boolean DEFAULT false,
	"remove_branding" boolean DEFAULT false,
	"custom_email_templates" boolean DEFAULT false,
	"api_access" boolean DEFAULT false,
	"max_users" integer DEFAULT 5,
	"monthly_price" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "white_label_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"request_type" text NOT NULL,
	"request_data" jsonb,
	"status" text DEFAULT 'pending',
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "white_label_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"company_name" text NOT NULL,
	"company_logo" text,
	"tagline" text,
	"primary_color" text DEFAULT '#3B82F6',
	"secondary_color" text DEFAULT '#64748B',
	"accent_color" text DEFAULT '#10B981',
	"custom_domain" text,
	"support_email" text,
	"help_url" text,
	"footer_text" text,
	"status" text DEFAULT 'draft',
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "white_label_requests" ADD CONSTRAINT "white_label_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "white_label_requests" ADD CONSTRAINT "white_label_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "white_label_requests" ADD CONSTRAINT "white_label_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "white_label_settings" ADD CONSTRAINT "white_label_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "white_label_settings" ADD CONSTRAINT "white_label_settings_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;