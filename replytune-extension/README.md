# ReplyTune Chrome Extension

## Project Overview

ReplyTune is an AI-powered Chrome extension designed to assist freelancers and solo professionals in generating quick, consistent, and personalized email replies directly within Gmail. It leverages Supabase for backend services (authentication, database, edge functions) and OpenAI for AI-driven text generation.

## Features

- **Google OAuth Integration:** Seamless sign-in via Google through Supabase Auth.
- **Gmail Sidebar UI:** Injects a user interface directly into Gmail for easy access.
- **AI-Powered Reply Generation:** Generates email responses using OpenAI's GPT models, adaptable to the user's personal tone.
- **Tone Training (Pro Feature):** Allows Pro users to provide text samples to train the AI on their unique writing style.
- **Usage Tracking & Limits:** Monitors reply generation usage with tiered limits (Free vs. Pro).
- **Stripe Integration:** Handles Pro plan subscriptions via Stripe Checkout and webhooks for tier management.

## Tech Stack

- **Frontend:** React with Vite (Chrome Manifest V3 Extension)
- **Backend:** Supabase (Auth, PostgreSQL Database, Edge Functions)
- **AI:** OpenAI GPT-3.5-turbo (Free), GPT-4o (Pro)
- **Payments:** Stripe Checkout & Webhooks

## Setup and Deployment

Follow these steps to set up and deploy the ReplyTune Chrome Extension.

### 1. Environment Variables

Create a `.env` file in the root of the `replytune-extension` directory based on the `.env.example` file:

```
cp .env.example .env
```

Fill in the placeholder values in your newly created `.env` file. Note that some variables are for client-side use (prefixed with `VITE_`), while others are for Supabase Edge Functions and should be set as Supabase Secrets.

### 2. Supabase Backend Setup

#### a. Create Supabase Project

1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Note your **Project URL** and **Anon Key** from "Project Settings" > "API".

#### b. Database Schema

1. In your Supabase project dashboard, navigate to the "SQL Editor".
2. Open the `schema.sql` file located in the root of this project (`replytune-extension/schema.sql`).
3. Copy the SQL content and paste it into the Supabase SQL Editor. Run the queries to create the necessary tables (`users`, `tone_samples`, `usage_logs`).

#### c. Deploy Edge Functions

1. **Install Supabase CLI:** If you haven't already, install the Supabase CLI globally:
   ```bash
   npm install -g supabase
   ```
2. **Login to Supabase CLI:**
   ```bash
   supabase login
   ```
3. **Link your local project to Supabase:** Navigate to the `replytune-extension` directory in your terminal and link it to your Supabase project:
   ```bash
   supabase link --project-ref YOUR_SUPABASE_PROJECT_ID
   ```
   (You can find your project ID in your Supabase dashboard URL or settings.)
4. **Deploy Functions:** Deploy the `generate-reply`, `create-checkout-session`, and `stripe-webhook` Edge Functions:
   ```bash
   supabase functions deploy --project-ref YOUR_SUPABASE_PROJECT_ID
   ```

#### d. Set Supabase Secrets

For your Edge Functions to work correctly, you need to set the following secrets in your Supabase project:

1. In your Supabase dashboard, go to "Edge Functions" > "Secrets".
2. Add the following secrets, using the values from your `.env` file:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Found in "Project Settings" > "API Keys" in Supabase)
   - `OPENAI_API_KEY`
   - `STRIPE_API_KEY`
   - `STRIPE_WEBHOOK_SIGNING_SECRET`

### 3. Stripe Configuration

1. **Create a Stripe Account:** If you don't have one, sign up at [Stripe](https://stripe.com/).
2. **Create a Product:**
   - Go to the Stripe Dashboard > "Products" > "Add product".
   - Create a product named "ReplyTune Pro" with a recurring price of $15/month.
3. **Get API Keys:** Navigate to "Developers" > "API keys" to find your **Secret key** (for `STRIPE_API_KEY` secret in Supabase) and **Publishable key** (not directly used in this setup, but good to know).
4. **Configure Webhook:**
   - Go to "Developers" > "Webhooks" > "Add endpoint".
   - Set the Endpoint URL to your deployed Supabase `stripe-webhook` function URL (e.g., `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`).
   - Select `checkout.session.completed` as the event to listen for.
   - After creation, reveal and copy the **Signing secret** for this webhook. This will be your `STRIPE_WEBHOOK_SIGNING_SECRET` secret in Supabase.

### 4. Load Chrome Extension

1. **Build the Extension:** Navigate to the `replytune-extension` directory in your terminal and run:
   ```bash
   npm install
   npm run build
   ```
   This will create a `dist` folder containing the build files.
2. **Open Chrome Extensions:** In your Chrome browser, go to `chrome://extensions`.
3. **Enable Developer Mode:** Toggle on "Developer mode" in the top right corner.
4. **Load Unpacked:** Click on "Load unpacked" and select the `dist` folder generated in step 1.

The ReplyTune extension should now appear in your Chrome extensions list and be active.

## Development

### Running Locally

To run the development server (for frontend changes):

```bash
cd replytune-extension
npm install
npm run dev
```

### Testing

To run the tests:

```bash
npm test
```

## Documentation

- **Development Progress Log:** See `progress.md` for a detailed log of development steps and changes.