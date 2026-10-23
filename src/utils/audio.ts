/**
 * Audio helpers for format conversions, call timers, and speech management.
 */

/**
 * Formats elapsed call time in mm:ss format (e.g. 00:05, 03:42).
 */
export function formatCallDuration(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  const paddedMins = mins.toString().padStart(2, '0');
  const paddedSecs = secs.toString().padStart(2, '0');
  return `${paddedMins}:${paddedSecs}`;
}

/**
 * Converts a base64 string to a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a Float32Array of raw PCM audio into base64 16-bit PCM little-endian.
 */
export function floatTo16BitPCMBase64(float32Array: Float32Array): string {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

/**
 * Available Gemini TTS prebuilt voices.
 */
export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  personaUrdu: string;
  personaEnglish: string;
  previewTextUrdu: string;
  previewTextEnglish: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    personaUrdu: 'کورے — پُرسکون اور پُرکشش نسوانی آواز',
    personaEnglish: 'Warm, calm, and soothing female voice',
    previewTextUrdu: 'السلام علیکم! میں نووا ہوں، آپ کی ذہین ساتھی۔ میں آپ کی کیسے مدد کر سکتی ہوں؟',
    previewTextEnglish: 'Hello! I am Nova, your radiant AI companion. How can I help you today?',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    personaUrdu: 'فینرِر — باوقار، گہری اور پر اعتماد مردانہ آواز',
    personaEnglish: 'Deep, resonant, and confident male voice',
    previewTextUrdu: 'خوش آمدید! نووا آپ کے سوالات اور تخیل کو حقیقت بنانے کے لیے تیار ہے۔',
    previewTextEnglish: 'Welcome! Nova is ready to assist you and bring your imagination to life.',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Male',
    personaUrdu: 'پَک — توانا، دوستانہ اور شگفتہ مردانہ آواز',
    personaEnglish: 'Energetic, friendly, and lively male voice',
    previewTextUrdu: 'ارے دوست! کیا حال ہے؟ چلیں آج مل کر کچھ نیا بناتے ہیں!',
    previewTextEnglish: 'Hey there! How are you doing? Let\'s create something awesome together!',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    personaUrdu: 'کیرون — سنجیدہ، دانشمندانہ اور متوازن مردانہ آواز',
    personaEnglish: 'Wise, thoughtful, and analytical male voice',
    previewTextUrdu: 'علم اور حکمت کی دنیا میں آپ کا خیر مقدم ہے۔ فرمائیے، کیا جاننا چاہتے ہیں؟',
    previewTextEnglish: 'Welcome to a world of knowledge and insight. What would you like to explore?',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Female',
    personaUrdu: 'زیفر — شائستہ، سبک اور پرجوش نسوانی آواز',
    personaEnglish: 'Bright, articulate, and expressive female voice',
    previewTextUrdu: 'آپ کا دن اچھا گزرے! نووا کے ساتھ بات چیت اور تخلیق کا سفر شروع کریں۔',
    previewTextEnglish: 'Wishing you a great day! Start your conversation and creative journey with Nova.',
  },
];
