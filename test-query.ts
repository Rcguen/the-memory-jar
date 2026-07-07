import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function test() {
  // Try to find a relationship id
  const { data: member } = await supabase.from("relationship_members").select("*").limit(1).single();
  console.log("member:", member);

  if (member) {
    const { data: members, error } = await supabase
      .from("relationship_members")
      .select("profile_id, display_name, profiles(avatar)")
      .eq("relationship_id", member.relationship_id);
    
    console.log("members:", JSON.stringify(members, null, 2));
    console.log("error:", error);

    const { data: membersInner, error: errorInner } = await supabase
      .from("relationship_members")
      .select("profile_id, display_name, profiles!inner(avatar)")
      .eq("relationship_id", member.relationship_id);
    
    console.log("membersInner:", JSON.stringify(membersInner, null, 2));
    console.log("errorInner:", errorInner);
  }
}

test();
