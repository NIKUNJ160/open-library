import React, { useState, useEffect, useCallback } from 'react';
import { Album, MediaItem, CreateMediaItemInput } from '../../../shared/types/library';
import { fetchMediaItemsByAlbum, addMediaItemApi } from '../services/apiClient';
import { TilePreviewGrid } from '../components/TilePreviewGrid';
import { LightboxModal } from '../components/LightboxModal';
import { AddMediaModal } from '../components/AddMediaModal';
import { ArrowLeft, Plus, Calendar, Folder } from 'lucide-react';

interface AlbumDetailViewProps {
  album: Album;
  onBack: () => void;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({ album, onBack }) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMediaItemsByAlbum(album.id);
      setItems(data);
    } catch (err) {
      console.error('Failed to load media items:', err);
    } finally {
      setLoading(false);
    }
  }, [album.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleAddMedia = async (input: CreateMediaItemInput) => {
    await addMediaItemApi(input);
    await loadItems();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Library</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Album Overview Hero */}
        <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">
              <Folder className="w-4 h-4" />
              <span>{album.category} Album</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{album.title}</h1>
            {album.description && (
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">{album.description}</p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Date: {album.date}</span>
            </div>
            <div className="font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
              {items.length} {items.length === 1 ? 'Tile Item' : 'Tile Items'}
            </div>
          </div>
        </div>

        {/* Tile Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <TilePreviewGrid items={items} onTileClick={(item) => setSelectedItem(item)} />
        )}
      </main>

      {/* Lightbox */}
      <LightboxModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      {/* Add Media Modal */}
      <AddMediaModal
        isOpen={isAddModalOpen}
        albumId={album.id}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddMedia}
      />
    </div>
  );
};
