// Serverless API to list commercial users using the service key
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create Supabase client with service key
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get all users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      throw error;
    }

    // Filter only commercial users based on their metadata
    const commercialUsers = users
      .filter(user => user.user_metadata?.role === 'commercial')
      .map(user => ({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || '',
        role: 'commercial',
        created_at: user.created_at
      }));

    // Return the list of commercial users
    return res.status(200).json({ users: commercialUsers });
  } catch (error) {
    console.error('Error listing commercial users:', error);
    return res.status(500).json({ error: error.message });
  }
}
