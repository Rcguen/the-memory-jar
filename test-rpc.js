/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const { data, error } = await supabase.rpc("get_email_by_username", {
    lookup_username: "phu",
  });
  
  console.log("RPC Data:", data);
  console.log("RPC Error:", error);
}

test();
