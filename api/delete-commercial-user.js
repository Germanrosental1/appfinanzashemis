// Serverless API to delete commercial users using the service key
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Create Supabase client with service key
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Delete the user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }

    // Try to delete from the users table as well if it exists
    try {
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);
    } catch (tableError) {
      console.log('Could not delete from users table or it did not exist:', tableError);
      // We don't throw an error here because what's important is that it was deleted from Auth
    }

    // Return success
    return res.status(200).json({ success: true, message: 'User successfully deleted' });
  } catch (error) {
    console.error('Error deleting commercial user:', error);
    return res.status(500).json({ error: error.message });
  }
}
