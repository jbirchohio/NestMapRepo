# NestMap Troubleshooting Guide

This guide provides solutions for common issues you might encounter when setting up or using NestMap.

## Database Connection Issues

### Missing Column Errors

If you see errors like `column "X" does not exist`, it means your database schema doesn't match what the application expects. To fix this:

1. Check the current database schema:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'table_name';
   ```

2. Compare with the expected schema in `schema/schema.sql`

3. Add any missing columns:
   ```sql
   ALTER TABLE table_name
     ADD COLUMN IF NOT EXISTS column_name DATA_TYPE DEFAULT value;
   ```

### Connection Refused

If you see connection errors like `ECONNREFUSED`:

1. Verify your DATABASE_URL is correct in the `.env` file
2. Make sure your database server is running
3. Check network settings to ensure the database port is accessible

## Authentication Issues

### "Error loading user" Messages

If you see "Error loading user" in the console:

1. Check that your Supabase credentials are correct in `.env`
2. Verify that email authentication is enabled in your Supabase project
3. Check for CORS issues if your frontend and backend are on different domains

## Map Display Issues

If the map doesn't display properly:

1. Verify your Mapbox token in `.env`
2. Check browser console for any JavaScript errors
3. Make sure the token has the correct scopes enabled

## AI Features Not Working

If AI-powered features aren't working:

1. Check that your OpenAI API key is valid
2. Verify you have sufficient credits in your OpenAI account
3. Look for rate limiting messages in the server logs

## Performance Issues

If the application feels slow:

1. Check your database query performance
2. Consider adding indexes for frequently queried fields
3. Look for N+1 query patterns in the code

## Application Won't Start

If the application doesn't start:

1. Check if all required environment variables are set
2. Make sure all dependencies are installed: `npm install`
3. Check logs for syntax errors or other issues

## Mobile UI Issues

If the UI doesn't look right on mobile:

1. Test with different mobile devices and browsers
2. Check for responsive design issues in the CSS
3. Look for hardcoded pixel values instead of responsive units