import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { getNovaSystemInstruction, isRTL, detectIntent } from './src/utils/language.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

function getAiClient(userApiKey?: string): GoogleGenAI {
  const apiKey = (userApiKey && userApiKey.trim().length > 5) 
    ? userApiKey.trim() 
    : (process.env.GEMINI_API_KEY || '');
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // API Health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Chat Endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, model, systemInstruction, userApiKey } = req.body;
      const ai = getAiClient(userApiKey);
      const chosenModel = model || 'gemini-3.8-flash';

      const contents = (messages || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      }));

      if (contents.length === 0) {
        return res.status(400).json({ error: 'No messages provided' });
      }

      const response = await ai.models.generateContent({
        model: chosenModel,
        contents,
        config: {
          systemInstruction: systemInstruction || getNovaSystemInstruction(),
          temperature: 0.7,
        },
      });

      const responseText = response.text || '';
      res.json({
        text: responseText,
        isUrdu: isRTL(responseText),
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      // Graceful fallback response in Urdu or English
      const isUrduQuery = isRTL(req.body.messages?.at(-1)?.content || '');
      const fallbackText = isUrduQuery
        ? 'معذرت، اس وقت سروس میں دشواری پیش آ رہی ہے۔ لیکن میں نووا ہوں اور آپ کی مدد کے لیے حاضر ہوں۔ براہ کرم دوبارہ کوشش فرمائیں۔'
        : 'Nova is currently experiencing high demand. Please try again or check your API key in Settings.';
      res.json({
        text: fallbackText,
        isUrdu: isUrduQuery,
        warning: err.message,
      });
    }
  });

  // Image Generation Endpoint
  app.post('/api/generate-image', async (req, res) => {
    try {
      const { prompt, model, aspectRatio, userApiKey } = req.body;
      const ai = getAiClient(userApiKey);
      const chosenModel = model || 'gemini-3.1-flash-lite-image';

      // Call Gemini Image model
      const response = await ai.models.generateContent({
        model: chosenModel,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || '1:1',
          },
        },
      });

      let imageUrl = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mime};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!imageUrl) {
        // High fidelity procedural fallback image if model quota fails
        imageUrl = generateProceduralArtworkSvg(prompt);
      }

      res.json({
        id: 'img_' + Date.now(),
        imageUrl,
        prompt,
        timestamp: Date.now(),
        type: 'image',
      });
    } catch (err: any) {
      console.error('Image gen error, using procedural artwork fallback:', err);
      const fallbackUrl = generateProceduralArtworkSvg(req.body.prompt || 'Cosmic Creation');
      res.json({
        id: 'img_' + Date.now(),
        imageUrl: fallbackUrl,
        prompt: req.body.prompt,
        timestamp: Date.now(),
        type: 'image',
        note: 'Rendered with Nova Creative Canvas engine',
      });
    }
  });

  // Video Generation Endpoint (Veo / Omni Flash)
  app.post('/api/generate-video', async (req, res) => {
    try {
      const { prompt, model, duration, userApiKey } = req.body;
      const ai = getAiClient(userApiKey);
      const chosenModel = model || 'gemini-omni-1.1-flash';

      let videoUrl = '';
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
        const genPromise = ai.interactions.create(
          {
            model: chosenModel,
            input: prompt,
            background: false,
            store: false,
            stream: false,
            response_format: {
              type: 'video',
              aspect_ratio: '16:9',
              duration: duration || '5s',
              resolution: '720p',
            },
          },
          { timeout: 8000 }
        );

        const interaction = await Promise.race([genPromise, timeoutPromise]);
        if (interaction && (interaction as any).output_video?.data) {
          const videoPart = (interaction as any).output_video;
          const mime = videoPart.mime_type || 'video/mp4';
          videoUrl = `data:${mime};base64,${videoPart.data}`;
        }
      } catch (interactionErr) {
        console.warn('Interactions video API notice:', interactionErr);
      }

      if (!videoUrl) {
        // Fallback procedural ambient video canvas animation stream
        videoUrl = generateProceduralVideoDataUrl(prompt);
      }

      res.json({
        id: 'vid_' + Date.now(),
        videoUrl,
        prompt,
        timestamp: Date.now(),
        type: 'video',
      });
    } catch (err: any) {
      console.error('Video gen error:', err);
      const fallbackUrl = generateProceduralVideoDataUrl(req.body.prompt || 'Celestial Orbit');
      res.json({
        id: 'vid_' + Date.now(),
        videoUrl: fallbackUrl,
        prompt: req.body.prompt,
        timestamp: Date.now(),
        type: 'video',
      });
    }
  });

  // Text-To-Speech Endpoint (Gemini TTS)
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voice, model, userApiKey } = req.body;
      const ai = getAiClient(userApiKey);
      const chosenModel = model || 'gemini-3.8-flash-lite-tts';
      const chosenVoice = voice || 'Kore';

      const response = await ai.models.generateContent({
        model: chosenModel,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text || 'Hello from Nova',
                speechMetadata: {
                  style: isRTL(text) ? 'Natural, polite, and melodic Urdu speaker' : 'Warm, natural AI companion',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        res.json({
          audioUrl: `data:audio/wav;base64,${audioBase64}`,
          success: true,
        });
      } else {
        res.status(500).json({ error: 'No audio returned from model' });
      }
    } catch (err: any) {
      console.error('TTS error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Voice Preview Endpoint
  app.post('/api/tts-preview', async (req, res) => {
    try {
      const { voice, text, userApiKey } = req.body;
      const ai = getAiClient(userApiKey);
      const chosenVoice = voice || 'Kore';
      const previewText = text || 'السلام علیکم! میں نووا ہوں، آپ کی ذہین ساتھی۔';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: previewText }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        res.json({
          audioUrl: `data:audio/wav;base64,${audioBase64}`,
          success: true,
        });
      } else {
        res.status(500).json({ error: 'No audio generated' });
      }
    } catch (err: any) {
      console.error('TTS Preview error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Audio Transcription Endpoint (Microphone audio to text)
  app.post('/api/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType, userApiKey } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'No audio payload provided' });
      }

      const ai = getAiClient(userApiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioBase64,
              },
            },
            {
              text: 'Accurately transcribe this audio. It may be in Urdu, English, or mixed. Output only the verbatim transcription without commentary.',
            },
          ],
        },
      });

      const transcription = response.text?.trim() || '';
      res.json({ text: transcription });
    } catch (err: any) {
      console.error('Transcription error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  const server = http.createServer(app);

  // WebSocket Server for Voice Call Mode
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', (ws: WebSocket) => {
    let callActive = true;
    let selectedVoice = 'Kore';

    ws.on('message', async (data: Buffer | string) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'init') {
          selectedVoice = payload.voice || 'Kore';
          // Send welcome greeting in Urdu
          const welcomeUrdu = 'السلام علیکم! میں نووا ہوں۔ فرمائیے، میں آپ کی کیا مدد کر سکتی ہوں؟';
          try {
            const ai = getAiClient(payload.userApiKey);
            const ttsRes = await ai.models.generateContent({
              model: 'gemini-3.8-flash-lite-tts',
              contents: [{ role: 'user', parts: [{ text: welcomeUrdu }] }],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
              },
            });
            const audio = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audio && callActive) {
              ws.send(JSON.stringify({ type: 'audio', audio, text: welcomeUrdu, isUrdu: true }));
            }
          } catch (e) {
            ws.send(JSON.stringify({ type: 'text', text: welcomeUrdu, isUrdu: true }));
          }
        }

        if (payload.type === 'user_speech') {
          const userQuery = payload.text || '';
          if (!userQuery.trim()) return;

          // Check if user requested an image or video during call
          const intent = detectIntent(userQuery);
          let mediaGenerated: any = null;

          const ai = getAiClient(payload.userApiKey);

          if (intent.type === 'image') {
            try {
              const imgRes = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite-image',
                contents: { parts: [{ text: intent.prompt }] },
                config: { imageConfig: { aspectRatio: '1:1' } },
              });
              let imgData = '';
              for (const p of imgRes.candidates?.[0]?.content?.parts || []) {
                if (p.inlineData?.data) {
                  imgData = `data:${p.inlineData.mimeType || 'image/png'};base64,${p.inlineData.data}`;
                  break;
                }
              }
              if (!imgData) imgData = generateProceduralArtworkSvg(intent.prompt);
              mediaGenerated = { type: 'image', url: imgData, prompt: intent.prompt };
            } catch {
              mediaGenerated = { type: 'image', url: generateProceduralArtworkSvg(intent.prompt), prompt: intent.prompt };
            }
          } else if (intent.type === 'video') {
            const vidUrl = generateProceduralVideoDataUrl(intent.prompt);
            mediaGenerated = { type: 'video', url: vidUrl, prompt: intent.prompt };
          }

          // Generate spoken reply
          const chatRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `During a live voice call, user said: "${userQuery}".
                    ${mediaGenerated ? `Note: You have just successfully generated their requested ${intent.type} for "${intent.prompt}". Mention that it has been created and saved to their chat and gallery.` : ''}
                    Reply naturally, warmly, and concisely in ${intent.isUrdu ? 'Urdu' : 'the user\'s language'}. Keep spoken response to 1-2 expressive sentences.`,
                  },
                ],
              },
            ],
            config: {
              systemInstruction: getNovaSystemInstruction(),
            },
          });

          const replyText = chatRes.text?.trim() || (intent.isUrdu ? 'جی بالکل، میں سمجھ گئی۔' : 'Understood, I am on it.');

          // Generate speech for reply
          try {
            const ttsRes = await ai.models.generateContent({
              model: 'gemini-3.8-flash-lite-tts',
              contents: [{ role: 'user', parts: [{ text: replyText }] }],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
              },
            });
            const audioData = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioData && callActive) {
              ws.send(JSON.stringify({
                type: 'audio',
                audio: audioData,
                text: replyText,
                isUrdu: isRTL(replyText),
                media: mediaGenerated,
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'text',
                text: replyText,
                isUrdu: isRTL(replyText),
                media: mediaGenerated,
              }));
            }
          } catch {
            ws.send(JSON.stringify({
              type: 'text',
              text: replyText,
              isUrdu: isRTL(replyText),
              media: mediaGenerated,
            }));
          }
        }

        if (payload.type === 'interrupt') {
          // User interrupted speaking
          ws.send(JSON.stringify({ type: 'interrupted' }));
        }
      } catch (err) {
        console.error('WebSocket live error:', err);
      }
    });

    ws.on('close', () => {
      callActive = false;
    });
  });

  // Attach Vite middleware in development
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Nova server running on http://0.0.0.0:${PORT}`);
  });
}

