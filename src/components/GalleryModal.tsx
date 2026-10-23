import { useState } from 'react';
import { X, Download, Trash2, Image as ImageIcon, Film, Eye, Sparkles, Filter } from 'lucide-react';
import type { MediaItem } from '../types.ts';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
  onDeleteItem: (id: string) => void;
}

export function GalleryModal({ isOpen, onClose, items, onDeleteItem }: GalleryModalProps) {
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const handleDownload = (item: MediaItem) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = `nova_${item.type}_${item.id}.${item.type === 'image' ? 'png' : 'mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Nova Creative Gallery"
    >
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col bg-[#110d2c] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/50 bg-[#161138]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-100">Creative Gallery</h2>
              <p className="text-xs text-purple-300/70">
                All generated images and Veo videos saved automatically ({items.length})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center bg-[#1b1442] p-1 rounded-xl border border-purple-500/20 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                  filter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-purple-300 hover:text-white'
                }`}
              >
                All ({items.length})
              </button>
              <button
                onClick={() => setFilter('image')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-medium ${
                  filter === 'image' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-purple-300 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Images ({items.filter((i) => i.type === 'image').length})</span>
              </button>
              <button
                onClick={() => setFilter('video')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-medium ${
                  filter === 'video' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-purple-300 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Videos ({items.filter((i) => i.type === 'video').length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-purple-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Close gallery"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Grid or Empty State */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <ImageIcon className="w-8 h-8 opacity-60" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-amber-100">No media in this category yet</h3>
                <p className="text-xs text-purple-300/70 max-w-sm mt-1">
                  Ask Nova in chat or during a voice call to generate an image or video (e.g. "Create a picture of an Arabian horse" or "ایک خوبصورت کہکشاں کی تصویر بناؤ").
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col rounded-xl overflow-hidden bg-[#18123c] border border-purple-500/20 hover:border-amber-400/50 transition-all shadow-lg hover:shadow-amber-500/10"
                >
                  {/* Thumbnail Container */}
                  <div
                    className="relative aspect-square w-full bg-black/40 cursor-pointer overflow-hidden"
                    onClick={() => setSelectedItem(item)}
                  >
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt={item.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center bg-purple-950/40">
                        <img
                          src={item.url}
                          alt={item.prompt}
                          className="w-full h-full object-cover opacity-90"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                          <div className="p-3 rounded-full bg-amber-500/80 text-slate-950 shadow-lg">
                            <Film className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-semibold text-amber-200 border border-amber-400/20 flex items-center gap-1">
                      {item.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                      <span className="capitalize">{item.type}</span>
                    </div>

                    {/* Hover Overlay with Quick Actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                        title="View Full"
                        aria-label="View media in full"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(item);
                          }}
                          className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                          title="Download"
                          aria-label="Download media"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this saved creation from gallery?')) {
                              onDeleteItem(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white"
                          title="Delete"
                          aria-label="Delete media"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-purple-200 line-clamp-2" title={item.prompt}>
                      {item.prompt}
                    </p>
                    <span className="text-[10px] text-purple-400/60 mt-1 font-mono">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Selected Item */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fadeIn"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col bg-[#140e34] border border-purple-500/40 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-purple-900/50 bg-[#18123c]">
              <span className="text-xs font-semibold text-amber-200 truncate max-w-md">
                {selectedItem.prompt}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
                  aria-label="Download media item"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => {
                    onDeleteItem(selectedItem.id);
                    setSelectedItem(null);
                  }}
                  className="p-1.5 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white transition-all"
                  aria-label="Delete media item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 text-purple-300 hover:text-white rounded-lg hover:bg-white/10"
                  aria-label="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 bg-black/50 overflow-hidden">
              {selectedItem.type === 'image' ? (
                <img
                  src={selectedItem.url}
                  alt={selectedItem.prompt}
                  className="max-h-[70vh] w-auto object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <div className="relative max-h-[70vh] w-full flex items-center justify-center">
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.prompt}
                    className="max-h-[70vh] w-auto object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
