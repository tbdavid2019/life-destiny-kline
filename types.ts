
export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
}

export interface UserInput {
  name?: string;
  gender: Gender;
  birthYear: string;   // 出生年份 (如 1990)
  yearPillar: string;  // 年柱
  monthPillar: string; // 月柱
  dayPillar: string;   // 日柱
  hourPillar: string;  // 時柱
  startAge: string;    // 起運年齡 (虛歲) - Changed to string to handle input field state easily, parse later
  firstDaYun: string;  // 第一步大運干支
  
  // New API Configuration Fields
  modelName: string;   // 使用的模型名稱
  apiBaseUrl: string;
  apiKey: string;
}

export interface KLinePoint {
  age: number;
  year: number;
  ganZhi: string; // 當年的流年干支 (如：甲辰)
  daYun?: string; // 當前所在的大運（如：甲子大運），用於圖表標記
  open: number;
  close: number;
  high: number;
  low: number;
  score: number;
  reason: string; // 這裏現在需要存儲詳細的流年描述
}

export interface AnalysisData {
  bazi: string[]; // [Year, Month, Day, Hour] pillars
  summary: string;
  summaryScore: number; // 0-10
  
  personality: string;      // 性格分析
  personalityScore: number; // 0-10
  
  industry: string;
  industryScore: number; // 0-10

  fengShui: string;       // 發展風水 (New)
  fengShuiScore: number;  // 0-10 (New)
  
  wealth: string;
  wealthScore: number; // 0-10
  
  marriage: string;
  marriageScore: number; // 0-10
  
  health: string;
  healthScore: number; // 0-10
  
  family: string;
  familyScore: number; // 0-10

  // Crypto / Web3 Specifics
  crypto: string;       // 幣圈交易分析
  cryptoScore: number;  // 投機運勢評分
  cryptoYear: string;   // 暴富流年 (e.g., 2025 乙巳)
  cryptoStyle: string;  // 適合流派 (現貨/合約/鏈上Alpha)
}

export interface LifeDestinyResult {
  chartData: KLinePoint[];
  analysis: AnalysisData;
}
