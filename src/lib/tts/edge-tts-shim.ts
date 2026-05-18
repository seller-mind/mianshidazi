// edge-tts shim - 重新导出编译后的 JS 模块
import { tts, ttsSave, getVoices, Personalities, Categories } from '../../../node_modules/edge-tts/out/index.js';

export { tts, ttsSave, getVoices, Personalities, Categories };

export interface Voice {
  Name: string;
  ShortName: string;
  Gender: "Male" | "Female";
  Locale: string;
  FriendlyName: string;
  VoiceTag: {
    ContentCategories: string[];
    VoicePersonalities: string[];
  };
}

export type options = Partial<{
  voice: string;
  volume: string;
  rate: string;
  pitch: string;
}>;
