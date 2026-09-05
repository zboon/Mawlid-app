/* Typen zu search-core.mjs — von Hand gepflegt, wie normalize.d.mts. */

export type QueryForms = {
  q: string
  nq: string
  tq: string
  rawq: string
  isAr: boolean
}

export type Haystack = { norm: string; tight: string; raw: string; ar: string }

export type SearchVerseFields = { ar?: string | null; tr?: string | null; en?: string | null }

export type VerseHit = {
  n: number
  ar: string
  sec: string
  field: 'ar' | 'tr' | 'en'
  seg: number
}

export type Snippet = { pre: string; match: string; post: string }

export function stripBreaks(s: unknown): string
export function segParts(s: unknown): string[]
export function queryForms(query: string | null | undefined): QueryForms
export function buildHaystack(parts: ReadonlyArray<string | null | undefined>): Haystack
export function matchesHaystack(h: Haystack, f: QueryForms): boolean
export function testText(raw: string | null | undefined, f: QueryForms): boolean
export function hitSeg(v: SearchVerseFields, field: 'ar' | 'tr' | 'en', f: QueryForms): number
export function verseHits(verses: ReadonlyArray<SearchVerseFields>, f: QueryForms): VerseHit[]
export function hitSnippet(
  text: string | null | undefined,
  query: string | null | undefined,
  win?: number,
): Snippet
