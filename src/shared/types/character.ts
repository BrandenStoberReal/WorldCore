import type { z } from 'zod';
import {
  CharacterSpecVersionSchema,
  CharacterSpecSchema,
  RoleSchema,
  DepthPromptSchema,
  CharacterExtensionsSchema,
  CharacterBookEntrySchema,
  CharacterBookSchema,
  CharacterDataSchema,
  CharacterSchema,
  ShallowCharacterSchema,
  CharacterCreateInputSchema,
  CharacterEditAttributeInputSchema,
  CropSchema,
  CardSearchOptionsSchema,
  CardBrowseOptionsSchema,
  CardListingSchema,
} from '@/shared/schemas/character';

export type CharacterSpecVersion = z.infer<typeof CharacterSpecVersionSchema>;
export type CharacterSpec = z.infer<typeof CharacterSpecSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type DepthPrompt = z.infer<typeof DepthPromptSchema>;
export type CharacterExtensions = z.infer<typeof CharacterExtensionsSchema>;
export type CharacterBookEntry = z.infer<typeof CharacterBookEntrySchema>;
export type CharacterBook = z.infer<typeof CharacterBookSchema>;
export type CharacterData = z.infer<typeof CharacterDataSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type ShallowCharacter = z.infer<typeof ShallowCharacterSchema>;
export type CharacterCreateInput = z.infer<typeof CharacterCreateInputSchema>;
export type CharacterEditAttributeInput = z.infer<typeof CharacterEditAttributeInputSchema>;
export type Crop = z.infer<typeof CropSchema>;

export type CardSearchOptions = z.infer<typeof CardSearchOptionsSchema>;
export type CardBrowseOptions = z.infer<typeof CardBrowseOptionsSchema>;
export type CardListing = z.infer<typeof CardListingSchema>;

// Result shape a CardSource.search() may return. The framework auto-detects
// which variant and normalizes to an array.
export type CardSearchResult =
  CardListing[] | { items: CardListing[]; nextCursor?: string } | AsyncIterable<CardListing>;

/* eslint-disable-next-line @typescript-eslint/no-empty-interface --
   CardSource is a plain TS interface (not Zod-derived) because it carries
   function members (search, fetchCard) that Zod cannot describe. This is a
   documented, narrow exception to the type-first rule. Do NOT take this as
   precedent for non-Zod data shapes. */
export interface CardSource {
  id: string;
  label: string;
  description?: string;
  /** Lucide icon name. The framework resolves it via dynamic import; sources must not import React. */
  icon?: string;
  search?: (query: string, opts?: CardSearchOptions) => CardSearchResult;
  /** Browse without a search query. Called when the search input is empty. Falls back to search('') if not provided. */
  browse?: (opts?: CardBrowseOptions) => CardSearchResult;
  fetchCard: (listing: CardListing) => Promise<ArrayBuffer>;
  /**
   * Download the card data together with its avatar image. When implemented,
   * the framework uses this instead of {@link fetchCard} so the source can
   * apply provider-specific headers (Referer, Origin, auth, etc.) to the
   * avatar fetch — which a plain browser fetch() cannot set.
   *
   * Returns the card bytes (same shape as fetchCard) plus an optional avatar
   * image buffer that will be used as the character's portrait and thumbnail.
   */
  downloadCard?: (listing: CardListing) => Promise<DownloadedCard>;
  /** Optional. Called when the user opens a card's detail page. Returns rich metadata for display. */
  getDetails?: (listing: CardListing) => Promise<CardDetails>;
}

export interface DownloadedCard {
  card: ArrayBuffer;
  avatar?: ArrayBuffer;
}

export interface CardDetails {
  description?: string;
  tagline?: string;
  starCount?: number;
  chatCount?: number;
  nsfw?: boolean;
  topics?: string[];
  custom?: Record<string, unknown>;
}
