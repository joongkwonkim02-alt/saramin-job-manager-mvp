"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction, startOAuthAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";

interface LoginFormProps {
  errorMessage?: string;
}

function OAuthButton({ provider, label }: { provider: "google" | "kakao" | "naver"; label: string }) {
  return (
    <form action={startOAuthAction}>
      <input type="hidden" name="provider" value={provider} />
      <PendingButton variant="outline" className="w-full" pendingLabel="이동 중...">
        {label}
      </PendingButton>
    </form>
  );
}

export function LoginForm({ errorMessage }: LoginFormProps) {
  const [state, formAction] = useActionState(signInAction, {
    ok: false,
    message: "",
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>
          이메일/비밀번호 또는 Google, Kakao, Naver OAuth 로그인으로 시작하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <PendingButton className="w-full" pendingLabel="로그인 중...">
            로그인
          </PendingButton>
        </form>

        <div className="space-y-2">
          <OAuthButton provider="google" label="Google로 로그인" />
          <OAuthButton provider="kakao" label="Kakao로 로그인" />
          <OAuthButton provider="naver" label="Naver로 로그인" />
        </div>

        {state.message ? (
          <p className={`text-sm ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.message}</p>
        ) : null}

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <p className="text-sm text-slate-600">
          계정이 없나요?{" "}
          <Link className="font-semibold text-slate-900 underline" href="/auth/signup">
            회원가입
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
