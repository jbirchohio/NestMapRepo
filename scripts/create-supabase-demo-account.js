import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createDemoAccount() {
  try {
    console.log('Creating demo superadmin account in Supabase...');
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'demo@nestmap.com',
      password: 'password',
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('Demo account already exists in Supabase Auth');
        
        // Get existing user
        const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();
        if (getUserError) {
          throw getUserError;
        }
        
        const existingUser = users.users.find(user => user.email === 'demo@nestmap.com');
        if (!existingUser) {
          throw new Error('Could not find existing demo user');
        }
        
        console.log('Found existing demo user:', existingUser.id);
        
        // Check if user exists in database
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', existingUser.id)
          .single();
          
        if (dbError && dbError.code !== 'PGRST116') {
          throw dbError;
        }
        
        if (!dbUser) {
          // Create database user record
          const { data: newDbUser, error: insertError } = await supabase
            .from('users')
            .insert({
              auth_id: existingUser.id,
              email: 'demo@nestmap.com',
              username: 'Demo Admin',
              role: 'superadmin',
              organization_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (insertError) {
            throw insertError;
          }
          
          console.log('Created database user record:', newDbUser.id);
        } else {
          // Update existing user to superadmin
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              role: 'superadmin',
              updated_at: new Date().toISOString()
            })
            .eq('id', dbUser.id);
            
          if (updateError) {
            throw updateError;
          }
          
          console.log('Updated existing user to superadmin role');
        }
        
        return;
      } else {
        throw authError;
      }
    }

    console.log('Created Supabase Auth user:', authData.user.id);

    // Create corresponding database user record
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .insert({
        auth_id: authData.user.id,
        email: 'demo@nestmap.com',
        username: 'Demo Admin',
        role: 'superadmin',
        organization_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    console.log('Created database user record:', dbUser.id);
    console.log('Demo superadmin account created successfully!');
    console.log('Login credentials:');
    console.log('Email: demo@nestmap.com');
    console.log('Password: password');

  } catch (error) {
    console.error('Error creating demo account:', error);
    process.exit(1);
  }
}

createDemoAccount();