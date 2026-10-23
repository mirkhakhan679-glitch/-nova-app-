import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatMessage } from './components/ChatMessage.tsx';
import { ChatInput } from './components/ChatInput.tsx';
import { CallModal } from './components/CallModal.tsx';
import { GalleryModal } from './components/GalleryModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { detectIntent, getNovaSystemInstruction, isRTL } from './utils/language.ts';
import type { ChatMessage as ChatMessageType, Conversation, MediaItem, AppSettings } from './types.ts';

const STORAGE_KEYS = {
  CONVERSATIONS: 'nova_conversations_v1',
  GALLERY: 'nova_gallery_v1',
  SETTINGS: 'nova_settings_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  textModel: 'gemini-3.8-flash',
  imageModel: 'gemini-3.1-flash-lite-image',
  videoModel: 'gemini-omni-1.1-flash',
  voiceModel: 'gemini-3.8-flash-lite-tts',
  voice: 'Kore',
  voiceRepliesEnabled: true,
  preferredLanguage: 'auto',
};

const INITIAL_WELCOME_MESSAGE: ChatMessageType = {
  id: 'msg_welcome',
  role: 'assistant',
  content: 'السلام علیکم! میں نووا ہوں، آپ کی ذہین اور تخلیقی ساتھی۔ میں اردو اور انگریزی دونوں زبانوں میں بات کر سکتی ہوں، تصاویر اور ویڈیوز تخلیق کر سکتی ہوں، یا آپ "Call Nova" بٹن دبا کر مجھ سے براہ راست فون کال پر بات کر سکتے ہیں۔ فرمائیے، آج میں آپ کی کیا مدد کر سکتی ہوں؟',
  timestamp: Date.now(),
  isUrdu: true,
};

