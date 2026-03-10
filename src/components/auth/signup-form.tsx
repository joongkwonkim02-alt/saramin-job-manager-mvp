"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";

export function SignupForm() {
  const [state, formAction] = useActionState(signUpAction, {
    ok: false,
    message: "",
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>회원가입</CardTitle>
        <CardDescription>인증 메일을 받은 뒤 로그인할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="fullName">이름(선택)</Label>
            <Input id="fullName" name="fullName" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" name="password" type="password" required autoComplete="new-password" />
          </div>
          <PendingButton className="w-full" pendingLabel="가입 중...">
            가입하기
          </PendingButton>
        </form>

        {state.message ? (
          <p className={`text-sm ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.message}</p>
        ) : null}

        {state.ok ? (
          <Link className="text-sm font-semibold text-slate-900 underline dark:text-slate-100" href="/auth/verify-email">
            인증 안내 페이지로 이동
          </Link>
        ) : null}

        <p className="text-sm text-slate-600 dark:text-slate-300">
          이미 계정이 있나요?{" "}
          <Link className="font-semibold text-slate-900 underline dark:text-slate-100" href="/auth/login">
            로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
