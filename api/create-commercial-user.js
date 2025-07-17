// API to create commercial users
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with anonymous key
// We use the anonymous key because we're using signUp which works with normal permissions
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Configure CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, password } = req.body;

    // Validate data
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Generate random password if not provided
    const userPassword = password || generateRandomPassword();

    // Create user in Supabase Auth using signUp instead of admin.createUser
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password: userPassword,
      options: {
        data: {
          name,
          role: 'commercial',
        }
      }
    });

    if (authError) {
      console.error('Error creating user in Auth:', authError);
      return res.status(400).json({ error: authError.message });
    }
    
    // Verify that the user was created correctly
    if (!authUser || !authUser.user) {
      return res.status(500).json({ error: 'Could not create user in Auth' });
    }
    
    // Build a user object with the available information
    const userData = {
      id: authUser.user.id,
      email: email,
      name: name,
      role: 'commercial',
      created_at: new Date().toISOString(),
    };

    // Return success
    return res.status(200).json({ 
      success: true, 
      user: userData,
      password: userPassword
    });
  } catch (error) {
    console.error('Error creating commercial user:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// Function to generate random password
function generateRandomPassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}
