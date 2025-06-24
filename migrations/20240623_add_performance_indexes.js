'use strict';

exports.up = async function(db) {
  // Add indexes for common query patterns
  await db.addIndex('trips', 'trips_organization_status_idx', ['organization_id', 'status']);
  await db.addIndex('trips', 'trips_start_date_idx', ['start_date']);
  await db.addIndex('trips', 'trips_end_date_idx', ['end_date']);
  
  await db.addIndex('activities', 'activities_trip_id_idx', ['trip_id']);
  await db.addIndex('activities', 'activities_start_time_idx', ['start_time']);
  
  await db.addIndex('card_transactions', 'card_transactions_org_date_idx', 
    ['organization_id', 'transaction_date']);
  await db.addIndex('card_transactions', 'card_transactions_card_id_idx', ['corporate_card_id']);
  
  await db.addIndex('trip_collaborators', 'trip_collaborators_user_id_idx', ['user_id']);
  await db.addIndex('trip_collaborators', 'trip_collaborators_trip_id_idx', ['trip_id']);
  
  // Add GIN index for JSONB fields that are frequently queried
  await db.runSql(`
    CREATE INDEX IF NOT EXISTS users_metadata_gin_idx ON users USING GIN (metadata);
    CREATE INDEX IF NOT EXISTS organizations_settings_gin_idx ON organizations USING GIN (settings);
  `);
};

exports.down = async function(db) {
  await db.removeIndex('trips', 'trips_organization_status_idx');
  await db.removeIndex('trips', 'trips_start_date_idx');
  await db.removeIndex('trips', 'trips_end_date_idx');
  
  await db.removeIndex('activities', 'activities_trip_id_idx');
  await db.removeIndex('activities', 'activities_start_time_idx');
  
  await db.removeIndex('card_transactions', 'card_transactions_org_date_idx');
  await db.removeIndex('card_transactions', 'card_transactions_card_id_idx');
  
  await db.removeIndex('trip_collaborators', 'trip_collaborators_user_id_idx');
  await db.removeIndex('trip_collaborators', 'trip_collaborators_trip_id_idx');
  
  await db.runSql(`
    DROP INDEX IF EXISTS users_metadata_gin_idx;
    DROP INDEX IF EXISTS organizations_settings_gin_idx;
  `);
};
