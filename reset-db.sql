-- Reset database script
-- This will drop all tables and start fresh

-- Drop all tables in the correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS card_transactions CASCADE;
DROP TABLE IF EXISTS corporate_cards CASCADE;
DROP TABLE IF EXISTS cardholders CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS custom_domains CASCADE;
DROP TABLE IF EXISTS spend_policies CASCADE;
DROP TABLE IF EXISTS expense_approvals CASCADE;
DROP TABLE IF EXISTS reimbursements CASCADE;
DROP TABLE IF EXISTS white_label_settings CASCADE;
DROP TABLE IF EXISTS white_label_requests CASCADE;
DROP TABLE IF EXISTS white_label_features CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS password_history CASCADE;
DROP TABLE IF EXISTS trip_travelers CASCADE;
DROP TABLE IF EXISTS trip_collaborators CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS todos CASCADE;
DROP TABLE IF EXISTS approval_requests CASCADE;
DROP TABLE IF EXISTS approval_rules CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organization_roles CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS calendar_integrations CASCADE;
DROP TABLE IF EXISTS trip_comments CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;

-- Drop all enums
DROP TYPE IF EXISTS card_transaction_type CASCADE;
DROP TYPE IF EXISTS card_transaction_status CASCADE;
DROP TYPE IF EXISTS corporate_card_type CASCADE;
DROP TYPE IF EXISTS corporate_card_status CASCADE;
DROP TYPE IF EXISTS expense_status CASCADE;
DROP TYPE IF EXISTS budget_period CASCADE;
DROP TYPE IF EXISTS domain_status CASCADE;
DROP TYPE IF EXISTS policy_type CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS reimbursement_status CASCADE;
DROP TYPE IF EXISTS white_label_request_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS organization_plan CASCADE;
DROP TYPE IF EXISTS trip_status CASCADE;
DROP TYPE IF EXISTS trip_collaborator_role CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS audit_log_action CASCADE;
DROP TYPE IF EXISTS activity_type CASCADE;
DROP TYPE IF EXISTS activity_status CASCADE;
DROP TYPE IF EXISTS approval_request_type CASCADE;
DROP TYPE IF EXISTS approval_priority CASCADE;
DROP TYPE IF EXISTS invitation_status CASCADE;
DROP TYPE IF EXISTS member_role CASCADE;

-- Reset sequences if any exist
-- This ensures clean slate for auto-incrementing fields
