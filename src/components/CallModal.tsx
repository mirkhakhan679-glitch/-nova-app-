import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Sparkles, Volume2, VolumeX, Image as ImageIcon, Film } from 'lucide-react';
import { ThreeOrb } from './ThreeOrb.tsx';
import { formatCallDuration } from '../utils/audio.ts';
import { isRTL } from '../utils/language.ts';
import type { MediaItem, ChatMessage, AppSettings } from '../types.ts';

interface CallModalProps {
  isOpen: boolean;
  onClose: (callLogs: ChatMessage[]) => void;
  settings: AppSettings;
  onMediaGenerated: (item: MediaItem) => void;
}

export function CallModal({ isOpen, onClose, settings, onMediaGenerated }: CallModalProps) {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callState, setCallState] = useState<'connecting' | 'listening' | 'speaking' | 'processing'>('connecting');
  const [latestNovaText, setLatestNovaText] = useState('السلام علیکم! میں نووا ہوں۔');
  const [latestUserText, setLatestUserText] = useState('');
  const [audioAmplitude, setAudioAmplitude] = useState(0.2);
  const [callMediaList, setCallMediaList] = useState<MediaItem[]>([]);

  const callLogsRef = useRef<ChatMessage[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<number | null>(null);
  const isCallActiveRef = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    isCallActiveRef.current = true;
    setDuration(0);
    callLogsRef.current = [];
    setCallMediaList([]);

    // Call timer
    timerRef.current = window.setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // Setup WebSocket connection to server /live endpoint
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setCallState('listening');
        ws.send(JSON.stringify({
          type: 'init',
          voice: settings.voice,
          userApiKey: settings.apiKey,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'audio' && data.audio) {
            setCallState('speaking');
            setLatestNovaText(data.text || '');

            callLogsRef.current.push({
              id: 'call_nova_' + Date.now(),
              role: 'assistant',
              content: data.text || '',
              timestamp: Date.now(),
              isUrdu: data.isUrdu ?? isRTL(data.text || ''),
              media: data.media || undefined,
            });

            if (data.media) {
              setCallMediaList((prev) => [...prev, data.media]);
              onMediaGenerated(data.media);
            }

            playAudioBase64(data.audio);
          } else if (data.type === 'text') {
            setCallState('listening');
            setLatestNovaText(data.text || '');
            callLogsRef.current.push({
              id: 'call_nova_' + Date.now(),
              role: 'assistant',
              content: data.text || '',
              timestamp: Date.now(),
              isUrdu: data.isUrdu ?? isRTL(data.text || ''),
              media: data.media || undefined,
            });
            if (data.media) {
              setCallMediaList((prev) => [...prev, data.media]);
              onMediaGenerated(data.media);
            }
          } else if (data.type === 'interrupted') {
            stopAudioPlayback();
            setCallState('listening');
          }
        } catch (err) {
          console.error('Error handling WS message:', err);
        }
      };

      ws.onerror = (e) => {
        console.warn('WS error, fallback to HTTP voice synthesis:', e);
        setCallState('listening');
      };
    } catch (e) {
      console.warn('WebSocket init error, fallback active:', e);
      setCallState('listening');
    }

    // Initialize Web Speech Recognition for continuous listening
    setupSpeechRecognition();

    return () => {
      isCallActiveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudioPlayback();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isOpen]);

  const setupSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ur-PK'; // Urdu default, handles English terms

      recognition.onstart = () => {
        if (callState === 'connecting') setCallState('listening');
      };

      recognition.onresult = (event: any) => {
        if (!isCallActiveRef.current || isMuted) return;

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        const currentSpeech = final || interim;
        if (currentSpeech.trim()) {
          setLatestUserText(currentSpeech);

          // If Nova is speaking, user is interrupting!
          if (callState === 'speaking') {
            handleUserInterruption();
          }

          if (final.trim()) {
            handleUserSpoke(final.trim());
          }
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition warning:', err.error);
        if (err.error === 'not-allowed') {
          setIsMuted(true);
        }
      };

      recognition.onend = () => {
        if (isCallActiveRef.current && !isMuted) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Error starting speech recognition:', e);
    }
  };

  const handleUserInterruption = () => {
    stopAudioPlayback();
    setCallState('listening');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
  };

  const stopAudioPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  };

  const playAudioBase64 = (base64Audio: string) => {
    if (isSpeakerMuted) return;
    stopAudioPlayback();

    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    audioRef.current = audio;

    audio.onplay = () => {
      setCallState('speaking');
      setAudioAmplitude(0.65);
    };

    audio.ontimeupdate = () => {
      // Simulate pulsating amplitude
      setAudioAmplitude(0.3 + Math.random() * 0.45);
    };

    audio.onended = () => {
      setCallState('listening');
      setAudioAmplitude(0.15);
      audioRef.current = null;
    };

    audio.play().catch((err) => {
      console.warn('Audio play prevented:', err);
      setCallState('listening');
    });
  };

  const handleUserSpoke = async (spokenText: string) => {
    if (!spokenText.trim()) return;

    callLogsRef.current.push({
      id: 'call_user_' + Date.now(),
      role: 'user',
      content: spokenText,
      timestamp: Date.now(),
      isUrdu: isRTL(spokenText),
    });

    setCallState('processing');

    // Send through WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'user_speech',
        text: spokenText,
        voice: settings.voice,
        userApiKey: settings.apiKey,
      }));
    } else {
      // HTTP fallback
      try {
        const chatRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: callLogsRef.current,
            model: settings.textModel,
            userApiKey: settings.apiKey,
          }),
        });
        const chatData = await chatRes.json();
        const replyText = chatData.text || '';
        setLatestNovaText(replyText);

        callLogsRef.current.push({
          id: 'call_nova_' + Date.now(),
          role: 'assistant',
          content: replyText,
          timestamp: Date.now(),
          isUrdu: chatData.isUrdu ?? isRTL(replyText),
        });

        // Fetch TTS
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: replyText,
            voice: settings.voice,
            model: settings.voiceModel,
            userApiKey: settings.apiKey,
          }),
        });
        const ttsData = await ttsRes.json();
        if (ttsData.audioUrl) {
          const rawBase64 = ttsData.audioUrl.split(',')[1];
          playAudioBase64(rawBase64);
        } else {
          setCallState('listening');
        }
      } catch (err) {
        console.error('Call HTTP fallback error:', err);
        setCallState('listening');
      }
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      } else if (!next && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
      return next;
    });
  };

  const handleEndCall = () => {
    stopAudioPlayback();
    onClose(callLogsRef.current);
  };

  if (!isOpen) return null;

  const isUrduSubtitle = isRTL(latestNovaText);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-[#0b081e] via-[#120b33] to-[#1c0c45] text-white select-none animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Nova Voice Call"
    >
      {/* Top Header Bar */}
      <header className="w-full flex items-center justify-between px-6 py-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <img
            src="/assets/aistudio/nova-logo_2b31ef35.svg"
            alt="Nova Logo"
            className="w-10 h-10 drop-shadow-[0_0_12px_rgba(255,213,79,0.5)]"
          />
          <div>
            <h1 className="font-bold text-lg tracking-wide text-[#ffe9a8]">Nova Live</h1>
            <p className="text-xs text-purple-300/80 font-mono">
              {callState === 'connecting' && 'Connecting...'}
              {callState === 'listening' && 'Listening (Urdu / English)...'}
              {callState === 'speaking' && 'Nova Speaking'}
              {callState === 'processing' && 'Thinking...'}
            </p>
          </div>
        </div>

        {/* Call Duration Pill */}
        <div className="flex items-center gap-2 bg-[#1f1647]/80 border border-[#ffd54f]/30 px-4 py-1.5 rounded-full shadow-lg backdrop-blur-md">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-mono text-sm tracking-wider text-amber-100 font-semibold">
            {formatCallDuration(duration)}
          </span>
        </div>

        {/* Speaker Mute Action */}
        <button
          onClick={() => {
            if (!isSpeakerMuted) stopAudioPlayback();
            setIsSpeakerMuted(!isSpeakerMuted);
          }}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 transition-all text-purple-200"
          aria-label={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
        >
          {isSpeakerMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </header>

      {/* Main 3D Orb Stage */}
      <main className="relative flex-1 w-full max-w-2xl flex flex-col items-center justify-center px-4">
        {/* Glow ambient background aura */}
        <div className="absolute w-72 h-72 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
        <div className="absolute w-56 h-56 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

        {/* 3D Three.js Orb */}
        <div className="relative w-80 h-80 sm:w-96 sm:h-96">
          <ThreeOrb
            isSpeaking={callState === 'speaking'}
            isListening={callState === 'listening'}
            audioAmplitude={audioAmplitude}
            className="w-full h-full"
          />
        </div>

        {/* Subtitles & Spoken Dialogue */}
        <div className="w-full max-w-xl min-h-[96px] mt-2 px-6 py-4 rounded-2xl bg-[#1b1448]/60 border border-purple-500/20 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center text-center">
          {latestUserText && (
            <p className="text-xs text-amber-200/70 mb-1 line-clamp-1 italic">
              User: "{latestUserText}"
            </p>
          )}
          <p
            dir={isUrduSubtitle ? 'rtl' : 'ltr'}
            className={`text-lg sm:text-xl font-medium transition-all duration-300 ${
              isUrduSubtitle ? 'font-urdu leading-relaxed text-amber-100' : 'text-slate-100'
            }`}
          >
            {latestNovaText}
          </p>
        </div>

        {/* Generated Media Notification during call */}
        {callMediaList.length > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs animate-bounce">
            {callMediaList[callMediaList.length - 1].type === 'image' ? (
              <ImageIcon className="w-4 h-4 text-amber-400" />
            ) : (
              <Film className="w-4 h-4 text-purple-400" />
            )}
            <span>
              Generated {callMediaList[callMediaList.length - 1].type} saved to chat & gallery!
            </span>
          </div>
        )}
      </main>

      {/* Bottom Controls Dock */}
      <footer className="w-full max-w-md pb-10 px-6 flex flex-col items-center gap-4">
        {/* Quick Interrupt / Tap button if Nova is speaking */}
        {callState === 'speaking' && (
          <button
            onClick={handleUserInterruption}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-medium transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interrupt Nova & Speak</span>
          </button>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-8 w-full">
          {/* Mute Mic Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all shadow-lg active:scale-95 ${
                isMuted
                  ? 'bg-red-500/20 border border-red-500 text-red-300 hover:bg-red-500/30'
                  : 'bg-white/10 hover:bg-white/20 border border-white/15 text-white'
              }`}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <span className="text-xs text-purple-200/80 font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
          </div>

          {/* End Call Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleEndCall}
              className="p-5 rounded-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-xl shadow-red-900/40 transition-all hover:scale-105 active:scale-95 border border-red-400/30"
              aria-label="End Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs text-rose-300 font-semibold">End Call</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
