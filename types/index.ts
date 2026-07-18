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
  name: string;
  company: string;
  source: 'inbound' | 'outbound';
  channel?: string;
  rawSignals?: any[];
  structuredProfile?: {
    oneLiner?: string;
    description?: string;
    sectors?: string[];
    stage?: string;
    location?: string;
    teamSize?: number;
    githubUrl?: string;
    linkedinUrl?: string;
    websiteUrl?: string;
    coldStartScoredPath?: boolean;
    [key: string]: any;
  };
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
  applicationId: string;
  stage: 'sourcing' | 'screening' | 'diligence' | 'decision';
  status: 'pending' | 'running' | 'done' | 'error';
  log: Array<{
    timestamp: Date;
    message: string;
    level: 'info' | 'warn' | 'error';
  }>;
  createdAt: Date;
}
