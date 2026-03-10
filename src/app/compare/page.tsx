import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { listComparisonSets } from "@/lib/services/repository";

export default async function ComparePage() {
  const user = await requireUser();
  const sets = await listComparisonSets(user.id);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">기업 비교 (스캐폴딩)</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            비교 데이터 구조는 준비되어 있으며, 실제 비교 리포트 렌더링은 2차 단계에서 확장합니다.
          </p>
          <Link className="text-sm font-semibold underline dark:text-slate-100" href="/dashboard?status=approved">
            승인함으로 돌아가기
          </Link>
        </header>

        {sets.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {sets.map((set) => (
              <Card key={set.id}>
                <CardHeader>
                  <CardTitle>{set.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {set.items.length ? (
                    set.items.map((item) => (
                      <div key={item.id} className="rounded border p-2">
                        <p className="font-medium">{item.company?.display_name ?? "-"}</p>
                        <p className="text-slate-600 dark:text-slate-300">position: {item.position}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-600 dark:text-slate-300">아직 회사가 추가되지 않았습니다.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-slate-600 dark:text-slate-300">
              등록된 비교 세트가 없습니다. 기업 분석 페이지의 Compare 탭에서 회사를 추가해주세요.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
