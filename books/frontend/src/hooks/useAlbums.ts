import { useState, useEffect, useCallback } from 'react';
import { DateGroup, Album, CreateAlbumInput } from '../../../shared/types/library';
import { fetchDateGroups, createAlbumApi } from '../services/apiClient';

export function useAlbums() {
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const groups = await fetchDateGroups();
      setDateGroups(groups);
    } catch (err: any) {
      setError(err.message || 'Failed to load albums');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const addAlbum = async (input: CreateAlbumInput): Promise<Album> => {
    const created = await createAlbumApi(input);
    await loadAlbums();
    return created;
  };

  return {
    dateGroups,
    setDateGroups,
    loading,
    error,
    refreshAlbums: loadAlbums,
    addAlbum,
  };
}
