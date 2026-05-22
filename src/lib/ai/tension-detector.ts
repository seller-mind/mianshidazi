// 紧张检测工具 - 基于对话数据的紧张信号分析
import type { TensionSignal, TensionDiagnosis, TensionType, TensionLevel } from '@/types';

// 填充词列表
const FILLER_WORDS = ['嗯', '啊', '那个', '就是', '的话', '然后', '其实', '可能', '大概', '应该', '我想想', '让我想想', '这个', '怎么说', '怎么说呢'];

// 正常语速（字/秒）
const NORMAL_SPEED_MIN = 3;
const NORMAL_SPEED_MAX = 8;

// 正常回复长度（字）
const NORMAL_LENGTH_MIN = 20;
const NORMAL_LENGTH_MAX = 500;

// 正常停顿时间（秒）
const NORMAL_PAUSE_MAX = 5;

/**
 * 计算停顿紧张指数
 */
export function calculatePauseScore(pauseSeconds: number): TensionSignal {
  let score = 0;
  
  if (pauseSeconds > 30) {
    score = 100;
  } else if (pauseSeconds > 20) {
    score = 85;
  } else if (pauseSeconds > 10) {
    score = 60;
  } else if (pauseSeconds > 5) {
    score = 35;
  } else {
    score = 0;
  }

  return {
    type: 'pause',
    score,
    value: pauseSeconds,
    threshold: NORMAL_PAUSE_MAX,
    message: pauseSeconds > NORMAL_PAUSE_MAX 
      ? `停顿时间${pauseSeconds}秒，超过正常范围` 
      : `停顿时间${pauseSeconds}秒，正常范围`,
  };
}

/**
 * 计算语速紧张指数
 */
export function calculateSpeedScore(wordCount: number, durationSeconds: number): TensionSignal {
  if (durationSeconds === 0) {
    return {
      type: 'speed',
      score: 50,
      value: 0,
      threshold: NORMAL_SPEED_MIN,
      message: '无法计算语速',
    };
  }

  const speed = wordCount / durationSeconds;
  
  let score = 0;
  if (speed < 1) {
    score = 100;
  } else if (speed < 2) {
    score = 75;
  } else if (speed < NORMAL_SPEED_MIN) {
    score = 50;
  } else if (speed <= NORMAL_SPEED_MAX) {
    score = 0;
  } else {
    score = -20;
  }

  return {
    type: 'speed',
    score: Math.max(0, score),
    value: speed,
    threshold: NORMAL_SPEED_MIN,
    message: `语速${speed.toFixed(1)}字/秒 ${speed < NORMAL_SPEED_MIN ? '偏慢' : '正常'}`,
  };
}

/**
 * 计算填充词紧张指数
 */
export function calculateFillerScore(text: string): TensionSignal {
  const textLower = text.toLowerCase();
  let fillerCount = 0;

  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(filler, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      fillerCount += matches.length;
    }
  }

  const wordCount = text.length;
  const fillerRatio = fillerCount / (wordCount / 2);
  
  let score = 0;
  if (fillerRatio > 0.3) {
    score = 100;
  } else if (fillerRatio > 0.2) {
    score = 75;
  } else if (fillerRatio > 0.1) {
    score = 50;
  } else if (fillerRatio > 0.05) {
    score = 25;
  }

  return {
    type: 'filler',
    score,
    value: fillerCount,
    threshold: 0.1,
    message: `填充词出现${fillerCount}次 ${score > 50 ? '偏高' : '正常'}`,
  };
}

/**
 * 计算回复长度紧张指数
 */
export function calculateLengthScore(
  currentLength: number,
  averageLength: number
): TensionSignal {
  if (averageLength === 0) {
    return {
      type: 'length',
      score: 0,
      value: currentLength,
      threshold: NORMAL_LENGTH_MIN,
      message: '无历史数据',
    };
  }

  const ratio = currentLength / averageLength;
  
  let score = 0;
  if (ratio < 0.2) {
    score = 100;
  } else if (ratio < 0.4) {
    score = 75;
  } else if (ratio < 0.6) {
    score = 50;
  } else if (currentLength < NORMAL_LENGTH_MIN) {
    score = 30;
  } else {
    score = 0;
  }

  return {
    type: 'length',
    score,
    value: currentLength,
    threshold: NORMAL_LENGTH_MIN,
    message: `回复${currentLength}字 ${currentLength < NORMAL_LENGTH_MIN ? '偏短' : '正常'}`,
  };
}

/**
 * 计算综合紧张指数
 */
export function calculateTensionIndex(signals: TensionSignal[]): number {
  if (signals.length === 0) {
    return 0;
  }

  const weights = {
    pause: 0.3,
    speed: 0.25,
    filler: 0.25,
    length: 0.2,
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const weight = weights[signal.type] || 0;
    totalScore += signal.score * weight;
    totalWeight += weight;
  }

  return Math.round(totalScore / totalWeight);
}

/**
 * 分析用户消息的紧张信号
 */
export function analyzeMessageTension(
  text: string,
  pauseSeconds: number,
  messageTimestamp: number,
  previousTimestamp?: number,
  averageReplyLength?: number
): TensionSignal[] {
  const signals: TensionSignal[] = [];

  if (previousTimestamp) {
    const timeGap = (messageTimestamp - previousTimestamp) / 1000;
    if (timeGap > NORMAL_PAUSE_MAX) {
      signals.push(calculatePauseScore(timeGap));
    }
  }

  signals.push(calculateFillerScore(text));
  signals.push(calculateLengthScore(text.length, averageReplyLength || 0));

  return signals;
}

/**
 * 诊断紧张类型
 */
export function diagnoseTensionType(
  tensionIndex: number,
  signals: TensionSignal[]
): TensionDiagnosis {
  let type: TensionLevel = 'A';
  let typeName = '基本不紧张';
  let description = '';

  if (tensionIndex >= 80) {
    type = 'E';
    typeName = '极度紧张';
    description = '你在面试中表现出非常明显的紧张迹象。';
  } else if (tensionIndex >= 60) {
    type = 'D';
    typeName = '明显紧张';
    description = '你的紧张信号比较明显，可能会影响正常发挥。';
  } else if (tensionIndex >= 40) {
    type = 'C';
    typeName = '中度紧张';
    description = '你有一定的紧张感，但还在可控范围内。';
  } else if (tensionIndex >= 20) {
    type = 'B';
    typeName = '轻微紧张';
    description = '你只是稍微有点紧张，这是正常的状态。';
  } else {
    type = 'A';
    typeName = '基本不紧张';
    description = '你的表现很放松。';
  }

  return {
    type,
    typeName,
    tensionIndex,
    description,
    suggestions: [],
    overallScore: 0,
    signals: [],
    dominantType: null,
    tips: [],
  };
}

/**
 * 生成面试报告的紧张分析部分
 */
export function generateTensionAnalysis(
  messages: Array<{ content: string; timestamp: number }>,
  tensionSignals: TensionSignal[]
): {
  overallIndex: number;
  diagnosis: TensionDiagnosis;
  signalBreakdown: TensionSignal[];
} {
  const overallIndex = calculateTensionIndex(tensionSignals);
  const diagnosis = diagnoseTensionType(overallIndex, tensionSignals);

  return {
    overallIndex,
    diagnosis,
    signalBreakdown: tensionSignals,
  };
}
