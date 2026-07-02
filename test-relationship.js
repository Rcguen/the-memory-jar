require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Simulate the logic in saveMemory
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, ""),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  // We need to authenticate as phu first. But wait, I don't know Phu's password from here.
  // Instead of auth, I can just use the ANON key to query `relationship_members` filtering by profile_id if I know it.
  // Or better, I can authenticate with password if I know it. The user ran `curl` with `password=password`. Let's try that.
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'phu.nt2710@gmail.com',
    password: 'password'
  });
  
  if (authError) {
    console.error("Auth failed:", authError);
    return;
  }
  
  console.log("Authenticated as:", authData.user.id);
  
  const { data: memberData, error: memberError } = await supabase
    .from("relationship_members")
    .select("relationship_id")
    .eq("profile_id", authData.user.id)
    .single();
    
  console.log("Member query result:", { memberData, memberError });
}

test();
