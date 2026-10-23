import { PhoneCall, Sliders, Image as ImageIcon, Volume2, VolumeX, Menu } from 'lucide-react';
import type { AppSettings } from '../types.ts';

interface HeaderProps {
  onOpenCall: () => void;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  mediaCount: number;
}

export function Header({
  onOpenCall,
  onOpenGallery,
  onOpenSettings,
  onToggleSidebar,
  settings,
  onUpdateSettings,
  mediaCount,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-[#0e0a26]/90 backdrop-blur-md border-b border-purple-900/40 px-4 flex items-center justify-between select-none">
      {/* Left branding */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-purple-300 hover:text-white hover:bg-white/5 md:hidden transition-colors"
          aria-label="Toggle sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 cursor-pointer">
          <div className="relative group">
            <img
              src="/assets/aistudio/nova-logo_2b31ef35.svg"
              alt="Nova Logo"
              className="w-9 h-9 rounded-xl drop-shadow-[0_0_12px_rgba(255,213,79,0.45)] transition-transform group-hover:scale-105"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0e0a26]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-wide text-[#ffe9a8]">Nova</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-medium">
                Gemini
              </span>
            </div>
            <p className="text-[11px] text-purple-300/70 hidden sm:block font-urdu">
              ذہین، خوبصورت، کثیر لسانی رفیق
            </p>
          </div>
        </div>
      </div>

      {/* Center / Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Prominent "Call Nova" Button */}
        <button
          onClick={onOpenCall}
          className="relative group flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(255,213,79,0.35)] hover:shadow-[0_0_28px_rgba(255,213,79,0.55)] transition-all transform hover:scale-[1.02] active:scale-95"
          aria-label="Call Nova Live Voice Mode"
        >
          <div className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
          <PhoneCall className="w-4 h-4 fill-current" />
          <span className="tracking-wide">Call Nova</span>
        </button>

        {/* Gallery button with count */}
        <button
          onClick={onOpenGallery}
          className="relative p-2 sm:px-3 sm:py-2 rounded-xl bg-[#1b1442]/80 hover:bg-[#251b5c] border border-purple-500/20 text-purple-200 text-xs font-medium flex items-center gap-1.5 transition-all"
          title="Creative Gallery"
          aria-label="Open creative gallery"
        >
          <ImageIcon className="w-4 h-4 text-amber-300" />
          <span className="hidden sm:inline">Gallery</span>
          {mediaCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
              {mediaCount}
            </span>
          )}
        </button>

        {/* Voice reply quick toggle */}
        <button
          onClick={() =>
            onUpdateSettings({ ...settings, voiceRepliesEnabled: !settings.voiceRepliesEnabled })
          }
          className={`p-2 rounded-xl border transition-all text-xs flex items-center gap-1 ${
            settings.voiceRepliesEnabled
              ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
              : 'bg-[#1b1442]/60 border-purple-500/20 text-purple-400/70 hover:text-purple-200'
          }`}
          title={settings.voiceRepliesEnabled ? 'Voice replies enabled' : 'Voice replies muted'}
          aria-label="Toggle voice replies"
        >
          {settings.voiceRepliesEnabled ? (
            <Volume2 className="w-4 h-4 text-amber-300" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
          <span className="hidden lg:inline text-[11px]">
            {settings.voiceRepliesEnabled ? 'Voice On' : 'Voice Off'}
          </span>
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-[#1b1442]/80 hover:bg-[#251b5c] border border-purple-500/20 text-purple-200 transition-all"
          title="Settings"
          aria-label="Open settings"
        >
          <Sliders className="w-4 h-4 text-purple-300" />
        </button>
      </div>
    </header>
  );
}
