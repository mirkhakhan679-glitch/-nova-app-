import { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, Download, Sparkles, Image as ImageIcon, Film, Loader2 } from 'lucide-react';
import { isRTL } from '../utils/language.ts';
import type { ChatMessage as ChatMessageType, MediaItem } from '../types.ts';

interface ChatMessageProps {
  message: ChatMessageType;
  onPlayTts: (text: string) => Promise<string | null>;
  onOpenMedia?: (media: MediaItem) => void;
}

export function ChatMessage({ message, onPlayTts, onOpenMedia }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const hasUrdu = message.isUrdu ?? isRTL(message.content);
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleTts = async () => {
    if (isPlayingAudio && audioElement) {
      audioElement.pause();
      setIsPlayingAudio(false);
      return;
    }

    if (message.audioUrl) {
      playExistingAudio(message.audioUrl);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const audioUrl = await onPlayTts(message.content);
      setIsLoadingAudio(false);
      if (audioUrl) {
        playExistingAudio(audioUrl);
      }
    } catch {
      setIsLoadingAudio(false);
    }
  };

  const playExistingAudio = (url: string) => {
    const audio = new Audio(url);
    setAudioElement(audio);
    setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
    audio.play();
  };

  const handleDownloadMedia = (media: MediaItem) => {
    const a = document.createElement('a');
    a.href = media.url;
    a.download = `nova_${media.type}_${media.id}.${media.type === 'image' ? 'png' : 'mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`group w-full flex items-start gap-3 sm:gap-4 py-4 px-3 sm:px-6 transition-colors ${
        isAssistant ? 'bg-[#130f30]/40 border-y border-purple-900/20' : 'bg-transparent'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {isAssistant ? (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1b1464] to-[#6a2bd9] p-0.5 shadow-md shadow-purple-950/50">
            <img
              src="/assets/aistudio/nova-logo_2b31ef35.svg"
              alt="Nova"
              className="w-full h-full rounded-[10px]"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold text-xs shadow-md">
            You
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Author Name and Timestamp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${isAssistant ? 'text-[#ffe9a8]' : 'text-purple-200'}`}>
              {isAssistant ? 'Nova' : 'You'}
            </span>
            <span className="text-[10px] text-purple-400/60 font-mono">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Action buttons (Copy & TTS) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {isAssistant && (
              <button
                onClick={handleToggleTts}
                disabled={isLoadingAudio}
                className="p-1 rounded-md text-purple-400 hover:text-amber-200 hover:bg-white/5 transition-colors"
                title={isPlayingAudio ? 'Stop speaking' : 'Listen with Gemini TTS'}
                aria-label={isPlayingAudio ? 'Stop voice readout' : 'Read message aloud with Gemini voice'}
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : isPlayingAudio ? (
                  <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-purple-400 hover:text-amber-200 hover:bg-white/5 transition-colors"
              title="Copy message"
              aria-label="Copy message text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Text Content */}
        {message.content && (
          <div
            dir={hasUrdu ? 'rtl' : 'ltr'}
            className={`text-sm sm:text-[15px] leading-relaxed break-words ${
              hasUrdu
                ? 'font-urdu text-right text-amber-50/95 leading-[2.1] text-base sm:text-lg'
                : 'text-slate-100 text-left'
            }`}
          >
            {message.content}
          </div>
        )}

        {/* Media Generation Card */}
        {message.media && (
          <div className="pt-2">
            <div className="max-w-md rounded-2xl overflow-hidden bg-[#18123c] border border-purple-500/30 shadow-xl group/card">
              {message.media.type === 'image' ? (
                <div
                  className="relative aspect-square w-full cursor-pointer bg-black/40 overflow-hidden"
                  onClick={() => onOpenMedia?.(message.media!)}
                >
                  <img
                    src={message.media.url}
                    alt={message.media.prompt}
                    className="w-full h-full object-cover group-hover/card:scale-[1.02] transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-semibold text-amber-200 border border-amber-400/30 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Gemini Image</span>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-video w-full bg-black/50 overflow-hidden flex items-center justify-center">
                  <img
                    src={message.media.url}
                    alt={message.media.prompt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-semibold text-purple-200 border border-purple-400/30 flex items-center gap-1.5">
                    <Film className="w-3 h-3 text-purple-400" />
                    <span>Veo Video Generation</span>
                  </div>
                </div>
              )}

              {/* Card Footer with Details & Download */}
              <div className="p-3 bg-[#130f30] border-t border-purple-900/40 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-amber-100 font-medium truncate" title={message.media.prompt}>
                    {message.media.prompt}
                  </p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Check className="w-3 h-3" />
                    <span>Saved automatically to Gallery</span>
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadMedia(message.media!)}
                  className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 transition-all text-xs font-semibold flex items-center gap-1"
                  title="Download File"
                  aria-label="Download generated media"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
