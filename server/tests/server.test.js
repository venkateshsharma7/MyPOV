import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../index.js';

describe('Server Tests', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/movies', () => {
    it('should return movies with pagination', async () => {
      const response = await request(app)
        .get('/api/movies?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('movies');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.movies)).toBe(true);
    });

    it('should handle search queries', async () => {
      const response = await request(app)
        .get('/api/movies?search=batman')
        .expect(200);

      expect(response.body).toHaveProperty('movies');
      expect(Array.isArray(response.body.movies)).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});