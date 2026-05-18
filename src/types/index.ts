// 紧张类型枚举
export type TensionType = 'A' | 'B' | 'C' | 'D' | 'E';

export interface TensionTypeInfo {
  type: TensionType;
  name: string;
  description: string;
  symptoms: string[];
  advice: string[];
}

// 诊断问卷问题
export interface DiagnosticQuestion {
  id: number;
  question: string;
  subtext?: string;
  options: {
    text: string;
    scores: Record<TensionType, number>;
  }[];
}

// 诊断结果
export interface DiagnosticResult {
  primaryType: TensionType;
  tensionIndex: number; // 0-100
  performanceScore: number;
  realLevelScore: number;
  scoreLost: number;
  matchedTypes: {
    type: TensionType;
    score: number;
  }[];
}

// AI对话消息
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// 面试练习会话
export interface PracticeSession {
  id: string;
  userId: string;
  tensionType: TensionType;
  createdAt: Date;
  messages: ChatMessage[];
  status: 'active' | 'completed';
}

// 用户档案
export interface UserProfile {
  id: string;
  email: string;
  tensionType?: TensionType;
  tensionIndex?: number;
  practiceCount: number;
  createdAt: Date;
}

// 定价方案
export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  features: string[];
  isPopular?: boolean;
}

// 支付订单
export interface PaymentOrder {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  createdAt: Date;
}

// 诊断问卷答案记录
export interface DiagnosticAnswer {
  questionId: number;
  selectedOption: number;
  scores: Record<TensionType, number>;
}

// 面试官人格类型
export type PersonaType = 'A' | 'B' | 'C' | 'D' | 'E';

// 陪伴对话上下文
export type CompanionContext = '深夜' | '面试前' | '面试后' | '等通知' | '崩溃急救' | '日常';

// 紧张信号
export interface TensionSignal {
  pauseCount: number;
  avgResponseTime: number;
  fillerWordCount: number;
  responseLength: number;
  tensionIndex: number;
  timestamp: Date;
}
