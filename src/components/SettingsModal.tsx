import { useState } from 'react';
import { X, Key, Sliders, Volume2, Play, Square, Loader2, Sparkles, Check, Globe } from 'lucide-react';
import { AVAILABLE_VOICES, VoiceOption } from '../utils/audio.ts';
import type { AppSettings } from '../types.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (updated: AppSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  if (!isOpen) return null;

  const handlePlayPreview = async (voice: VoiceOption) => {
    // If currently playing, stop it
    if (audioInstance) {
      audioInstance.pause();
      audioInstance.currentTime = 0;
      setAudioInstance(null);
      if (playingVoiceId === voice.id) {
        setPlayingVoiceId(null);
        return;
      }
    }

    setLoadingVoiceId(voice.id);

    try {
      const response = await fetch('/api/tts-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: voice.id,
          text: voice.previewTextUrdu,
          userApiKey: formData.apiKey,
        }),
      });

      const data = await response.json();
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        setAudioInstance(audio);
        setPlayingVoiceId(voice.id);
        setLoadingVoiceId(null);

        audio.onended = () => {
          setPlayingVoiceId(null);
          setAudioInstance(null);
        };
        audio.onerror = () => {
          setPlayingVoiceId(null);
          setLoadingVoiceId(null);
          setAudioInstance(null);
        };

        await audio.play();
      } else {
        setLoadingVoiceId(null);
      }
    } catch (err) {
      console.error('Failed to preview voice:', err);
      setLoadingVoiceId(null);
      setPlayingVoiceId(null);
    }
  };

  const handleSave = () => {
    onSave(formData);
    setShowSavedFeedback(true);
    setTimeout(() => {
      setShowSavedFeedback(false);
      onClose();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Nova Settings"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#120e2e] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/50 bg-[#161138]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-100">Settings & AI Models</h2>
              <p className="text-xs text-purple-300/70">Configure your Gemini keys, models, and realistic voice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-purple-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Gemini API Key */}
          <section className="space-y-2">
            <label className="flex items-center gap-2 font-semibold text-amber-200">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Gemini API Key</span>
            </label>
            <input
              type="password"
              placeholder="Paste custom Gemini API key (leave blank to use default server key)"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1442] border border-purple-500/30 text-white placeholder-purple-300/40 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono text-xs"
            />
            <p className="text-xs text-purple-300/60 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Default server key is pre-configured. Paste your own key to override quotas.
            </p>
          </section>

          {/* Model Selections Grid */}
          <section className="space-y-4 pt-2 border-t border-purple-900/40">
            <h3 className="font-semibold text-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Model Architecture Swapping
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Text Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-purple-200">Text & Brain Model</label>
                <select
                  value={formData.textModel}
                  onChange={(e) => setFormData({ ...formData, textModel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1b1442] border border-purple-500/30 text-white focus:outline-none focus:border-amber-400 text-xs cursor-pointer"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended, Fast & Responsive)</option>
                  <option value="gemini-4-argon">gemini-4-argon (Complex Deep Reasoning)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Lightweight)</option>
                </select>
              </div>

              {/* Image Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-purple-200">Image Generation Model</label>
                <select
                  value={formData.imageModel}
                  onChange={(e) => setFormData({ ...formData, imageModel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1b1442] border border-purple-500/30 text-white focus:outline-none focus:border-amber-400 text-xs cursor-pointer"
                >
                  <option value="gemini-3.1-flash-lite-image">gemini-3.1-flash-lite-image (Standard Fast)</option>
                  <option value="gemini-nano-banana-2.1">gemini-nano-banana-2.1 (High-Quality 2K/4K)</option>
                  <option value="gemini-3-pro-image">gemini-3-pro-image (Pro Resolution)</option>
                </select>
              </div>

              {/* Video Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-purple-200">Video Generation Model (Veo)</label>
                <select
                  value={formData.videoModel}
                  onChange={(e) => setFormData({ ...formData, videoModel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1b1442] border border-purple-500/30 text-white focus:outline-none focus:border-amber-400 text-xs cursor-pointer"
                >
                  <option value="gemini-omni-1.1-flash">gemini-omni-1.1-flash (Veo Omni Flash Motion)</option>
                </select>
              </div>

              {/* Voice TTS Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-purple-200">Voice Synthesis (TTS) Model</label>
                <select
                  value={formData.voiceModel}
                  onChange={(e) => setFormData({ ...formData, voiceModel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1b1442] border border-purple-500/30 text-white focus:outline-none focus:border-amber-400 text-xs cursor-pointer"
                >
                  <option value="gemini-3.8-flash-lite-tts">gemini-3.8-flash-lite-tts (High Throughput & Natural)</option>
                  <option value="gemini-3.8-flash-tts">gemini-3.8-flash-tts (Flagship Expressive Voice Design)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Voice Personality & Preview Section */}
          <section className="space-y-3 pt-2 border-t border-purple-900/40">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-amber-200 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  Voice Persona Selection
                </h3>
                <p className="text-xs text-purple-300/70">Listen to previews with natural human expression</p>
              </div>

              {/* Voice Replies Toggle */}
              <label className="flex items-center gap-2 text-xs font-medium text-amber-200 cursor-pointer">
                <span>Spoken replies in chat:</span>
                <input
                  type="checkbox"
                  checked={formData.voiceRepliesEnabled}
                  onChange={(e) => setFormData({ ...formData, voiceRepliesEnabled: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                />
              </label>
            </div>

            <div className="space-y-2.5">
              {AVAILABLE_VOICES.map((v) => {
                const isSelected = formData.voice === v.id;
                const isPlaying = playingVoiceId === v.id;
                const isLoading = loadingVoiceId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => setFormData({ ...formData, voice: v.id })}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-400/60 shadow-[0_0_15px_rgba(255,213,79,0.15)]'
                        : 'bg-[#1b1442]/70 border-purple-500/20 hover:border-purple-400/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-amber-400 bg-amber-400' : 'border-purple-400/60'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-100">{v.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/60 text-purple-300 font-mono">
                            {v.gender}
                          </span>
                        </div>
                        <p className="text-xs text-purple-200/80 font-urdu mt-0.5">{v.personaUrdu}</p>
                      </div>
                    </div>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPreview(v);
                      }}
                      disabled={isLoading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isPlaying
                          ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200'
                      }`}
                      aria-label={`Preview voice ${v.name}`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isPlaying ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Preview</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Language Preference */}
          <section className="space-y-2 pt-2 border-t border-purple-900/40">
            <label className="flex items-center gap-2 font-semibold text-amber-200">
              <Globe className="w-4 h-4 text-amber-400" />
              <span>Language Behavior</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'auto', label: 'Auto (Follow User)', desc: 'Urdu or English' },
                { id: 'urdu', label: 'اردو (Urdu Default)', desc: 'Always replies in Urdu' },
                { id: 'english', label: 'English Only', desc: 'Always replies in English' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, preferredLanguage: lang.id as any })}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    formData.preferredLanguage === lang.id
                      ? 'bg-amber-500/15 border-amber-400 text-amber-100 font-semibold'
                      : 'bg-[#1b1442]/60 border-purple-500/20 text-purple-200/80 hover:bg-[#1b1442]'
                  }`}
                >
                  <div className="text-xs font-medium">{lang.label}</div>
                  <div className="text-[10px] text-purple-300/60 mt-0.5">{lang.desc}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-purple-900/50 bg-[#161138]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-purple-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            {showSavedFeedback ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Preferences</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
