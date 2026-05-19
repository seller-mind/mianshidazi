// TTS 语音播放 Hook
// 方案1: 浏览器端直连微软 Edge TTS（神经网络语音，高质量，免费）
// 方案2: 百度翻译 TTS 兜底（机械感较强但稳定）

import { useState, useRef, useCallback, useEffect } from 'react';

export interface TTSState {
  isPlaying: boolean;
  playingId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseTTSOptions {
  persona?: string;
  isCompanion?: boolean;
}

// === 人格音色映射（Edge TTS 神经网络语音）===
const PERSONA_VOICE: Record<string, { voice: string; rate: string; pitch: string }> = {
  // 温柔鼓励型 - 晓晓，语速偏慢，温暖
  A: { voice: 'zh-CN-XiaoxiaoNeural', rate: '-5%', pitch: '+2Hz' },
  // 真实模拟型 - 云扬（新闻播报），正常语速
  B: { voice: 'zh-CN-YunyangNeural', rate: '+0%', pitch: '+0Hz' },
  // 压力挑战型 - 云希，语速偏快，低沉
  C: { voice: 'zh-CN-YunxiNeural', rate: '+10%', pitch: '-2Hz' },
  // 犀利毒舌型 - 晓墨，干练
  D: { voice: 'zh-CN-XiaomoNeural', rate: '+5%', pitch: '+0Hz' },
  // HR老油条型 - 云风，圆滑
  E: { voice: 'zh-CN-YunfengNeural', rate: '-5%', pitch: '-1Hz' },
};

// 陪伴模式 - 小艺，活泼亲切
const COMPANION_VOICE = { voice: 'zh-CN-XiaoyiNeural', rate: '-3%', pitch: '+3Hz' };

// === 文本清理 ===
function cleanText(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/\n+/g, '，')
    .trim();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// === 浏览器端 Edge TTS（直连微软 WebSocket）===
async function edgeTTSSynthesize(
  text: string,
  voice: string,
  rate: string,
  pitch: string
): Promise<Blob> {
  // 生成请求 ID
  const reqId = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') :
    Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');

  const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${reqId}`;

  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      reject(new Error('WebSocket不可用'));
      return;
    }

    const audioChunks: Uint8Array[] = [];
    let resolved = false;

    const cleanup = () => {
      clearTimeout(timeout);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Edge TTS超时'));
      }
    }, 15000);

    ws.onopen = () => {
      // 1. 发送配置
      const config =
        `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
      ws.send(config);

      // 2. 发送 SSML
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>` +
        `<voice name='${voice}'>` +
        `<prosody pitch='${pitch}' rate='${rate}' volume='+0%'>` +
        `${escapeXml(text)}` +
        `</prosody></voice></speak>`;
      const ssmlMsg =
        `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        // 文本消息 - 检查是否完成
        if (event.data.includes('Path:turn.end')) {
          if (!resolved) {
            resolved = true;
            cleanup();
            const blob = new Blob(audioChunks.map(c => c.buffer as ArrayBuffer), { type: 'audio/mpeg' });
            resolve(blob);
          }
        }
      } else {
        // 二进制消息 - 收集音频数据
        const data = event.data as ArrayBuffer;
        if (data.byteLength > 2) {
          // 前2字节是header长度(大端序)，之后是header文本，然后是音频数据
          const headerLen = new DataView(data).getUint16(0);
          const audioSlice = data.slice(2 + headerLen);
          if (audioSlice.byteLength > 0) {
            audioChunks.push(new Uint8Array(audioSlice));
          }
        }
      }
    };

    ws.onerror = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Edge TTS连接失败'));
      }
    };

    ws.onclose = () => {
      if (!resolved) {
        if (audioChunks.length > 0) {
          resolved = true;
          const blob = new Blob(audioChunks.map(c => c.buffer as ArrayBuffer), { type: 'audio/mpeg' });
          resolve(blob);
        } else {
          resolved = true;
          reject(new Error('未收到音频'));
        }
      }
    };
  });
}

// === 百度翻译 TTS（兜底）===
function buildBaiduTTSUrl(text: string, speed: number = 5): string {
  const clean = cleanText(text);
  const safeText = clean.length > 200 ? clean.substring(0, 200) : clean;
  return `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(safeText)}&spd=${speed}&source=web`;
}