export default function App() {
  // State Initialization from LocalStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [galleryItems, setGalleryItems] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GALLERY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    const initConv: Conversation = {
      id: 'conv_' + Date.now(),
      title: 'خوش آمدید (Welcome to Nova)',
      messages: [INITIAL_WELCOME_MESSAGE],
      updatedAt: Date.now(),
    };
    return [initConv];
  });

  const [activeConvId, setActiveConvId] = useState<string>(() => {
    return conversations[0]?.id || 'conv_default';
  });

  // Modal and UI Toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(galleryItems));
    } catch {}
  }, [galleryItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeConvId) || conversations[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  // Handle New Chat
  const handleNewChat = () => {
    const newConv: Conversation = {
      id: 'conv_' + Date.now(),
      title: 'New Chat',
      messages: [INITIAL_WELCOME_MESSAGE],
      updatedAt: Date.now(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
  };

  // Handle Delete Conversation
  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const fresh: Conversation = {
          id: 'conv_' + Date.now(),
          title: 'New Chat',
          messages: [INITIAL_WELCOME_MESSAGE],
          updatedAt: Date.now(),
        };
        setActiveConvId(fresh.id);
        return [fresh];
      }
      if (activeConvId === id) {
        setActiveConvId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Automatically save any generated image or video
  const handleMediaGenerated = (item: MediaItem) => {
    setGalleryItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)]);
  };

  // Delete Item from Gallery
  const handleDeleteGalleryItem = (id: string) => {
    setGalleryItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Gemini TTS helper for message voice button
  const handlePlayTts = async (text: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: settings.voice,
          model: settings.voiceModel,
          userApiKey: settings.apiKey,
        }),
      });
      const data = await res.json();
      return data.audioUrl || null;
    } catch (err) {
      console.error('Error generating TTS:', err);
      return null;
    }
  };

  // Send Message Handler
  const handleSendMessage = async (userText: string) => {
    const userMessage: ChatMessageType = {
      id: 'msg_u_' + Date.now(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      isUrdu: isRTL(userText),
    };

    // Update conversation with user message
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === activeConvId) {
          const isFirstRealMessage = conv.messages.length <= 1;
          const updatedTitle = isFirstRealMessage
            ? userText.slice(0, 32) + (userText.length > 32 ? '...' : '')
            : conv.title;
          return {
            ...conv,
            title: updatedTitle,
            messages: [...conv.messages, userMessage],
            updatedAt: Date.now(),
          };
        }
        return conv;
      })
    );

    setIsLoading(true);

    try {
      // 1. Detect Intent: Image, Video, or Text
      const intent = detectIntent(userText);

      if (intent.type === 'image') {
        // Request Image Generation
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: intent.prompt,
            model: settings.imageModel,
            aspectRatio: '1:1',
            userApiKey: settings.apiKey,
          }),
        });
        const imgData = await response.json();

        const mediaItem: MediaItem = {
          id: imgData.id || 'img_' + Date.now(),
          type: 'image',
          url: imgData.imageUrl,
          prompt: intent.prompt,
          timestamp: Date.now(),
        };

        handleMediaGenerated(mediaItem);

        const replyContent = intent.isUrdu
          ? `میں نے آپ کی فرمائش کے مطابق "${intent.prompt}" کی تصویر تیار کر دی ہے اور یہ آپ کی گیلری میں بھی محفوظ کر دی گئی ہے۔`
          : `I have generated your requested image for "${intent.prompt}" and saved it to your Creative Gallery.`;

        const assistantMsg: ChatMessageType = {
          id: 'msg_a_' + Date.now(),
          role: 'assistant',
          content: replyContent,
          timestamp: Date.now(),
          isUrdu: intent.isUrdu,
          media: mediaItem,
        };

        addAssistantMessage(assistantMsg);
      } else if (intent.type === 'video') {
        // Request Video Generation (Veo)
        const response = await fetch('/api/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: intent.prompt,
            model: settings.videoModel,
            duration: '5s',
            userApiKey: settings.apiKey,
          }),
        });
        const vidData = await response.json();

        const mediaItem: MediaItem = {
          id: vidData.id || 'vid_' + Date.now(),
          type: 'video',
          url: vidData.videoUrl,
          prompt: intent.prompt,
          timestamp: Date.now(),
        };

        handleMediaGenerated(mediaItem);

        const replyContent = intent.isUrdu
          ? `میں نے آپ کی ویڈیو "${intent.prompt}" ویو (Veo) ماڈل کے ذریعے تخلیق کر دی ہے۔ آپ اسے دیکھ اور ڈاؤنلوڈ کر سکتے ہیں۔`
          : `I have generated your requested cinematic video for "${intent.prompt}" with Veo. You can preview and download it now.`;

        const assistantMsg: ChatMessageType = {
          id: 'msg_a_' + Date.now(),
          role: 'assistant',
          content: replyContent,
          timestamp: Date.now(),
          isUrdu: intent.isUrdu,
          media: mediaItem,
        };

        addAssistantMessage(assistantMsg);
      } else {
        // Text Brain Generation
        const currentMessages = activeConversation?.messages || [];
        const fullHistory = [...currentMessages, userMessage];

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: fullHistory,
            model: settings.textModel,
            systemInstruction: getNovaSystemInstruction(),
            userApiKey: settings.apiKey,
          }),
        });

        const chatData = await response.json();
        const replyText = chatData.text || '';

        const assistantMsg: ChatMessageType = {
          id: 'msg_a_' + Date.now(),
          role: 'assistant',
          content: replyText,
          timestamp: Date.now(),
          isUrdu: chatData.isUrdu ?? isRTL(replyText),
        };

        // If voice replies are enabled, synthesize and speak audio
        if (settings.voiceRepliesEnabled) {
          handlePlayTts(replyText).then((audioUrl) => {
            if (audioUrl) {
              assistantMsg.audioUrl = audioUrl;
              new Audio(audioUrl).play().catch(() => {});
            }
          });
        }

        addAssistantMessage(assistantMsg);
      }
    } catch (err: any) {
      console.error('Send message error:', err);
      const isUrduQuery = isRTL(userText);
      const errorMsg: ChatMessageType = {
        id: 'msg_err_' + Date.now(),
        role: 'assistant',
        content: isUrduQuery
          ? 'معذرت، رابطہ قائم کرنے میں کچھ وقت لگ رہا ہے۔ براہ کرم دوبارہ کوشش کریں۔'
          : 'Something went wrong. Please check your network or try again.',
        timestamp: Date.now(),
        isUrdu: isUrduQuery,
      };
      addAssistantMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const addAssistantMessage = (msg: ChatMessageType) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === activeConvId) {
          return {
            ...conv,
            messages: [...conv.messages, msg],
            updatedAt: Date.now(),
          };
        }
        return conv;
      })
    );
  };

  // Handle Call Mode Close & Merge Call Logs
  const handleCloseCall = (callLogs: ChatMessageType[]) => {
    setIsCallOpen(false);

    if (callLogs && callLogs.length > 0) {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === activeConvId) {
            return {
              ...conv,
              messages: [
                ...conv.messages,
                {
                  id: 'call_summary_tag_' + Date.now(),
                  role: 'system',
                  content: '--- Voice Call Ended ---',
                  timestamp: Date.now(),
                },
                ...callLogs,
              ],
              updatedAt: Date.now(),
            };
          }
          return conv;
        })
      );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b081e] text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeId={activeConvId}
        onSelectConversation={setActiveConvId}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onOpenCall={() => setIsCallOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        mediaCount={galleryItems.length}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <Header
          onOpenCall={() => setIsCallOpen(true)}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          settings={settings}
          onUpdateSettings={setSettings}
          mediaCount={galleryItems.length}
        />

        {/* Message Stream */}
        <main className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-1">
          {activeConversation?.messages.map((msg) =>
            msg.role === 'system' ? (
              <div
                key={msg.id}
                className="py-2 text-center text-[11px] font-mono text-amber-400/50 uppercase tracking-widest"
              >
                {msg.content}
              </div>
            ) : (
              <ChatMessage
                key={msg.id}
                message={msg}
                onPlayTts={handlePlayTts}
                onOpenMedia={() => setIsGalleryOpen(true)}
              />
            )
          )}

          {/* Assistant Loading Placeholder */}
          {isLoading && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#130f30]/30 rounded-xl max-w-md animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-purple-900/40 p-0.5">
                <img src="/assets/aistudio/nova-logo_2b31ef35.svg" alt="Nova" className="w-full h-full rounded" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-200">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="font-medium font-urdu">نووا سوچ رہی ہے... (Nova is creating...)</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>

      {/* Voice Call Screen Modal (Full-Screen Gemini Live API & 3D Three.js Orb) */}
      <CallModal
        isOpen={isCallOpen}
        onClose={handleCloseCall}
        settings={settings}
        onMediaGenerated={handleMediaGenerated}
      />

      {/* Creative Gallery Modal */}
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        items={galleryItems}
        onDeleteItem={handleDeleteGalleryItem}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />
    </div>
  );
}
