/**
 * Language detection, text direction, and intent detection utilities.
 */

// Urdu and Arabic script Unicode block ranges
const URDU_ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Checks if a string contains primarily Right-To-Left characters (Urdu, Arabic, Persian).
 */
export function isRTL(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  // Count RTL vs LTR characters
  let rtlCount = 0;
  let ltrCount = 0;
  for (const char of text) {
    if (URDU_ARABIC_REGEX.test(char)) {
      rtlCount++;
    } else if (/[a-zA-Z]/.test(char)) {
      ltrCount++;
    }
  }
  return rtlCount > ltrCount || (rtlCount > 0 && ltrCount === 0);
}

/**
 * Returns 'rtl' or 'ltr' direction attribute value.
 */
export function getTextDirection(text: string): 'rtl' | 'ltr' {
  return isRTL(text) ? 'rtl' : 'ltr';
}

export type MediaIntent = 'image' | 'video' | 'text';

export interface IntentResult {
  type: MediaIntent;
  prompt: string;
  isUrdu: boolean;
}

/**
 * Identifies if the user prompt is requesting an image, video, or general text reply.
 * Handles both English and Urdu queries.
 */
export function detectIntent(userText: string): IntentResult {
  const trimmed = (userText || '').trim();
  const lower = trimmed.toLowerCase();
  const hasUrdu = isRTL(trimmed);

  // Video keywords (Urdu & English)
  const videoUrduPatterns = [/ویڈیو\s*بنا/i, /ویڈیو\s*تیار/i, /ایک\s*ویڈیو/i, /موشن\s*ویڈیو/i];
  const videoEngPatterns = [
    /\b(generate|create|make|produce)\s+(a\s+)?video\b/i,
    /\bvideo\s+of\b/i,
    /\banimate\b/i,
    /\bclip\s+of\b/i,
    /\bveo\b/i,
  ];

  const isVideo =
    videoUrduPatterns.some((pattern) => pattern.test(trimmed)) ||
    videoEngPatterns.some((pattern) => pattern.test(lower));

  if (isVideo) {
    return {
      type: 'video',
      prompt: extractMediaPrompt(trimmed, 'video'),
      isUrdu: hasUrdu,
    };
  }

  // Image keywords (Urdu & English)
  const imageUrduPatterns = [
    /تصویر\s*بنا/i,
    /تصویر\s*دکھا/i,
    /عکس\s*بنا/i,
    /فوٹو\s*بنا/i,
    /ایک\s*تصویر/i,
    /پینٹنگ/i,
    /خاکہ\s*بنا/i,
  ];
  const imageEngPatterns = [
    /\b(generate|create|draw|paint|render|make|show)\s+(an?\s+)?(image|picture|photo|illustration|drawing|artwork|wallpaper)\b/i,
    /\b(image|picture|photo|drawing)\s+of\b/i,
    /\billustrate\b/i,
    /\bdraw\s+me\b/i,
    /\bpaint\s+a\b/i,
  ];

  const isImage =
    imageUrduPatterns.some((pattern) => pattern.test(trimmed)) ||
    imageEngPatterns.some((pattern) => pattern.test(lower));

  if (isImage) {
    return {
      type: 'image',
      prompt: extractMediaPrompt(trimmed, 'image'),
      isUrdu: hasUrdu,
    };
  }

  return {
    type: 'text',
    prompt: trimmed,
    isUrdu: hasUrdu,
  };
}

/**
 * Cleans user command wrappers to isolate the subject for generation.
 */
function extractMediaPrompt(rawText: string, type: 'image' | 'video'): string {
  let cleaned = rawText;
  if (type === 'image') {
    cleaned = cleaned
      .replace(/^(can you\s+)?(please\s+)?(generate|create|draw|make|show|render)\s+(an?\s+)?(image|picture|photo)\s+(of\s+)?/i, '')
      .replace(/^(ایک\s+)?تصویر\s*(بنائیں|بناؤ|دکھائیں)?(\s*جس\s*میں)?/i, '')
      .replace(/(کی\s*تصویر\s*بنائیں)$/i, '')
      .trim();
  } else if (type === 'video') {
    cleaned = cleaned
      .replace(/^(can you\s+)?(please\s+)?(generate|create|make|produce)\s+(an?\s+)?video\s+(of\s+)?/i, '')
      .replace(/^(ایک\s+)?ویڈیو\s*(بنائیں|بناؤ|دکھائیں)?(\s*جس\s*میں)?/i, '')
      .replace(/(کی\s*ویڈیو\s*بنائیں)$/i, '')
      .trim();
  }
  return cleaned || rawText;
}

/**
 * Returns Nova's base system prompt.
 * Configured so Nova defaults to warm, natural Urdu, but seamlessly mirrors the user's language.
 */
export function getNovaSystemInstruction(): string {
  return [
    'You are Nova, an intelligent, empathetic, and radiant AI companion.',
    'Your branding features deep celestial indigo and gold warmth.',
    'Language Policy:',
    '1. DEFAULT LANGUAGE: Reply in beautiful, natural, grammatically correct and warm Urdu (اردو) by default if the user writes in Urdu or initiates an open conversation.',
    '2. LANGUAGE MATCHING: If the user communicates in English, Roman Urdu, or any other language, seamlessly reply in that exact language with equal eloquence, naturalness, and friendliness.',
    '3. For voice and call interactions, speak with a warm, conversational, encouraging, and respectful human tone (آپ جناب کا باوقار اور دوستانہ لہجہ).',
    '4. When asked to generate images or videos, acknowledge the request enthusiastically and concisely while the media is rendered.',
    '5. Keep responses concise, clear, and engaging.',
  ].join('\n');
}
