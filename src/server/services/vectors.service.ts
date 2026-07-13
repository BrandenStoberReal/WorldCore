import type { VectorUpsertRequest, VectorSearchRequest, VectorEmbeddingRequest, VectorEmbeddingResponse, VectorDeleteRequest } from "@/shared/types/vectors"

interface StoredVector {
  values: number[]
  metadata?: Record<string, unknown>
}

interface SearchHit {
  id: string
  distance: number
  metadata?: Record<string, unknown>
}

const EMBED_DIM = 384

function hashStringToNumber(input: string, seed: number): number {
  let hash = seed
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash
}

function stringToDeterministicVector(text: string, dim: number): number[] {
  const vector: number[] = []
  for (let i = 0; i < dim; i++) {
    const hash = hashStringToNumber(text, i * 2654435761)
    vector.push(((hash & 0x7fffffff) % 10000) / 10000.0 - 0.5)
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vector[i] = vector[i]! / norm
    }
  }
  return vector
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ai = a[i]!
    const bi = b[i]!
    dot += ai * bi
    normA += ai * ai
    normB += bi * bi
  }
  const magA = Math.sqrt(normA)
  const magB = Math.sqrt(normB)
  if (magA === 0 || magB === 0) return 0
  return dot / (magA * magB)
}

function makeCollectionKey(namespace?: string, collection?: string): string {
  return `${namespace ?? "default"}::${collection ?? "default"}`
}

export class VectorService {
  private store = new Map<string, Map<string, StoredVector>>()

  private getCollection(collectionKey: string): Map<string, StoredVector> {
    if (!this.store.has(collectionKey)) {
      this.store.set(collectionKey, new Map())
    }
    return this.store.get(collectionKey)!
  }

  async embed(request: VectorEmbeddingRequest): Promise<VectorEmbeddingResponse> {
    const embeddings = request.texts.map((text) => stringToDeterministicVector(text, EMBED_DIM))
    return {
      embeddings,
      model: request.model,
    }
  }

  async upsert(request: VectorUpsertRequest): Promise<{ upserted: number }> {
    const collectionKey = makeCollectionKey(request.namespace, request.collection)
    const collection = this.getCollection(collectionKey)
    let upserted = 0
    for (const vec of request.vectors) {
      collection.set(vec.id, { values: vec.values, metadata: vec.metadata })
      upserted++
    }
    return { upserted }
  }

  async search(request: VectorSearchRequest): Promise<SearchHit[]> {
    const queryVector = stringToDeterministicVector(request.query, EMBED_DIM)
    const collectionKey = makeCollectionKey(request.namespace, request.collection)
    const collection = this.getCollection(collectionKey)
    const hits: SearchHit[] = []

    for (const [id, stored] of collection) {
      const similarity = cosineSimilarity(queryVector, stored.values)
      if (similarity >= request.threshold) {
        hits.push({ id, distance: similarity, metadata: stored.metadata })
      }
    }

    hits.sort((a, b) => b.distance - a.distance)
    return hits.slice(0, request.top_k)
  }

  async delete(request: VectorDeleteRequest): Promise<{ deleted: number }> {
    const collectionKey = makeCollectionKey(request.namespace, request.collection)
    const collection = this.getCollection(collectionKey)
    let deleted = 0
    for (const id of request.ids) {
      if (collection.delete(id)) {
        deleted++
      }
    }
    return { deleted }
  }
}

export const vectorService = new VectorService()