// === 主 Hook ===
export function useTTS(options: UseTTSOptions = {}) {
  const { persona = 'A', isCompanion = false } = options;

  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    playingId: null,
    isLoading: false,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPlayingIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    currentPlayingIdRef.current = null;
    setState({
      isPlaying: false,
      playingId: null,
      isLoading: false,
      error: null,
    });
  }, []);

  // 播放 Blob 音频
  const playAudioBlob = useCallback((blob: Blob, messageId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = 'auto';
      audioRef.current = audio;
      currentPlayingIdRef.current = messageId;

      const onEnded = () => {
        cleanup();
        URL.revokeObjectURL(url);
        if (currentPlayingIdRef.current === messageId) {
          audioRef.current = null;
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: null,
          });
        }
        resolve();
      };

      const onError = () => {
        cleanup();
        URL.revokeObjectURL(url);
        reject(new Error('音频播放失败'));
      };

      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      setState({
        isPlaying: true,
        playingId: messageId,
        isLoading: false,
        error: null,
      });

      audio.play().catch(reject);
    });
  }, []);

  // 播放URL音频（百度兜底用）
  const playAudioUrl = useCallback((audioUrl: string, messageId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
      currentPlayingIdRef.current = messageId;

      const timeout = setTimeout(() => reject(new Error('加载超时')), 8000);

      const onCanPlay = () => {
        clearTimeout(timeout);
        setState({
          isPlaying: true,
          playingId: messageId,
          isLoading: false,
          error: null,
        });
        audio.play().catch(reject);
      };

      const onEnded = () => {
        cleanup();
        if (currentPlayingIdRef.current === messageId) {
          audioRef.current = null;
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: null,
          });
        }
        resolve();
      };

      const onError = () => {
        clearTimeout(timeout);
        cleanup();
        reject(new Error('音频加载失败'));
      };

      const cleanup = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError, { once: true });

      audio.src = audioUrl;
    });
  }, []);

  // 主播放入口
  const play = useCallback(async (text: string, messageId: string) => {
    // 点击同一条：停止
    if (currentPlayingIdRef.current === messageId && state.isPlaying) {
      stop();
      return;
    }

    stop();

    const clean = cleanText(text);
    if (!clean) return;

    setState({
      isPlaying: false,
      playingId: messageId,
      isLoading: true,
      error: null,
    });

    // 获取音色参数
    const voiceConfig = isCompanion ? COMPANION_VOICE : (PERSONA_VOICE[persona] || PERSONA_VOICE['A']);

    try {
      // 方案1: Edge TTS（浏览器端直连微软，高质量神经网络语音）
      const audioBlob = await edgeTTSSynthesize(clean, voiceConfig.voice, voiceConfig.rate, voiceConfig.pitch);
      if (currentPlayingIdRef.current !== messageId) return; // 已被停止
      await playAudioBlob(audioBlob, messageId);
    } catch (edgeError) {
      console.warn('Edge TTS failed:', edgeError);

      // 如果已被用户停止，不再尝试
      if (currentPlayingIdRef.current !== messageId) return;

      try {
        // 方案2: 百度翻译 TTS 兜底
        setState({
          isPlaying: false,
          playingId: messageId,
          isLoading: true,
          error: null,
        });
        const speed = isCompanion ? 4 : 5;
        const baiduUrl = buildBaiduTTSUrl(text, speed);
        await playAudioUrl(baiduUrl, messageId);
      } catch (baiduError) {
        console.error('Baidu TTS also failed:', baiduError);
        if (currentPlayingIdRef.current === messageId) {
          audioRef.current = null;
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: '语音暂时不可用',
          });
        }
      }
    }
  }, [persona, isCompanion, state.isPlaying, stop, playAudioBlob, playAudioUrl]);

  const isPlayingMessage = useCallback((messageId: string) => {
    return state.playingId === messageId && state.isPlaying;
  }, [state.playingId, state.isPlaying]);

  const isLoadingMessage = useCallback((messageId: string) => {
    return state.playingId === messageId && state.isLoading;
  }, [state.playingId, state.isLoading]);

  return {
    ...state,
    play,
    stop,
    isPlayingMessage,
    isLoadingMessage,
  };
}
