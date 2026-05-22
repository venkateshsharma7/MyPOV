import { jest } from '@jest/globals';
import recommendationEngine from '../services/recommendationEngine.js';

describe('Recommendation Engine', () => {
  describe('getRecommendations', () => {
    it('should return recommendations for a user', async () => {
      const mockUserId = '507f1f77bcf86cd799439011'; // Mock ObjectId
      const recommendations = await recommendationEngine.getRecommendations(mockUserId, 10);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(10);
    });

    it('should handle users with no preferences', async () => {
      const mockUserId = '507f1f77bcf86cd799439012';
      const recommendations = await recommendationEngine.getRecommendations(mockUserId, 5);

      expect(Array.isArray(recommendations)).toBe(true);
      // Should return popular movies or default recommendations
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate similarity between movies', () => {
      const movie1 = {
        genres: ['Action', 'Adventure'],
        keywords: ['hero', 'villain'],
        rating: 8.5
      };

      const movie2 = {
        genres: ['Action', 'Thriller'],
        keywords: ['hero', 'detective'],
        rating: 8.0
      };

      const similarity = recommendationEngine.calculateSimilarity(movie1, movie2);
      expect(typeof similarity).toBe('number');
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });
});