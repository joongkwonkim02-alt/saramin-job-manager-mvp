import { addDays, format } from "date-fns";

import type { JobCollectionAdapter, CollectedJob } from "@/lib/adapters/types";
import type { FilterPreset } from "@/lib/types";

const BASE_JOBS: CollectedJob[] = [
  {
    sourceName: "saramin",
    sourceUrl: "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=9001",
    sourceJobId: "9001",
    title: "백엔드 엔지니어",
    companyName: "알파데이터",
    location: "서울 강남구",
    locationTags: ["서울 전체", "서울 강남구"],
    roleTags: ["개발", "개발 전체", "백엔드개발", "웹개발", "Java/Spring"],
    careerLevel: "경력",
    educationLevel: "대졸",
    employeeCount: 320,
    industry: "IT 서비스",
    companyType: "중견기업",
    averageSalary: 5600,
    startingSalary: 4200,
    salaryText: "면접 후 결정",
    deadline: format(addDays(new Date(), 25), "yyyy-MM-dd"),
    rawPayload: { channel: "mock", segment: "backend" },
  },
  {
    sourceName: "saramin",
    sourceUrl: "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=9002",
    sourceJobId: "9002",
    title: "풀스택 개발자",
    companyName: "베타커머스",
    location: "서울 송파구",
    locationTags: ["서울 전체", "서울 송파구"],
    roleTags: ["개발", "개발 전체", "풀스택개발", "웹개발", "Node.js", "React"],
    careerLevel: "신입",
    educationLevel: "대졸",
    employeeCount: 120,
    industry: "이커머스",
    companyType: "스타트업",
    averageSalary: 5100,
    startingSalary: 3900,
    salaryText: "연봉 4,000~5,500만원",
    deadline: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    rawPayload: { channel: "mock", segment: "fullstack" },
  },
  {
    sourceName: "saramin",
    sourceUrl: "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=9003",
    sourceJobId: "9003",
    title: "프론트엔드 개발자",
    companyName: "감마랩스",
    location: "경기 성남시",
    locationTags: ["경기 전체", "경기 성남시"],
    roleTags: ["개발", "개발 전체", "프론트엔드개발", "웹개발", "React", "Vue.js"],
    careerLevel: "신입",
    educationLevel: "대졸",
    employeeCount: 87,
    industry: "B2B SaaS",
    companyType: "벤처기업",
    averageSalary: 4800,
    startingSalary: 3600,
    salaryText: "회사 내규",
    deadline: format(addDays(new Date(), 8), "yyyy-MM-dd"),
    rawPayload: { channel: "mock", segment: "frontend" },
  },
  {
    sourceName: "saramin",
    sourceUrl: "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=9004",
    sourceJobId: "9004",
    title: "데이터 엔지니어",
    companyName: "알파데이터",
    location: "서울 강남구",
    locationTags: ["서울 전체", "서울 강남구"],
    roleTags: ["개발", "개발 전체", "데이터", "데이터엔지니어", "Python", "SQL"],
    careerLevel: "경력",
    educationLevel: "대졸",
    employeeCount: 320,
    industry: "IT 서비스",
    companyType: "중견기업",
    averageSalary: 5900,
    startingSalary: 4300,
    salaryText: "면접 후 결정",
    deadline: format(addDays(new Date(), -1), "yyyy-MM-dd"),
    rawPayload: { channel: "mock", segment: "data" },
  },
  {
    sourceName: "saramin",
    sourceUrl: "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=9005",
    sourceJobId: "9005",
    title: "주니어 백엔드 개발자",
    companyName: "델타핀테크",
    location: "서울 영등포구",
    locationTags: ["서울 전체", "서울 영등포구"],
    roleTags: ["개발", "개발 전체", "백엔드개발", "웹개발", "Node.js"],
    careerLevel: "신입",
    educationLevel: "초대졸",
    employeeCount: 55,
    industry: "핀테크",
    companyType: "스타트업",
    averageSalary: null,
    startingSalary: null,
    salaryText: "연봉 3,800만원 이상",
    deadline: format(addDays(new Date(), 12), "yyyy-MM-dd"),
    rawPayload: { channel: "mock", segment: "backend" },
  },
  {
    sourceName: "saramin",
    sourceUrl: "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=9006",
    sourceJobId: "9006",
    title: "웹 애플리케이션 엔지니어",
    companyName: "오메가플랫폼",
    location: "부산 해운대구",
    locationTags: ["부산 전체", "부산 해운대구"],
    roleTags: ["개발", "개발 전체", "웹개발", "풀스택개발", "Java/Spring"],
    careerLevel: "경력",
    educationLevel: "학력무관",
    employeeCount: 210,
    industry: "플랫폼",
    companyType: "중견기업",
    averageSalary: 5300,
    startingSalary: 4000,
    salaryText: "연봉 4,500만원 이상",
    deadline: format(addDays(new Date(), 18), "yyyy-MM-dd"),
    rawPayload: { channel: "mock", segment: "web" },
  },
];

function includesAny(text: string, tokens: string[]): boolean {
  if (!tokens.length) {
    return true;
  }

  const target = text.toLowerCase();
  return tokens.some((token) => target.includes(token.toLowerCase()));
}

function overlaps(source: string[], target: string[]): boolean {
  if (!target.length) {
    return true;
  }

  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, "");

  const sourceSet = new Set(source.map(normalize));
  return target.some((value) => sourceSet.has(normalize(value)));
}

function matchByPreset(job: CollectedJob, preset: FilterPreset): boolean {
  const keywordSource = `${job.title} ${job.companyName} ${job.industry ?? ""}`;

  const keywordMatched = includesAny(keywordSource, preset.search_keywords);
  const roleMatched = overlaps(job.roleTags, preset.job_roles);
  const locationMatched = overlaps(job.locationTags, preset.locations);
  const careerMatched =
    !preset.career_levels.length ||
    preset.career_levels.some((value) => value.toLowerCase() === job.careerLevel.toLowerCase());
  const educationMatched =
    !preset.education_levels.length ||
    preset.education_levels.some(
      (value) => value.toLowerCase() === job.educationLevel.toLowerCase(),
    );

  return keywordMatched && roleMatched && locationMatched && careerMatched && educationMatched;
}

export const mockSaraminAdapter: JobCollectionAdapter = {
  name: "mock-saramin",
  async collect(preset) {
    const filtered = BASE_JOBS.filter((job) => matchByPreset(job, preset));
    return filtered;
  },
};
