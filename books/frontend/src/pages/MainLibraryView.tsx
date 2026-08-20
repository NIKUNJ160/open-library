import React, { useState } from 'react';
import { Album } from '../../../shared/types/library';
import { useAlbums } from '../hooks/useAlbums';
import { useDragReorder } from '../hooks/useDragReorder';
import { DndProvider } from '../components/DndProvider';
import { DateGroupSection } from '../components/DateGroupSection';
import { SortableAlbumCard } from '../components/SortableAlbumCard';
import { CreateAlbumModal } from '../components/CreateAlbumModal';
import { Plus, BookOpen, Layers } from 'lucide-react';

interface MainLibraryViewProps {
  onSelectAlbum: (album: Album) => void;
}

export const MainLibraryView: React.FC<MainLibraryViewProps> = ({ onSelectAlbum }) => {
  const { dateGroups, setDateGroups, loading, error, addAlbum } = useAlbums();
  const { handleDragEnd } = useDragReorder(dateGroups, setDateGroups);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Flatten all albums for drag and drop context
  const allAlbums: Album[] = [];
  dateGroups.forEach((g) => allAlbums.push(...g.albums));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight text-slate-900">
                Photo & Open Knowledge Library
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Flat album hierarchy • Drag & drop reordering • Date grouped
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Album</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Banner / Info */}
        <div className="mb-8 p-4 bg-brand-50/60 border border-brand-100 rounded-2xl flex items-start gap-3">
          <Layers className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-brand-900 leading-relaxed">
            <span className="font-bold">Organized & Non-Nested:</span> Albums are grouped by date and displayed in a flat hierarchy. Re-order albums by dragging cards across the main page grid.
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
            {error}
          </div>
        ) : dateGroups.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-500 font-medium">No albums created yet.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl"
            >
              Create First Album
            </button>
          </div>
        ) : (
          <DndProvider albums={allAlbums} onDragEnd={handleDragEnd}>
            {dateGroups.map((group) => (
              <DateGroupSection
                key={group.groupKey}
                title={group.groupTitle}
                count={group.albums.length}
              >
                {group.albums.map((album) => (
                  <SortableAlbumCard
                    key={album.id}
                    album={album}
                    onClick={onSelectAlbum}
                  />
                ))}
              </DateGroupSection>
            ))}
          </DndProvider>
        )}
      </main>

      {/* Create Modal */}
      <CreateAlbumModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (input) => {
          await addAlbum(input);
        }}
      />
    </div>
  );
};
