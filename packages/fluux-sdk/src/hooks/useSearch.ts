/**
 * React hook for full-text message search.
 *
 * Provides access to the search store state and actions.
 *
 * @example
 * ```tsx
 * function SearchPanel() {
 *   const { query, results, isSearching, search, clearSearch } = useSearch()
 *
 *   return (
 *     <div>
 *       <input
 *         value={query}
 *         onChange={(e) => search(e.target.value)}
 *         placeholder="Search messages..."
 *       />
 *       {isSearching && <Spinner />}
 *       {results.map((r) => (
 *         <SearchResultItem key={r.indexId} result={r} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 *
 * @module Hooks/useSearch
 */

import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { searchStore, type SearchResult } from '../stores/searchStore'

/**
 * Hook for searching messages across all conversations and rooms.
 *
 * Search is debounced (300ms) and queries a local IndexedDB inverted index.
 */
export function useSearch() {
  const { query, isSearching, results, error, previewResult } = useStore(
    searchStore,
    useShallow((state) => ({
      query: state.query,
      isSearching: state.isSearching,
      results: state.results,
      error: state.error,
      previewResult: state.previewResult,
    }))
  )

  return {
    /** Current search query */
    query,
    /** Whether a search is in progress */
    isSearching,
    /** Search results sorted by recency */
    results,
    /** Error message if search failed */
    error,
    /** Search result currently being previewed in context */
    previewResult,
    /** Execute a search (debounced 300ms) */
    search: searchStore.getState().search,
    /** Clear search state and results */
    clearSearch: searchStore.getState().clearSearch,
    /** Set the search result to preview in context */
    setPreviewResult: searchStore.getState().setPreviewResult,
  }
}

export type { SearchResult }
