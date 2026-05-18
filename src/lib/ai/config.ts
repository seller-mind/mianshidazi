import { type TensionSignalType, type TensionLevel } from '@/types';

// 紧张类型配置 - 这里使用的是诊断问卷中的紧张类型等级
export type DiagnosticTensionType = TensionLevel;
export const TENSION_TYPES: Record<DiagnosticTensionType, {
  name: string;
  description: string;
  symptoms: string[];
  advice: string[];
  emoji: string;
}> = {
  A: {
    name: '脑暴型紧张',
    description: '大脑一片空白，思绪像被按了暂停键，明明准备得很充分却怎么也想不起来要说什么。',
    symptoms: [
      '面试时脑子突然一片空白',
      '明明准备过的问题突然想不起来',
      '思绪混乱，说话前言不搭后语',
      '越想越慌，越慌越想不起来',
    ],
    advice: [
      '哈佛研究：适度的紧张反而能提升表现，接受它而不是对抗它',
      '面试前做深呼吸，让大脑获得更多氧气',
      '准备一个"救命稻草"——一个万能开头应对大脑空白',
    ],
    emoji: '🧠',
  },
  B: {
    name: '身体型紧张',
    description: '身体比大脑先反应，手抖、心跳加速、甚至出汗，让你在还没开口前就输了气势。',
    symptoms: [
      '面试前手抖得写不了字',
      '心跳加速，感觉喘不过气',
      '手心出汗，握不住东西',
      '声音发抖，连自我介绍都困难',
    ],
    advice: [
      '维克森林大学研究：放慢呼吸能快速平静心率，试试4-7-8呼吸法',
      '做力量训练姿势（Power Posing）2分钟，提升自信激素',
      '随身带一瓶水，既能润嗓子，也是很好的道具',
    ],
    emoji: '💓',
  },
  C: {
    name: '社交恐惧型紧张',
    description: '不敢直视面试官的眼睛，说话时眼神飘忽，总觉得所有人都在审视自己。',
    symptoms: [
      '不敢直视面试官的眼睛',
      '说话时眼神飘忽不定',
      '总觉得面试官在评判自己',
      '群体面试时特别紧张',
    ],
    advice: [
      '心理学研究：把面试官当作"未来的同事"而不是"审判者"',
      '提前到面试地点熟悉环境，减少陌生感带来的恐惧',
      '练习"3秒眼神法"：看对方眼睛3秒，然后自然移开',
    ],
    emoji: '👀',
  },
  D: {
    name: '完美主义型紧张',
    description: '追求完美，害怕说错一句话、答错一道题。过度准备反而让自己更焦虑。',
    symptoms: [
      '过度准备，把一个问题想太多答案',
      '害怕说错任何一句话',
      '回答时反复修改，越说越乱',
      '面试后反复复盘，陷入自责',
    ],
    advice: [
      '麻省理工研究：面试官平均只能记住回答的3个要点，无需完美',
      '接受"足够好"而非"完美"，面试是双向选择',
      '准备一个简洁有力的结尾，给面试官留下好印象',
    ],
    emoji: '🎯',
  },
  E: {
    name: '面试PTSD型紧张',
    description: '之前的面试失败留下了心理阴影，还没开始就预设自己会搞砸。',
    symptoms: [
      '还没面试就开始担心失败',
      '之前被拒的经历反复闪回',
      '自我否定，觉得自己不够好',
      '把一次失败当成永远的标签',
    ],
    advice: [
      '斯坦福研究：80%的面试结果与你的真实能力无关，取决于竞争对手',
      '把每次面试当作练习，而不是审判',
      '记录每次面试的进步，建立自信档案',
    ],
    emoji: '🔄',
  },
};

