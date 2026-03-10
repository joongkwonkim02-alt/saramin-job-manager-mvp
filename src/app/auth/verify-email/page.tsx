import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>이메일 인증 필요</CardTitle>
          <CardDescription>회원가입 시 입력한 메일함에서 인증 링크를 클릭해주세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>인증 완료 후 로그인 페이지에서 로그인하면 대시보드로 이동합니다.</p>
          <Link className="font-semibold text-slate-900 underline" href="/auth/login">
            로그인 페이지로 이동
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
