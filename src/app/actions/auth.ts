"use server";

import { addMinutes, format } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Provider as SupabaseOAuthProvider } from "@supabase/auth-js";

import { ensureUserProfile } from "@/lib/auth";
import { authConfig, getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OAuthProvider, UserProfile } from "@/lib/types";

interface AuthActionState {
  ok: boolean;
  message: string;
}

const signUpSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  fullName: z.string().trim().max(50).optional(),
});

const signInSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

const oauthProviderSchema = z.enum(["google", "kakao", "naver"]);

type OAuthStartProvider = z.infer<typeof oauthProviderSchema>;

async function findUserProfileByEmail(emailLower: string): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("email", emailLower)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UserProfile | null) ?? null;
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

async function bumpLoginFailure(emailLower: string): Promise<void> {
  const profile = await findUserProfileByEmail(emailLower);

  if (!profile) {
    return;
  }

  const attempts = (profile.failed_login_attempts ?? 0) + 1;
  const shouldLock = attempts >= authConfig.maxAttempts;
  const lockedUntil = shouldLock ? addMinutes(new Date(), authConfig.lockMinutes).toISOString() : null;

  const admin = createSupabaseAdminClient();

  await admin
    .from("users")
    .update({
      failed_login_attempts: attempts,
      locked_until: lockedUntil,
    })
    .eq("id", profile.id);
}

async function resetLoginFailure(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  await admin
    .from("users")
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

function getOAuthErrorMessage(provider: OAuthStartProvider): string {
  if (provider === "google") {
    return "Google OAuth URL 생성에 실패했습니다.";
  }

  if (provider === "kakao") {
    return "Kakao OAuth URL 생성에 실패했습니다.";
  }

  return "Naver OAuth URL 생성에 실패했습니다.";
}

function toSupabaseOAuthProvider(provider: OAuthStartProvider): SupabaseOAuthProvider {
  if (provider === "naver") {
    // Supabase native Provider type has no "naver", so use custom OIDC provider id.
    return "custom:naver";
  }

  return provider;
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const payload = {
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    fullName: formData.get("fullName")?.toString() ?? "",
  };

  const parsed = signUpSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName || null,
      },
      emailRedirectTo: `${getEnv("NEXT_PUBLIC_SITE_URL")}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  if (data.user?.id) {
    await ensureUserProfile(data.user.id, parsed.data.email);
  }

  return {
    ok: true,
    message: "가입되었습니다. 이메일 인증 후 로그인해주세요.",
  };
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const payload = {
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  };

  const parsed = signInSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.",
    };
  }

  const emailLower = parsed.data.email.toLowerCase();
  const profile = await findUserProfileByEmail(emailLower);

  if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
    return {
      ok: false,
      message: `로그인 제한 중입니다. ${format(new Date(profile.locked_until), "yyyy-MM-dd HH:mm")} 이후 다시 시도해주세요.`,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailLower,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    await bumpLoginFailure(emailLower);

    return {
      ok: false,
      message: error?.message ?? "로그인에 실패했습니다.",
    };
  }

  await ensureUserProfile(data.user.id, emailLower);
  await resetLoginFailure(data.user.id);
  await registerOAuthAccount({
    userId: data.user.id,
    provider: "email",
    providerUserId: data.user.id,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function startOAuthAction(formData: FormData) {
  const providerRaw = formData.get("provider")?.toString() ?? "";
  const providerParsed = oauthProviderSchema.safeParse(providerRaw);

  if (!providerParsed.success) {
    redirect(`/auth/login?error=${encodeURIComponent("지원하지 않는 OAuth 제공자입니다.")}`);
  }

  const provider = providerParsed.data;
  const supabaseProvider = toSupabaseOAuthProvider(provider);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: supabaseProvider,
    options: {
      redirectTo: `${getEnv("NEXT_PUBLIC_SITE_URL")}/auth/callback?next=/dashboard&oauth_provider=${provider}`,
      queryParams:
        provider === "google"
          ? {
              access_type: "offline",
              prompt: "consent",
            }
          : undefined,
    },
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.url) {
    redirect(
      `/auth/login?error=${encodeURIComponent(getOAuthErrorMessage(provider))}`,
    );
  }

  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/auth/login");
}

export async function syncOAuthAccountAfterCallback(input: {
  userId: string;
  provider: OAuthProvider;
  providerUserId?: string;
}) {
  await registerOAuthAccount(input);
}