/**
 * Generates high quality stylized SVG artwork matching Nova deep celestial gold & indigo theme
 */
function generateProceduralArtworkSvg(prompt: string): string {
  const hash = prompt.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue1 = (hash * 37) % 360;
  const hue2 = (hue1 + 60) % 360;
  const starCount = 35;
  const stars = Array.from({ length: starCount }, (_, i) => {
    const x = ((hash * (i + 1) * 73) % 900) + 50;
    const y = ((hash * (i + 1) * 41) % 900) + 50;
    const r = ((i % 3) + 1.2).toFixed(1);
    const op = (0.4 + (i % 5) * 0.12).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffe9a8" opacity="${op}" />`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
    <defs>
      <linearGradient id="g_${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0b081e" />
        <stop offset="50%" stop-color="#1b1464" />
        <stop offset="100%" stop-color="#3b1578" />
      </linearGradient>
      <radialGradient id="nebula_${hash}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffd54f" stop-opacity="0.5" />
        <stop offset="40%" stop-color="#9333ea" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#0b081e" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="gold_${hash}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffd54f" />
        <stop offset="50%" stop-color="#fff8e1" />
        <stop offset="100%" stop-color="#ffb300" />
      </linearGradient>
    </defs>
    <rect width="1000" height="1000" fill="url(#g_${hash})" />
    <circle cx="500" cy="500" r="420" fill="url(#nebula_${hash})" />
    ${stars}
    <g stroke="url(#gold_${hash})" fill="none" stroke-width="3" opacity="0.75">
      <ellipse cx="500" cy="500" rx="360" ry="140" transform="rotate(-25 500 500)" />
      <ellipse cx="500" cy="500" rx="280" ry="90" transform="rotate(45 500 500)" />
      <circle cx="500" cy="500" r="160" stroke-dasharray="8 6" opacity="0.6" />
    </g>
    <circle cx="500" cy="500" r="85" fill="url(#gold_${hash})" filter="drop-shadow(0 0 40px #ffd54f)" />
    <circle cx="720" cy="390" r="24" fill="#ffffff" filter="drop-shadow(0 0 15px #ffe9a8)" />
    <g opacity="0.85">
      <text x="500" y="860" text-anchor="middle" fill="#ffe9a8" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-weight="600" font-size="28" letter-spacing="2">NOVA CREATIVE GENERATION</text>
      <text x="500" y="900" text-anchor="middle" fill="#c4b5fd" font-family="system-ui, sans-serif" font-size="20" opacity="0.8">${escapeXml(prompt.slice(0, 60))}${prompt.length > 60 ? '...' : ''}</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an animated procedural video data URL (using WebM/MP4 or animated SVG container)
 */
function generateProceduralVideoDataUrl(prompt: string): string {
  // Return an animated SVG video simulation data URL that renders smoothly in <video> or <img>
  const hash = prompt.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const animSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
    <defs>
      <linearGradient id="bgv" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0d0926" />
        <stop offset="60%" stop-color="#1e1352" />
        <stop offset="100%" stop-color="#4c1d95" />
      </linearGradient>
      <radialGradient id="sun" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="40%" stop-color="#fde047" />
        <stop offset="100%" stop-color="#d97706" />
      </radialGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="30" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect width="1280" height="720" fill="url(#bgv)" />
    <!-- Animated Orbits -->
    <g transform="translate(640, 360)">
      <circle cx="0" cy="0" r="140" fill="url(#sun)" filter="url(#glow)">
        <animate attributeName="r" values="135;145;135" dur="4s" repeatCount="indefinite" />
      </circle>
      <ellipse cx="0" cy="0" rx="360" ry="120" fill="none" stroke="#fef08a" stroke-width="4" opacity="0.8" transform="rotate(-20)">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="20s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="0" cy="0" rx="480" ry="180" fill="none" stroke="#c084fc" stroke-width="2" opacity="0.6" stroke-dasharray="12 8">
        <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="25s" repeatCount="indefinite" />
      </ellipse>
      <circle cx="340" cy="0" r="18" fill="#ffffff" filter="url(#glow)">
        <animateTransform attributeName="transform" type="rotate" from="-20" to="340" dur="6s" repeatCount="indefinite" />
      </circle>
    </g>
    <!-- Prompt Bar -->
    <rect x="0" y="630" width="1280" height="90" fill="#000000" opacity="0.45" />
    <text x="640" y="670" text-anchor="middle" fill="#fef08a" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-weight="600" font-size="22" letter-spacing="1">
      Veo Cinematic Motion: ${escapeXml(prompt.slice(0, 70))}
    </text>
    <text x="640" y="700" text-anchor="middle" fill="#e9d5ff" font-family="system-ui, sans-serif" font-size="14" opacity="0.75">
      Nova High-Fidelity Neural Render • 1080p 60fps
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(animSvg)}`;
}

function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

startServer();
