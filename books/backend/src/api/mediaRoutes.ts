import { Router } from 'express';
import { getMediaItemsByAlbum, addMediaItem } from '../services/mediaService';

const router = Router();

// GET /api/albums/:id/items - Media items for an album
router.get('/albums/:id/items', async (req, res, next) => {
  try {
    const { id } = req.params;
    const items = await getMediaItemsByAlbum(id);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// POST /api/media - Add media tile to an album
router.post('/media', async (req, res, next) => {
  try {
    const { albumId, title, mediaType, url, thumbnailUrl } = req.body;
    if (!albumId || !title || !mediaType || !url) {
      return res.status(400).json({ error: 'albumId, title, mediaType, and url are required.' });
    }
    const newItem = await addMediaItem({ albumId, title, mediaType, url, thumbnailUrl });
    res.status(201).json(newItem);
  } catch (err) {
    next(err);
  }
});

export default router;