// 诊断问卷问题
export const DIAGNOSTIC_QUESTIONS = [
  {
    id: 1,
    question: '面试的时候，你最先出状况的是哪里？',
    subtext: '阿搭：身体和大脑，总有一个先叛变...',
    options: [
      { text: '脑子一片空白，想不起来说什么', scores: { A: 3, B: 1, C: 0, D: 1, E: 1 } },
      { text: '身体先开始，手抖心跳加速', scores: { A: 1, B: 3, C: 1, D: 0, E: 1 } },
      { text: '不敢看面试官，眼神到处飘', scores: { A: 0, B: 1, C: 3, D: 1, E: 0 } },
      { text: '都会，整个人都不好了', scores: { A: 2, B: 2, C: 2, D: 1, E: 1 } },
    ],
  },
  {
    id: 2,
    question: '面试前一晚，你通常在干嘛？',
    subtext: '阿搭：我猜大多数人都在...辗转反侧？',
    options: [
      { text: '躺平刷手机，假装不紧张', scores: { A: 1, B: 0, C: 1, D: 1, E: 1 } },
      { text: '翻来覆去睡不着，脑子里全是明天', scores: { A: 2, B: 2, C: 1, D: 1, E: 2 } },
      { text: '疯狂复习资料，感觉永远准备不够', scores: { A: 1, B: 1, C: 0, D: 3, E: 1 } },
      { text: '早就睡了，心态贼好', scores: { A: 0, B: 0, C: 0, D: 0, E: 0 } },
    ],
  },
  {
    id: 3,
    question: '面试中被面试官突然追问时，你的第一反应是？',
    subtext: '阿搭：追问不是刁难，是在给你机会哦',
    options: [
      { text: '大脑宕机，愣在原地', scores: { A: 3, B: 1, C: 1, D: 1, E: 1 } },
      { text: '心跳加速，声音开始发抖', scores: { A: 1, B: 3, C: 2, D: 0, E: 1 } },
      { text: '眼神躲避，不敢直视面试官', scores: { A: 1, B: 1, C: 3, D: 1, E: 0 } },
      { text: '快速组织语言，但越说越乱', scores: { A: 2, B: 1, C: 1, D: 2, E: 1 } },
    ],
  },
  {
    id: 4,
    question: '面试结束后，你会？',
    subtext: '阿搭：不同的人有不同的"劫后余生"方式',
    options: [
      { text: '疯狂复盘，觉得哪里都说得不够好', scores: { A: 1, B: 0, C: 1, D: 3, E: 2 } },
      { text: '感觉自己发挥不好，开始自我否定', scores: { A: 1, B: 1, C: 1, D: 1, E: 3 } },
      { text: '假装没事，但心里一直在想面试官的表情', scores: { A: 1, B: 1, C: 2, D: 1, E: 1 } },
      { text: '快速忘掉，等通知再说', scores: { A: 0, B: 0, C: 0, D: 0, E: 0 } },
    ],
  },
  {
    id: 5,
    question: '如果面试通过了，你的心情是？',
    subtext: '阿搭：这是个关于自我认知的问题',
    options: [
      { text: '开心但也心虚，觉得是运气好', scores: { A: 1, B: 0, C: 1, D: 1, E: 2 } },
      { text: '不太敢相信，总觉得哪里会出问题', scores: { A: 1, B: 1, C: 1, D: 1, E: 3 } },
      { text: '正常发挥而已，没什么特别的', scores: { A: 0, B: 0, C: 0, D: 0, E: 0 } },
      { text: '开心！但还是担心下一轮', scores: { A: 1, B: 0, C: 0, D: 2, E: 1 } },
    ],
  },
  {
    id: 6,
    question: '面试前你会准备多长时间？',
    subtext: '阿搭：准备充分是好事，但过犹不及哦',
    options: [
      { text: '临时抱佛脚，半小时速成', scores: { A: 1, B: 0, C: 1, D: 0, E: 0 } },
      { text: '认真准备1-3天，把可能的问题都想一遍', scores: { A: 1, B: 1, C: 1, D: 2, E: 1 } },
      { text: '提前一周准备，模拟各种场景', scores: { A: 1, B: 1, C: 1, D: 3, E: 1 } },
      { text: '佛系准备，靠临场发挥', scores: { A: 0, B: 0, C: 0, D: 0, E: 0 } },
    ],
  },
  {
    id: 7,
    question: '等待面试结果的时候，你是什么状态？',
    subtext: '阿搭：等通知的焦虑，懂的人都懂',
    options: [
      { text: '正常生活，该干嘛干嘛', scores: { A: 0, B: 0, C: 0, D: 0, E: 0 } },
      { text: '时不时刷邮箱/手机，患得患失', scores: { A: 1, B: 1, C: 1, D: 1, E: 2 } },
      { text: '已经做好被拒的心理准备', scores: { A: 1, B: 0, C: 1, D: 1, E: 2 } },
      { text: '焦虑到影响正常生活', scores: { A: 1, B: 2, C: 1, D: 1, E: 3 } },
    ],
  },
  {
    id: 8,
    question: '如果你知道自己紧张的类型，你最想？',
    subtext: '阿搭：这道题没有对错，只是在了解你的需求',
    options: [
      { text: '学会快速平复紧张情绪', scores: { A: 1, B: 2, C: 1, D: 1, E: 1 } },
      { text: '克服面试恐惧，找回自信', scores: { A: 1, B: 1, C: 2, D: 1, E: 2 } },
      { text: '知道如何应对追问和意外', scores: { A: 2, B: 1, C: 1, D: 1, E: 1 } },
      { text: '不再因为一次失败否定自己', scores: { A: 1, B: 0, C: 1, D: 1, E: 3 } },
    ],
  },
];

