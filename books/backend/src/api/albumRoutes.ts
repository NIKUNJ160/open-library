import { Router } from 'express';
import { getAlbumsGroupedByDate, createAlbum, reorderAlbums } from '../services/albumService';

const router = Router();

// GET /api/albums - Date grouped albums
router.get('/', async (req, res, next) => {
  try {
    const dateGroups = await getAlbumsGroupedByDate();
    res.json(dateGroups);
  } catch (err) {
    next(err);
  }
});

// POST /api/albums - Create album
router.post('/', async (req, res, next) => {
  try {
    const { title, category, date, description } = req.body;
    if (!title || !category || !date) {
      return res.status(400).json({ error: 'Title, category, and date are required.' });
    }
    const newAlbum = await createAlbum({ title, category, date, description });
    res.status(201).json(newAlbum);
  } catch (err) {
    next(err);
  }
});

// PUT /api/albums/reorder - Update drag-and-drop album order
router.put('/reorder', async (req, res, next) => {
  try {
    const { orderedAlbumIds } = req.body;
    if (!Array.isArray(orderedAlbumIds)) {
      return res.status(400).json({ error: 'orderedAlbumIds array is required.' });
    }
    await reorderAlbums(orderedAlbumIds);
    res.json({ success: true, message: 'Albums reordered successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
