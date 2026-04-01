/**
 * Tests for Content API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  contentApi,
  type ContentPack,
  type ContentPackDetail,
  type ContentBlockDetail,
  type NextBlockResponse,
  type PacksListResponse,
} from './content';

// Mock the api client
vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from './client';

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('contentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockContentPack: ContentPack = {
    id: 'pack-123',
    slug: 'javascript-fundamentals',
    version: '1.0.0',
    title: 'JavaScript Fundamentals',
    description: 'Learn the basics of JavaScript',
    certificationTarget: 'JavaScript Developer',
    status: 'published',
    publishedAt: '2024-01-01T00:00:00Z',
  };

  const mockPacksListResponse: PacksListResponse = {
    packs: [mockContentPack],
    pagination: {
      limit: 10,
      offset: 0,
      hasMore: false,
    },
  };

  const mockContentPackDetail: ContentPackDetail = {
    pack: {
      id: 'pack-123',
      slug: 'javascript-fundamentals',
      version: '1.0.0',
      title: 'JavaScript Fundamentals',
      description: 'Learn the basics of JavaScript',
      certificationTarget: 'JavaScript Developer',
      status: 'published',
      totalBlocks: 5,
      blocks: [
        {
          id: 'block-1',
          blockId: 'intro',
          title: 'Introduction to JavaScript',
          objective: 'Understand what JavaScript is',
          targetMode: 'L1_RECALL',
          timeBudgetSeconds: 300,
          sequenceOrder: 1,
        },
      ],
    },
    learnerProgress: {
      currentMode: 'L1_RECALL',
      blocksCompleted: 0,
      overallMastery: 0,
      currentBlockId: 'block-1',
    },
  };

  const mockBlockDetail: ContentBlockDetail = {
    block: {
      id: 'block-1',
      blockId: 'intro',
      title: 'Introduction to JavaScript',
      objective: 'Understand what JavaScript is',
      targetMode: 'L1_RECALL',
      timeBudgetSeconds: 300,
      content: { text: 'JavaScript is a programming language...' },
      hints: ['Think about web browsers'],
      variants: [],
    },
    learnerMode: 'L1_RECALL',
    pack: {
      id: 'pack-123',
      title: 'JavaScript Fundamentals',
      status: 'published',
    },
  };

  describe('getPacks', () => {
    it('should call GET /content/packs without params', async () => {
      mockApi.get.mockResolvedValueOnce(mockPacksListResponse);

      const result = await contentApi.getPacks();

      expect(mockApi.get).toHaveBeenCalledWith('/content/packs', undefined);
      expect(result.packs).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should call GET /content/packs with filter params', async () => {
      mockApi.get.mockResolvedValueOnce(mockPacksListResponse);

      await contentApi.getPacks({ status: 'published', certification: 'JavaScript Developer' });

      expect(mockApi.get).toHaveBeenCalledWith('/content/packs', {
        status: 'published',
        certification: 'JavaScript Developer',
      });
    });

    it('should call GET /content/packs with pagination params', async () => {
      mockApi.get.mockResolvedValueOnce(mockPacksListResponse);

      await contentApi.getPacks({ limit: '20', offset: '10' });

      expect(mockApi.get).toHaveBeenCalledWith('/content/packs', {
        limit: '20',
        offset: '10',
      });
    });

    it('should propagate API errors', async () => {
      const error = new Error('Server error');
      mockApi.get.mockRejectedValueOnce(error);

      await expect(contentApi.getPacks()).rejects.toThrow('Server error');
    });
  });

  describe('getPack', () => {
    it('should call GET /content/packs/:packId', async () => {
      mockApi.get.mockResolvedValueOnce(mockContentPackDetail);

      const result = await contentApi.getPack('pack-123');

      expect(mockApi.get).toHaveBeenCalledWith('/content/packs/pack-123');
      expect(result.pack.title).toBe('JavaScript Fundamentals');
    });

    it('should return learnerProgress as null for new learners', async () => {
      const detailWithoutProgress = { ...mockContentPackDetail, learnerProgress: null };
      mockApi.get.mockResolvedValueOnce(detailWithoutProgress);

      const result = await contentApi.getPack('pack-123');

      expect(result.learnerProgress).toBeNull();
    });

    it('should handle non-existent pack', async () => {
      const error = new Error('Pack not found');
      mockApi.get.mockRejectedValueOnce(error);

      await expect(contentApi.getPack('non-existent')).rejects.toThrow('Pack not found');
    });
  });

  describe('getBlock', () => {
    it('should call GET /content/packs/:packId/blocks/:blockId', async () => {
      mockApi.get.mockResolvedValueOnce(mockBlockDetail);

      const result = await contentApi.getBlock('pack-123', 'block-1');

      expect(mockApi.get).toHaveBeenCalledWith('/content/packs/pack-123/blocks/block-1');
      expect(result.block.title).toBe('Introduction to JavaScript');
    });

    it('should include learnerMode in response', async () => {
      mockApi.get.mockResolvedValueOnce(mockBlockDetail);

      const result = await contentApi.getBlock('pack-123', 'block-1');

      expect(result.learnerMode).toBe('L1_RECALL');
    });
  });

  describe('getNextBlock', () => {
    it('should call GET /content/next/:contentPackId when blocks remain', async () => {
      const nextBlockResponse: NextBlockResponse = {
        complete: false,
        nextBlock: {
          id: 'block-2',
          blockId: 'variables',
          title: 'Variables in JavaScript',
          objective: 'Learn to declare variables',
          targetMode: 'L1_RECALL',
          sequenceOrder: 2,
        },
        progress: {
          completed: 1,
          currentMode: 'L1_RECALL',
        },
      };
      mockApi.get.mockResolvedValueOnce(nextBlockResponse);

      const result = await contentApi.getNextBlock('pack-123');

      expect(mockApi.get).toHaveBeenCalledWith('/content/next/pack-123');
      expect(result.complete).toBe(false);
      expect(result.nextBlock?.title).toBe('Variables in JavaScript');
    });

    it('should indicate completion when all blocks done', async () => {
      const completedResponse: NextBlockResponse = {
        complete: true,
        message: 'Congratulations! You have completed all blocks.',
        blocksCompleted: 5,
      };
      mockApi.get.mockResolvedValueOnce(completedResponse);

      const result = await contentApi.getNextBlock('pack-123');

      expect(result.complete).toBe(true);
      expect(result.blocksCompleted).toBe(5);
    });
  });

  describe('getCourses (deprecated)', () => {
    it('should call GET /content/packs (legacy alias)', async () => {
      mockApi.get.mockResolvedValueOnce(mockPacksListResponse);

      await contentApi.getCourses();

      expect(mockApi.get).toHaveBeenCalledWith('/content/packs', undefined);
    });

    it('should pass category and search params', async () => {
      mockApi.get.mockResolvedValueOnce(mockPacksListResponse);

      await contentApi.getCourses({ category: 'programming', search: 'javascript' });

      expect(mockApi.get).toHaveBeenCalledWith('/content/packs', {
        category: 'programming',
        search: 'javascript',
      });
    });
  });

  describe('getCourse (deprecated)', () => {
    it('should call GET /content/packs/:courseId (legacy alias)', async () => {
      mockApi.get.mockResolvedValueOnce(mockContentPackDetail);

      await contentApi.getCourse('course-123');

      expect(mockApi.get).toHaveBeenCalledWith('/content/packs/course-123');
    });
  });

  describe('getModules', () => {
    it('should call GET /content/packs/:courseId (maps to getPack)', async () => {
      mockApi.get.mockResolvedValueOnce(mockContentPackDetail);

      await contentApi.getModules('course-123');

      expect(mockApi.get).toHaveBeenCalledWith('/content/packs/course-123');
    });
  });

  describe('enrollInCourse', () => {
    it('should call POST /content/packs/:courseId/enroll', async () => {
      mockApi.post.mockResolvedValueOnce({ enrolled: true });

      const result = await contentApi.enrollInCourse('course-123');

      expect(mockApi.post).toHaveBeenCalledWith('/content/packs/course-123/enroll');
      expect(result.enrolled).toBe(true);
    });
  });

  describe('unenrollFromCourse', () => {
    it('should call DELETE /content/packs/:courseId/enroll', async () => {
      mockApi.delete.mockResolvedValueOnce({ enrolled: false });

      const result = await contentApi.unenrollFromCourse('course-123');

      expect(mockApi.delete).toHaveBeenCalledWith('/content/packs/course-123/enroll');
      expect(result.enrolled).toBe(false);
    });
  });

  describe('submitAnswer', () => {
    it('should call POST /content/packs/:courseId/blocks/:blockId/submit with correct answer', async () => {
      mockApi.post.mockResolvedValueOnce({ correct: true });

      const result = await contentApi.submitAnswer('course-123', 'block-1', 'const x = 5;');

      expect(mockApi.post).toHaveBeenCalledWith('/content/packs/course-123/blocks/block-1/submit', {
        answer: 'const x = 5;',
      });
      expect(result.correct).toBe(true);
    });

    it('should return explanation for incorrect answer', async () => {
      mockApi.post.mockResolvedValueOnce({
        correct: false,
        explanation: 'Variables should be declared with let or const',
        correctAnswer: 'const x = 5;',
      });

      const result = await contentApi.submitAnswer('course-123', 'block-1', 'var x = 5;');

      expect(result.correct).toBe(false);
      expect(result.explanation).toBe('Variables should be declared with let or const');
    });
  });

  describe('getCategories', () => {
    it('should call GET /content/categories', async () => {
      const categories = ['programming', 'data-science', 'design'];
      mockApi.get.mockResolvedValueOnce(categories);

      const result = await contentApi.getCategories();

      expect(mockApi.get).toHaveBeenCalledWith('/content/categories');
      expect(result).toEqual(categories);
    });
  });
});
