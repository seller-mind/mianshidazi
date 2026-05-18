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
 * 停顿时间 > 5秒 = 高紧张
 */
export function calculatePauseScore(pauseSeconds: number): TensionSignal {
  let score = 0;
  
  if (pauseSeconds > 30) {
    score = 100; // 极度紧张
  } else if (pauseSeconds > 20) {
    score = 85;
  } else if (pauseSeconds > 10) {
    score = 60;
  } else if (pauseSeconds > 5) {
    score = 35;
  } else {
    score = 0; // 正常
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
 * 字/秒 < 3 = 紧张
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
    score = 100; // 极度紧张
  } else if (speed < 2) {
    score = 75;
  } else if (speed < NORMAL_SPEED_MIN) {
    score = 50;
  } else if (speed <= NORMAL_SPEED_MAX) {
    score = 0; // 正常
  } else {
    score = -20; // 语速太快可能不是紧张
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
 * 填充词出现频率高 = 紧张
 */
export function calculateFillerScore(text: string): TensionSignal {
  const textLower = text.toLowerCase();
  let fillerCount = 0;
  const matchedFillers: string[] = [];

  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(filler, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      fillerCount += matches.length;
      matchedFillers.push(filler);
    }
  }

  // 计算填充词占比
  const wordCount = text.length;
  const fillerRatio = fillerCount / (wordCount / 2); // 粗略估算
  
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
 * 回复明显短于其他回答 = 紧张
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
    score = 100; // 极度简短
  } else if (ratio < 0.4) {
    score = 75;
  } else if (ratio < 0.6) {
    score = 50;
  } else if (currentLength < NORMAL_LENGTH_MIN) {
    score = 30;
  } else {
    score = 0; // 正常
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
 * 权重：停顿30% + 语速25% + 填充词25% + 长度20%
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

  // 停顿检测
  if (previousTimestamp) {
    const timeGap = (messageTimestamp - previousTimestamp) / 1000;
    if (timeGap > NORMAL_PAUSE_MAX) {
      signals.push(calculatePauseScore(timeGap));
    }
  }

  // 填充词检测
  signals.push(calculateFillerScore(text));

  // 长度检测
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
  // 根据信号分析紧张类型
  const pauseSignal = signals.find(s => s.type === 'pause');
  const fillerSignal = signals.find(s => s.type === 'filler');
  const lengthSignal = signals.find(s => s.type === 'length');

  let type: TensionLevel = 'A';
  let typeName = '轻度紧张';
  let description = '';
  const suggestions: string[] = [];

  if (tensionIndex >= 80) {
    type = 'E';
    typeName = '极度紧张';
    description = '你在面试中表现出非常明显的紧张迹象，可能是对面试内容极度不自信，或者之前有不好的面试经历。';
    suggestions.push('先暂停面试，深呼吸几次', '告诉自己「紧张≠失败」', '面试前做4-7-8呼吸法', '降低期望，先完成再说');
  } else if (tensionIndex >= 60) {
    type = 'D';
    typeName = '明显紧张';
    description = '你的紧张信号比较明显，可能会影响正常发挥。需要学习一些临场调节技巧。';
    suggestions.push('4-7-8呼吸法：吸气4秒，屏气7秒，呼气8秒', '尝试「具身认知」：调整姿势，让自己看起来更自信', '把紧张解读为「兴奋」', '放慢语速，给自己更多思考时间');
  } else if (tensionIndex >= 40) {
    type = 'C';
    typeName = '中度紧张';
    description = '你有一定的紧张感，但还在可控范围内。这是正常的，适度紧张反而能让你表现更好。';
    suggestions.push('准备一些「过渡句」填充沉默', '面试前做几分钟冥想', '提前模拟面试，减少未知感', '记住：面试官也是人');
  } else if (tensionIndex >= 20) {
    type = 'B';
    typeName = '轻微紧张';
    description = '你只是稍微有点紧张，这是健康的状态。适度的紧张能让你更专注。';
    suggestions.push('保持现状就好', '可以学一些应对追问的技巧', '多练习几次会越来越放松');
  } else {
    type = 'A';
    typeName = '基本不紧张';
    description = '你的表现很放松，这是最好的状态。继续发挥你的优势就好。';
    suggestions.push('继续保持', '可以挑战更高难度的面试场景', '注意不要过于放松而失去重点');
  }

  // 根据具体信号添加个性化建议
  if (pauseSignal && pauseSignal.score > 50) {
    suggestions.unshift('💡 你停顿比较多，下次试试先重复问题来争取时间');
  }
  if (fillerSignal && fillerSignal.score > 50) {
    suggestions.unshift('💡 填充词有点多，练习时录音听一下');
  }
  if (lengthSignal && lengthSignal.score > 50) {
    suggestions.unshift('💡 你的回答偏短，可以主动展开细节');
  }

  return {
    type,
    typeName,
    tensionIndex,
    description,
    suggestions: suggestions.slice(0, 5), // 最多5条建议
    overallScore: 0,
    signals: [],
    dominantType: null,
    tips: suggestions.slice(0, 5),
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
  // 计算整体紧张指数
  const overallIndex = calculateTensionIndex(tensionSignals);
  
  // 诊断紧张类型
  const diagnosis = diagnoseTensionType(overallIndex, tensionSignals);

  return {
    overallIndex,
    diagnosis,
    signalBreakdown: tensionSignals,
  };
}
