import { describe, it, expect, beforeEach } from 'bun:test';
import { VectorService } from '@/server/services/vectors.service';
import type {
  VectorEmbeddingRequest,
  VectorSearchRequest,
  VectorUpsertRequest,
  VectorDeleteRequest,
} from '@/shared/types/vectors';

describe('VectorService', () => {
  let service: VectorService;

  beforeEach(() => {
    service = new VectorService();
  });

  describe('embed', () => {
    it('returns embeddings for each input text', async () => {
      const req: VectorEmbeddingRequest = { texts: ['hello', 'world'], model: 'default' };
      const result = await service.embed(req);
      expect(result.embeddings.length).toBe(2);
      expect(result.embeddings[0]!.length).toBeGreaterThan(0);
      expect(result.embeddings[1]!.length).toBeGreaterThan(0);
    });

    it('returns the model name from request', async () => {
      const req: VectorEmbeddingRequest = { texts: ['test'], model: 'test-model' };
      const result = await service.embed(req);
      expect(result.model).toBe('test-model');
    });

    it('returns default model when not specified', async () => {
      const req: VectorEmbeddingRequest = { texts: ['test'], model: 'default' };
      const result = await service.embed(req);
      expect(result.model).toBe('default');
    });

    it('returns deterministic vectors for same input', async () => {
      const req: VectorEmbeddingRequest = { texts: ['deterministic'], model: 'default' };
      const r1 = await service.embed(req);
      const r2 = await service.embed(req);
      expect(r1.embeddings[0]).toEqual(r2.embeddings[0]);
    });

    it('returns different vectors for different inputs', async () => {
      const req: VectorEmbeddingRequest = { texts: ['aaa', 'bbb'], model: 'default' };
      const result = await service.embed(req);
      expect(result.embeddings[0]).not.toEqual(result.embeddings[1]);
    });
  });

  describe('upsert', () => {
    it('upserts vectors and returns count', async () => {
      const embedResult = await service.embed({ texts: ['v1', 'v2'], model: 'default' });
      const req: VectorUpsertRequest = {
        vectors: [
          { id: 'v1', values: embedResult.embeddings[0]! },
          { id: 'v2', values: embedResult.embeddings[1]! },
        ],
      };
      const result = await service.upsert(req);
      expect(result.upserted).toBe(2);
    });

    it('upserts vectors with metadata', async () => {
      const embedResult = await service.embed({ texts: ['v1'], model: 'default' });
      const req: VectorUpsertRequest = {
        vectors: [{ id: 'v1', values: embedResult.embeddings[0]!, metadata: { source: 'test' } }],
      };
      const result = await service.upsert(req);
      expect(result.upserted).toBe(1);
    });

    it('overwrites existing vector on duplicate id', async () => {
      const e1 = await service.embed({ texts: ['a'], model: 'default' });
      const req1: VectorUpsertRequest = { vectors: [{ id: 'v1', values: e1.embeddings[0]! }] };
      await service.upsert(req1);
      const e2 = await service.embed({ texts: ['b'], model: 'default' });
      const req2: VectorUpsertRequest = { vectors: [{ id: 'v1', values: e2.embeddings[0]! }] };
      const result = await service.upsert(req2);
      expect(result.upserted).toBe(1);
    });

    it('supports namespace and collection scoping', async () => {
      const embedResult = await service.embed({ texts: ['x'], model: 'default' });
      const req1: VectorUpsertRequest = {
        vectors: [{ id: 'v1', values: embedResult.embeddings[0]! }],
        namespace: 'ns1',
        collection: 'col1',
      };
      await service.upsert(req1);
      const req2: VectorUpsertRequest = {
        vectors: [{ id: 'v1', values: [0, 1, 0] }],
        namespace: 'ns2',
        collection: 'col2',
      };
      await service.upsert(req2);
      const search1: VectorSearchRequest = {
        query: 'x',
        top_k: 5,
        threshold: 0,
        namespace: 'ns1',
        collection: 'col1',
      };
      const search2: VectorSearchRequest = {
        query: 'x',
        top_k: 5,
        threshold: 0,
        namespace: 'ns2',
        collection: 'col2',
      };
      const results1 = await service.search(search1);
      const results2 = await service.search(search2);
      expect(results1.length).toBe(1);
      expect(results2.length).toBe(0);
    });
  });

  describe('search', () => {
    it('returns results sorted by similarity', async () => {
      const embedResult = await service.embed({
        texts: ['alpha', 'beta', 'gamma'],
        model: 'default',
      });
      const req: VectorUpsertRequest = {
        vectors: [
          { id: 'v1', values: embedResult.embeddings[0]! },
          { id: 'v2', values: embedResult.embeddings[1]! },
          { id: 'v3', values: embedResult.embeddings[2]! },
        ],
      };
      await service.upsert(req);
      const searchReq: VectorSearchRequest = {
        query: 'alpha',
        top_k: 3,
        threshold: -1,
      };
      const results = await service.search(searchReq);
      expect(results.length).toBe(3);
      expect(results[0]!.distance).toBeGreaterThanOrEqual(results[1]!.distance);
      expect(results[1]!.distance).toBeGreaterThanOrEqual(results[2]!.distance);
    });

    it('returns exact match with highest similarity', async () => {
      const embedResult = await service.embed({ texts: ['alpha', 'beta'], model: 'default' });
      const req: VectorUpsertRequest = {
        vectors: [
          { id: 'v1', values: embedResult.embeddings[0]! },
          { id: 'v2', values: embedResult.embeddings[1]! },
        ],
      };
      await service.upsert(req);
      const searchReq: VectorSearchRequest = {
        query: 'alpha',
        top_k: 2,
        threshold: 0,
      };
      const results = await service.search(searchReq);
      expect(results[0]!.id).toBe('v1');
      expect(results[0]!.distance).toBeCloseTo(1, 5);
    });

    it('respects top_k limit', async () => {
      const embedResult = await service.embed({ texts: ['a', 'b', 'c'], model: 'default' });
      const req: VectorUpsertRequest = {
        vectors: [
          { id: 'v1', values: embedResult.embeddings[0]! },
          { id: 'v2', values: embedResult.embeddings[1]! },
          { id: 'v3', values: embedResult.embeddings[2]! },
        ],
      };
      await service.upsert(req);
      const searchReq: VectorSearchRequest = {
        query: 'a',
        top_k: 2,
        threshold: 0,
      };
      const results = await service.search(searchReq);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('respects threshold filter', async () => {
      const embedResult = await service.embed({ texts: ['match'], model: 'default' });
      const req: VectorUpsertRequest = {
        vectors: [
          { id: 'v1', values: embedResult.embeddings[0]! },
          { id: 'v2', values: [0, 1, 0] },
        ],
      };
      await service.upsert(req);
      const searchReq: VectorSearchRequest = {
        query: 'match',
        top_k: 10,
        threshold: 0.99,
      };
      const results = await service.search(searchReq);
      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe('v1');
    });

    it('returns empty array when collection is empty', async () => {
      const searchReq: VectorSearchRequest = {
        query: 'test',
        top_k: 5,
        threshold: 0,
      };
      const results = await service.search(searchReq);
      expect(results).toEqual([]);
    });

    it('returns metadata with search results', async () => {
      const embedResult = await service.embed({ texts: ['query'], model: 'default' });
      const req: VectorUpsertRequest = {
        vectors: [{ id: 'v1', values: embedResult.embeddings[0]!, metadata: { tag: 'important' } }],
      };
      await service.upsert(req);
      const searchReq: VectorSearchRequest = {
        query: 'query',
        top_k: 5,
        threshold: 0,
      };
      const results = await service.search(searchReq);
      expect(results.length).toBe(1);
      expect(results[0]!.metadata).toEqual({ tag: 'important' });
    });
  });

  describe('delete', () => {
    it('deletes existing vectors and returns count', async () => {
      const embedResult = await service.embed({ texts: ['v1', 'v2'], model: 'default' });
      const upsertReq: VectorUpsertRequest = {
        vectors: [
          { id: 'v1', values: embedResult.embeddings[0]! },
          { id: 'v2', values: embedResult.embeddings[1]! },
        ],
      };
      await service.upsert(upsertReq);
      const deleteReq: VectorDeleteRequest = { ids: ['v1'] };
      const result = await service.delete(deleteReq);
      expect(result.deleted).toBe(1);
      const searchReq: VectorSearchRequest = {
        query: 'v2',
        top_k: 10,
        threshold: 0,
      };
      const remaining = await service.search(searchReq);
      expect(remaining.length).toBe(1);
      expect(remaining[0]!.id).toBe('v2');
    });

    it('returns 0 for non-existent ids', async () => {
      const deleteReq: VectorDeleteRequest = { ids: ['nonexistent'] };
      const result = await service.delete(deleteReq);
      expect(result.deleted).toBe(0);
    });

    it('deletes multiple vectors at once', async () => {
      const embedResult = await service.embed({ texts: ['a', 'b', 'c'], model: 'default' });
      const upsertReq: VectorUpsertRequest = {
        vectors: [
          { id: 'v1', values: embedResult.embeddings[0]! },
          { id: 'v2', values: embedResult.embeddings[1]! },
          { id: 'v3', values: embedResult.embeddings[2]! },
        ],
      };
      await service.upsert(upsertReq);
      const deleteReq: VectorDeleteRequest = { ids: ['v1', 'v2'] };
      const result = await service.delete(deleteReq);
      expect(result.deleted).toBe(2);
    });

    it('respects namespace and collection scoping', async () => {
      const embedResult = await service.embed({ texts: ['x'], model: 'default' });
      const upsertReq: VectorUpsertRequest = {
        vectors: [{ id: 'v1', values: embedResult.embeddings[0]! }],
        namespace: 'ns1',
      };
      await service.upsert(upsertReq);
      const deleteReq: VectorDeleteRequest = {
        ids: ['v1'],
        namespace: 'ns2',
      };
      const result = await service.delete(deleteReq);
      expect(result.deleted).toBe(0);
    });
  });
});
