// 全局类型定义

// ==================== 面试人格类型 ====================
export type PersonaType = 'A' | 'B' | 'C' | 'D' | 'E';

// 人格配置
export interface PersonaConfig {
  id: PersonaType;
  name: string;
  description: string;
  suitableFor: string[];
  characteristics: string[];
}

// 陪伴上下文
export interface CompanionContext {
  userName?: string;
  currentMood?: string;
  focusTopics?: string[];
}

// ==================== 紧张检测类型 ====================
export type TensionSignalType = 'pause' | 'speed' | 'filler' | 'length';

// 保持向后兼容
export type TensionType = TensionSignalType;

export interface TensionSignal {
  type: TensionSignalType;
  score: number;
  value: number;
  threshold: number;
  message: string;
}

// 紧张等级类型
export type TensionLevel = 'A' | 'B' | 'C' | 'D' | 'E';

export interface TensionDiagnosis {
  overallScore: number;
  signals: TensionSignal[];
  dominantType: TensionSignalType | null;
  tips: string[];
  // 以下是 diagnoseTensionType 函数使用的属性
  type?: TensionLevel;
  typeName?: string;
  tensionIndex?: number;
  description?: string;
  suggestions?: string[];
}

// ==================== 面试报告类型 ====================
export interface InterviewReport {
  overallScore: number;
  tensionIndex: number;
  highlights: Array<{
    question: string;
    answer: string;
    score: number;
  }>;
  improvements: string[];
  tensionAnalysis: {
    totalSignals: number;
    criticalSignals: number;
    dominantType: TensionSignalType | null;
    tips: string[];
  };
  adaMessage: string;
  // 以下是 report-generator.ts generateReport 函数实际返回的属性
  sessionId?: string;
  summary?: string;
  scores?: {
    overall?: number;
    content?: number;
    expression?: number;
    confidence?: number;
    // 额外的分数属性
    actualScore?: number;
    realLevel?: number;
    tensionLost?: number;
  };
  tensionDiagnosis?: TensionDiagnosis;
  tensionLosses?: Array<{ question?: string; reason: string; lostPoints: number }>;
  suggestions?: Array<{ priority?: number; title: string; description: string }>;
  createdAt?: string | number;
}

// ==================== 豆包 API 类型 ====================
export interface DoubaoChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface DoubaoResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DoubaoChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ==================== 聊天消息类型 ====================
export interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

// ==================== 诊断答案类型 ====================
export interface DiagnosticAnswer {
  questionId: string;
  answer: string;
  timestamp: number;
}

// ==================== 诊断结果类型 ====================
export interface DiagnosticResult {
  answers: DiagnosticAnswer[];
  tensionIndex: number;
  diagnosis: TensionDiagnosis;
  tips: string[];
}
