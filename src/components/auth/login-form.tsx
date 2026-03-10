"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";

interface LoginFormProps {
  errorMessage?: string;
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
        <CardDescription>이메일/비밀번호 로그인만 지원합니다.</CardDescription>
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

        {state.message ? (
          <p className={`text-sm ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.message}</p>
        ) : null}

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <p className="text-sm text-slate-600 dark:text-slate-300">
          계정이 없나요?{" "}
          <Link className="font-semibold text-slate-900 underline dark:text-slate-100" href="/auth/signup">
            회원가입
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
