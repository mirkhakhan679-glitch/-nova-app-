import { Plus, MessageSquare, PhoneCall, Image as ImageIcon, Sliders, Trash2, X } from 'lucide-react';
import type { Conversation } from '../types.ts';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onOpenCall: () => void;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  mediaCount: number;
}

export function Sidebar({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onOpenCall,
  onOpenGallery,
  onOpenSettings,
  mediaCount,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fadeIn"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 flex flex-col bg-[#0b081e] border-r border-purple-900/40 transform transition-transform duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand & New Chat */}
        <div className="p-4 border-b border-purple-900/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/nova-logo_2b31ef35.svg"
                alt="Nova"
                className="w-8 h-8 rounded-xl"
              />
              <span className="font-bold text-lg text-[#ffe9a8]">Nova AI</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-purple-300 hover:text-white rounded-lg md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-700 hover:to-indigo-800 border border-purple-500/30 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
            aria-label="Start new chat"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Big "Call Nova" Quick Action */}
        <div className="p-3">
          <button
            onClick={() => {
              onOpenCall();
              onClose();
            }}
            className="w-full p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#1b1448] to-[#251557] border border-amber-400/40 hover:border-amber-400 flex items-center gap-3 text-left transition-all group shadow-lg"
            aria-label="Start Voice Call with Nova"
          >
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 group-hover:scale-105 transition-transform shadow-md">
              <PhoneCall className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="font-bold text-xs text-amber-200">Call Nova Live</div>
              <p className="text-[10px] text-purple-200/70">Real-time voice & 3D orb</p>
            </div>
          </button>
        </div>

        {/* Conversations History */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 pb-1.5 text-[11px] font-semibold text-purple-400/60 uppercase tracking-wider">
            Recent Conversations
          </div>

          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-purple-400/50">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onClose();
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#1b1442] border border-amber-400/30 text-amber-100 font-medium'
                      : 'text-purple-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-purple-400'}`} />
                    <span className={`text-xs truncate ${conv.title && /[\u0600-\u06FF]/.test(conv.title) ? 'font-urdu' : ''}`}>
                      {conv.title || 'Conversation'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-purple-400 hover:text-red-400 transition-opacity"
                    title="Delete conversation"
                    aria-label={`Delete conversation ${conv.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Navigation Links */}
        <div className="p-3 border-t border-purple-900/30 space-y-1">
          <button
            onClick={() => {
              onOpenGallery();
              onClose();
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl text-purple-200 hover:bg-white/5 hover:text-white transition-colors text-xs"
            aria-label="Open Gallery"
          >
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>Creative Gallery</span>
            </div>
            {mediaCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                {mediaCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-purple-200 hover:bg-white/5 hover:text-white transition-colors text-xs"
            aria-label="Open Settings"
          >
            <Sliders className="w-4 h-4 text-purple-300" />
            <span>Settings & Models</span>
          </button>
        </div>
      </aside>
    </>
  );
}