// 计算诊断结果
export function calculateDiagnosticResult(answers: number[][]): {
  primaryType: DiagnosticTensionType;
  tensionIndex: number;
  scores: Record<DiagnosticTensionType, number>;
} {
  const scores: Record<DiagnosticTensionType, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  answers.forEach((questionAnswers, questionIndex) => {
    if (questionIndex < DIAGNOSTIC_QUESTIONS.length) {
      const question = DIAGNOSTIC_QUESTIONS[questionIndex];
      questionAnswers.forEach(answerIndex => {
        if (answerIndex >= 0 && answerIndex < question.options.length) {
          const optionScores = question.options[answerIndex].scores;
          (Object.keys(optionScores) as DiagnosticTensionType[]).forEach(type => {
            scores[type] += optionScores[type];
          });
        }
      });
    }
  });

  // 找出最高分的类型
  const maxScore = Math.max(...Object.values(scores));
  const primaryType = (Object.entries(scores).find(([_, v]) => v === maxScore)?.[0] || 'A') as DiagnosticTensionType;

  // 计算紧张指数 (基于总分)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const maxPossibleScore = DIAGNOSTIC_QUESTIONS.length * 3;
  const tensionIndex = Math.min(100, Math.round((totalScore / maxPossibleScore) * 100));

  return { primaryType, tensionIndex, scores };
}

// 定价方案
export const PRICING_PLANS = [
  {
    id: 'single',
    name: '单次体验',
    price: 9.9,
    features: [
      '1次AI模拟面试',
      '个性化面试报告',
      '紧张类型诊断',
      '24小时有效期',
    ],
  },
  {
    id: 'monthly',
    name: '月卡会员',
    price: 49,
    originalPrice: 99,
    isPopular: true,
    features: [
      '无限次AI模拟面试',
      '个性化面试报告',
      '紧张类型诊断',
      '专属紧张缓解训练',
      '优先客服支持',
    ],
  },
  {
    id: 'quarterly',
    name: '季卡会员',
    price: 129,
    originalPrice: 279,
    features: [
      '无限次AI模拟面试',
      '个性化面试报告',
      '紧张类型诊断',
      '专属紧张缓解训练',
      '优先客服支持',
      '面试复盘指导',
    ],
  },
];
