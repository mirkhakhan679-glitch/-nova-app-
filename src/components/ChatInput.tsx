import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Sparkles, Image as ImageIcon, Film, Loader2 } from 'lucide-react';
import { isRTL } from '../utils/language.ts';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const SUGGESTION_CHIPS = [
  { label: 'ایک سنہری عقاب کی تصویر بنائیں', type: 'image' },
  { label: 'Make a video of ocean waves crashing at sunset', type: 'video' },
  { label: 'مجھے اردو شاعری اور غالب کے بارے میں بتائیں', type: 'text' },
  { label: 'Draw a futuristic cyberpunk library', type: 'image' },
];

export function ChatInput({ onSendMessage, isLoading, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const isTextUrdu = isRTL(text);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || disabled) return;
    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    startRecording();
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ur-PK'; // Urdu default, automatically recognizes English too

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setText(transcript);
      };

      recognition.onerror = (err: any) => {
        console.warn('Recognition error:', err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 select-none">
      {/* Quick Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SUGGESTION_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(chip.label)}
            disabled={isLoading || disabled}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#17123d]/70 hover:bg-[#231b5c] border border-purple-500/20 hover:border-amber-400/40 text-xs text-purple-200 hover:text-amber-100 transition-all shadow-sm"
          >
            {chip.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-amber-400" />}
            {chip.type === 'video' && <Film className="w-3.5 h-3.5 text-purple-400" />}
            {chip.type === 'text' && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
            <span className={isRTL(chip.label) ? 'font-urdu' : ''}>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Main Input Box */}
      <div className="relative flex items-end gap-2 bg-[#140e34] border border-purple-500/30 rounded-2xl p-2.5 shadow-2xl focus-within:border-amber-400/70 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
        {/* Microphone Button */}
        <button
          type="button"
          onClick={toggleRecording}
          disabled={disabled || isLoading}
          className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
            isRecording
              ? 'bg-red-500/20 border border-red-500 text-red-400 animate-pulse'
              : 'text-purple-300 hover:text-amber-200 hover:bg-white/5'
          }`}
          title={isRecording ? 'Listening... click to stop' : 'Voice input (Speech to Text)'}
          aria-label={isRecording ? 'Stop voice recording' : 'Start voice input'}
        >
          {isRecording ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          dir={isTextUrdu ? 'rtl' : 'ltr'}
          placeholder={
            isRecording
              ? 'Listening... speak in Urdu or English...'
              : 'Ask Nova in Urdu or English, or request an image / video...'
          }
          rows={1}
          disabled={disabled || isLoading}
          className={`w-full bg-transparent text-slate-100 placeholder-purple-300/40 focus:outline-none resize-none py-1.5 px-2 text-sm leading-relaxed ${
            isTextUrdu ? 'font-urdu text-right text-base' : 'text-left'
          }`}
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading || disabled}
          className={`p-2.5 rounded-xl flex-shrink-0 transition-all ${
            text.trim() && !isLoading && !disabled
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 active:scale-95'
              : 'text-purple-500/40 bg-white/5 cursor-not-allowed'
          }`}
          aria-label="Send message to Nova"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-purple-400/60 font-sans">
        <span>
          Nova defaults to Urdu (<span className="font-urdu">اردو</span>) and mirrors your language.
        </span>
        <span>Press Enter to send, Shift + Enter for new line</span>
      </div>
    </div>
  );
}
