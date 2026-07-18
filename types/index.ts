export interface User {
  _id: string;
  email: string;
  role?: 'founder' | 'investor';
  name?: string;
  createdAt: Date;
}

export interface Founder {
  _id: string;
  userId?: string;
  githubUsername?: string; // used for deduplication on outbound sourcing
  name: string;
  company: string;
  source: 'inbound' | 'outbound';
  channel?: string;
  rawSignals?: RawSignal[];
  structuredProfile?: StructuredProfile;
  founderScore: {
    value: number;
    history: Array<{
      value: number;
      timestamp: Date;
      reason: string;
    }>;
  };
  createdAt: Date;
}

export interface RawSignal {
  type: string;   // e.g. 'github_repo', 'github_profile'
  source: string; // e.g. 'github'
  data: Record<string, any>;
  capturedAt: Date;
}

export interface StructuredProfile {
  oneLiner?: string;
  description?: string;
  sectors?: string[];
  stage?: string;
  location?: string;
  teamSize?: number;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  twitterUsername?: string;
  avatarUrl?: string;
  followers?: number;
  publicRepos?: number;
  githubCreatedAt?: string;
  topRepos?: Array<{
    name: string;
    description: string | null;
    stars: number;
    language: string | null;
    url: string;
  }>;
  /** True when the profile is sparse (no bio, no company, <20 followers). Never discarded — flagged for manual review. */
  coldStart?: boolean;
  /** Legacy alias kept for backwards compat */
  coldStartScoredPath?: boolean;
  [key: string]: any;
}

/** Thesis object used as input to the sourcing agent */
export interface Thesis {
  keywords: string[];
  minStars?: number;
  createdAfter?: string; // ISO date, e.g. "2023-01-01"
}

export interface Application {
  _id: string;
  founderId: string;
  deck?: string; // URL to deck
  companyInfo: {
    name: string;
    website?: string;
    description: string;
    [key: string]: any;
  };
  status: 'sourced' | 'screening' | 'diligence' | 'decided';
  createdAt: Date;
}

export interface AxisScore {
  score: number;
  trend: 'improving' | 'declining' | 'stable';
  evidence: string;
}

export interface Screening {
  _id: string;
  applicationId: string;
  founderAxis: AxisScore;
  marketAxis: AxisScore;
  ideaVsMarketAxis: AxisScore;
  createdAt: Date;
}

export interface TrustClaim {
  _id: string;
  applicationId: string;
  claim: string;
  evidenceUrl?: string;
  confidence: number; // 0 to 100 or similar
  verifiedBy: 'tavily' | 'unverified';
  createdAt: Date;
}

export interface Memo {
  _id: string;
  applicationId: string;
  companySnapshot: string;
  investmentHypotheses: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  problemProduct: string;
  tractionKpis: string;
  gapsFlagged: string[];
  createdAt: Date;
}

export interface PipelineRun {
  _id: string;
  applicationId?: string; // undefined for sourcing runs (no single application yet)
  founderId?: string;     // set for per-founder sub-runs
  stage: 'sourcing' | 'screening' | 'diligence' | 'decision';
  status: 'pending' | 'running' | 'done' | 'error';
  log: Array<{
    timestamp: Date;
    message: string;
    level: 'info' | 'warn' | 'error';
  }>;
  thesis?: any; // stored for auditability
  createdAt: Date;
  updatedAt?: Date;
}
