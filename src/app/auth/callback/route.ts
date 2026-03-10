import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureUserProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OAuthProvider } from "@/lib/types";

const oauthProviderParamSchema = z.enum(["google", "kakao", "naver"]);

function toProvider(value: string | undefined): OAuthProvider {
  if (value === "google" || value === "kakao" || value === "naver") {
    return value;
  }

  // Supabase custom OIDC provider(eg. custom:naver) can appear as "custom".
  if (value === "custom") {
    return "naver";
  }

  return "email";
}

async function registerOAuthAccount(input: {
  userId: string;
  provider: OAuthProvider;
  providerUserId?: string;
}) {
  const admin = createSupabaseAdminClient();
  await admin.from("oauth_accounts").upsert(
    {
      user_id: input.userId,
      provider: input.provider,
      provider_user_id: input.providerUserId ?? input.userId,
      metadata: {},
    },
    { onConflict: "user_id,provider" },
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const oauthProviderParam = requestUrl.searchParams.get("oauth_provider") ?? "";

  const supabase = await createSupabaseServerClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id && user.email) {
    await ensureUserProfile(user.id, user.email);

    const providerFromParam = oauthProviderParamSchema.safeParse(oauthProviderParam);
    const provider = providerFromParam.success
      ? providerFromParam.data
      : toProvider(user.app_metadata?.provider);

    await registerOAuthAccount({
      userId: user.id,
      provider,
      providerUserId: user.user_metadata?.provider_id ?? user.id,
    });
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
