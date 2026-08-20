import express from 'express';
import cors from 'cors';
import albumRoutes from './api/albumRoutes';
import mediaRoutes from './api/mediaRoutes';
import { errorHandler } from './middleware/errorHandler';
import { getDb } from './db/connection';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/albums', albumRoutes);
app.use('/api', mediaRoutes);

// Error Handler
app.use(errorHandler);

// Initialize DB and start server
getDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Backend API Server listening at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
  });
