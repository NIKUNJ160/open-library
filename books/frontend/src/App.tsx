import React, { useState } from 'react';
import { Album } from '@shared/types/library';
import { MainLibraryView } from './pages/MainLibraryView';
import { AlbumDetailView } from './pages/AlbumDetailView';

export const App: React.FC = () => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  if (selectedAlbum) {
    return (
      <AlbumDetailView
        album={selectedAlbum}
        onBack={() => setSelectedAlbum(null)}
      />
    );
  }

  return (
    <MainLibraryView
      onSelectAlbum={(album) => setSelectedAlbum(album)}
    />
  );
};
export default App;
