export interface MatchedExternalLink {
  source: "jobplanet" | "blind";
  url: string;
  rating: number | null;
}

const MOCK_COMPANY_LINKS: Record<string, MatchedExternalLink[]> = {
  alphadata: [
    {
      source: "jobplanet",
      url: "https://www.jobplanet.co.kr/companies/alpha",
      rating: 3.8,
    },
    {
      source: "blind",
      url: "https://www.teamblind.com/kr/company/alpha",
      rating: 3.6,
    },
  ],
  betacommerce: [
    {
      source: "jobplanet",
      url: "https://www.jobplanet.co.kr/companies/beta",
      rating: 3.5,
    },
    {
      source: "blind",
      url: "https://www.teamblind.com/kr/company/beta",
      rating: 3.2,
    },
  ],
  gamelabs: [
    {
      source: "jobplanet",
      url: "https://www.jobplanet.co.kr/companies/gamelabs",
      rating: 3.4,
    },
  ],
};

export function matchExternalLinks(normalizedName: string): MatchedExternalLink[] {
  return MOCK_COMPANY_LINKS[normalizedName] ?? [];
}
