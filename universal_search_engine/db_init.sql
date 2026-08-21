-- Phase 3: Database Initialization
-- Run this in pgAdmin or psql once you have access to your PostgreSQL server.

-- 1. Create the database
CREATE DATABASE knowledge_db;

-- Connect to the new database (if using psql: \c knowledge_db)

-- 2. Enable the pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 3. Verify it's installed
SELECT * FROM pg_extension WHERE extname = 'vector';
