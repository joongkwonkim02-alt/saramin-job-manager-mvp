export const SARAMIN_CAREER_LEVELS = ["신입", "경력", "신입·경력", "인턴"] as const;

export const SARAMIN_EDUCATION_LEVELS = [
  "학력무관",
  "고졸",
  "초대졸",
  "대졸",
  "석사",
  "박사",
] as const;

export const SARAMIN_KEYWORD_OPTIONS = [
  "백엔드",
  "프론트엔드",
  "풀스택",
  "데이터",
  "AI",
  "클라우드",
  "DevOps",
  "회계",
  "세무",
  "재무",
] as const;

export interface SaraminFilterGroup {
  label: string;
  options: string[];
}

export const SARAMIN_LOCATION_GROUPS: SaraminFilterGroup[] = [
  {
    label: "서울",
    options: ["서울 전체", "서울 강남구", "서울 서초구", "서울 영등포구", "서울 구로구", "서울 송파구"],
  },
  {
    label: "경기",
    options: ["경기 전체", "경기 성남시", "경기 수원시", "경기 용인시", "경기 화성시"],
  },
  {
    label: "인천",
    options: ["인천 전체", "인천 연수구", "인천 남동구", "인천 부평구"],
  },
  {
    label: "부산",
    options: ["부산 전체", "부산 해운대구", "부산 부산진구", "부산 사하구"],
  },
];

export interface SaraminJobCategory {
  key: string;
  label: string;
  sections: SaraminFilterGroup[];
}

export const SARAMIN_JOB_CATEGORIES: SaraminJobCategory[] = [
  {
    key: "development",
    label: "개발",
    sections: [
      {
        label: "직무·직업",
        options: [
          "개발 전체",
          "백엔드개발",
          "프론트엔드개발",
          "풀스택개발",
          "웹개발",
          "앱개발",
          "데이터엔지니어",
          "DevOps",
          "QA·테스터",
        ],
      },
      {
        label: "전문분야",
        options: ["Node.js", "Java/Spring", "React", "Vue.js", "Python", "SQL", "AWS", "Docker"],
      },
    ],
  },
  {
    key: "accounting",
    label: "회계·세무·재무",
    sections: [
      {
        label: "직무·직업",
        options: ["회계·세무·재무 전체", "회계사", "경리", "재무", "세무사", "전산회계", "관세사"],
      },
      {
        label: "전문분야",
        options: ["기업회계", "세무회계", "재무기획", "원가회계", "내부감사", "급여(Payroll)"],
      },
    ],
  },
  {
    key: "planning",
    label: "기획·전략",
    sections: [
      {
        label: "직무·직업",
        options: ["서비스기획", "PM", "PO", "사업기획", "전략기획"],
      },
      {
        label: "전문분야",
        options: ["신사업기획", "프로젝트관리", "데이터분석", "시장조사"],
      },
    ],
  },
];
