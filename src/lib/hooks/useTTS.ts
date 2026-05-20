// TTS v6 - 浏览器原生 SpeechSynthesis
// 彻底换方案：不再用CosyVoice，用浏览器内置语音合成
// 优点：无字符限制、无需服务器、点击即出声、免费
// 浏览器兼容：Chrome/Safari/WebView均支持

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

// 清理文本：去括号内容、emoji、markdown
function cleanText(text: string): string {
  return text
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[[\【][^】\]]*[】\]]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/✅✨👉💡🔥☕😅🌙/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/—+/g, '——')
    .replace(/\n+/g, '；')
    .replace(/；{2,}/g, '；')
    .trim();
}

export function useTTS(options: UseTTSOptions = {}) {
  const { isCompanion = false } = options;

  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    playingId: null,
    isLoading: false,
    error: null,
  });

  const currentIdRef = useRef<string | null>(null);

  // 清理：组件卸载时停止播放
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    currentIdRef.current = null;
    setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
  }, []);

  const play = useCallback((text: string, messageId: string) => {
    // 同一条消息再点→停止
    if (currentIdRef.current === messageId && state.isPlaying) {
      stop();
      return;
    }

    stop();

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.error('[TTS] 浏览器不支持语音合成');
      return;
    }

    const clean = cleanText(text);
    if (!clean) return;

    currentIdRef.current = messageId;

    // Chrome长文本bug：超过约15秒会自动停止
    // 解决方案：按句号分段，每段单独speak，串行播放
    const sentences = clean.match(/[^。！？；]+[。！？；]?/g) || [clean];

    let sentenceIndex = 0;

    const speakNext = () => {
      if (sentenceIndex >= sentences.length) {
        // 全部读完
        if (currentIdRef.current === messageId) {
          currentIdRef.current = null;
          setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
        }
        return;
      }

      // 被中断了
      if (currentIdRef.current !== messageId) return;

      const utterance = new SpeechSynthesisUtterance(sentences[sentenceIndex]);
      utterance.lang = 'zh-CN';
      utterance.rate = isCompanion ? 0.9 : 1.0;
      utterance.pitch = 1.0;

      // 选中文语音
      const voices = window.speechSynthesis.getVoices();
      const zhVoices = voices.filter(v => v.lang.startsWith('zh'));

      if (zhVoices.length > 0) {
        if (isCompanion) {
          // 陪伴模式：优先选女声
          const female = zhVoices.find(v =>
            /xiaoxiao|ting-ting|female|yaoyao|lili|huihui|kangkang/i.test(v.name) === false &&
            /yunxi|yunjian|yunsuo|yuzhe/i.test(v.name) === false
          ) || zhVoices.find(v => /xiaoxiao|ting|yaoyao|lili/i.test(v.name)) || zhVoices[0];
          utterance.voice = female;
        } else {
          // 面试模式：优先选男声
          const male = zhVoices.find(v => /yunxi|yunjian|yunsuo|yuzhe/i.test(v.name)) || zhVoices[0];
          utterance.voice = male;
        }
      }

      utterance.onend = () => {
        sentenceIndex++;
        speakNext();
      };

      utterance.onerror = (e) => {
        console.warn('[TTS] speak error:', e.error);
        // 跳过这句继续下一句
        sentenceIndex++;
        speakNext();
      };

      window.speechSynthesis.speak(utterance);
    };

    // 立即开始播放（第一次调用标记为playing）
    setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
    speakNext();

  }, [state.isPlaying, stop, isCompanion]);

  // SpeechSynthesis不需要预加载
  const preload = useCallback((_text: string, _messageId: string) => {}, []);
  const isPreloaded = useCallback((_messageId: string) => false, []);
  const isPreloading = useCallback(() => false, []);

  const isPlayingMessage = useCallback((messageId: string) => {
    return currentIdRef.current === messageId && state.isPlaying;
  }, [state.isPlaying]);

  const isLoadingMessage = useCallback((messageId: string) => {
    return currentIdRef.current === messageId && state.isLoading;
  }, [state.playingId, state.isLoading]);

  return {
    ...state,
    play,
    stop,
    preload,
    isPreloaded,
    isPreloading,
    isPlayingMessage,
    isLoadingMessage,
  };
}
