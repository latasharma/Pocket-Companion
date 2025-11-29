/**
 * Simple Script to Create Apple Test User
 * Run: node create-apple-user-simple.js
 */

const https = require('https');

// You'll be prompted to enter these
const SUPABASE_URL = 'https://auth.hellopoco.app'; // e.g., https://xxxxx.supabase.co
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmdna21ib2Nvc3hjeGhud3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MzM0NiwiZXhwIjoyMDY4MzQ5MzQ2fQ.6UpmnviwtmfiO3T-8DpspQDGGTL5Y_ug6cyQsYLY80c'; // Get from Supabase Dashboard → Settings → API

// Test user details
const TEST_USER = {
  email: 'lata1.sharma@gmail',
  password: 'Lata4321$',
  email_confirm: true
};

async function createUser() {
  // Validate inputs
  if (SUPABASE_URL === 'https://auth.hellopoco.app' || SERVICE_ROLE_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmdna21ib2Nvc3hjeGhud3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MzM0NiwiZXhwIjoyMDY4MzQ5MzQ2fQ.6UpmnviwtmfiO3T-8DpspQDGGTL5Y_ug6cyQsYLY80c') {
    console.error('\n❌ ERROR: Please edit this file and add your Supabase credentials!');
    console.error('\n1. Open: create-apple-user-simple.js');
    console.error('2. Replace YOUR_SUPABASE_URL with your Supabase project URL');
    console.error('3. Replace YOUR_SERVICE_ROLE_KEY with your service role key');
    console.error('   (Get it from: Supabase Dashboard → Settings → API)\n');
    process.exit(1);
  }

  const url = new URL('/auth/v1/admin/users', SUPABASE_URL);
  
  const postData = JSON.stringify(TEST_USER);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY
    }
  };

  console.log('🚀 Creating Apple test user...\n');
  console.log('Email:', TEST_USER.email);
  console.log('Password:', TEST_USER.password);
  console.log('');

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const user = JSON.parse(data);
          console.log('✅ SUCCESS! User created:\n');
          console.log('User ID:', user.id);
          console.log('Email:', user.email);
          console.log('Created:', user.created_at);
          console.log('\n══════════════════════════════════');
          console.log('Apple Test Account Ready!');
          console.log('══════════════════════════════════');
          console.log('Email: lata1.sharma@gmail');
          console.log('Password: Lata4321$');
          console.log('══════════════════════════════════\n');
          resolve(user);
        } else {
          console.error('❌ Error creating user:');
          console.error('Status:', res.statusCode);
          console.error('Response:', data);
          
          if (data.includes('already registered') || data.includes('already exists')) {
            console.log('\n💡 User already exists! You can sign in with:');
            console.log('Email: lata1.sharma@gmail');
            console.log('Password: Lata4321$');
            console.log('\nIf password is wrong, use the password reset flow.\n');
          }
          reject(new Error(data));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

createUser().catch(err => {
  console.error('\n❌ Failed to create user');
  process.exit(1);
});

