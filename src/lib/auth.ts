import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  await ensureUserProfile(user.id, user.email ?? "");

  return user;
}

export async function ensureUserProfile(userId: string, email: string) {
  const admin = createSupabaseAdminClient();

  await admin.from("users").upsert(
    {
      id: userId,
      email: email.toLowerCase(),
    },
    { onConflict: "id" },
  );
}
