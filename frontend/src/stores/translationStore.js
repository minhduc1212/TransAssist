import { defineStore } from 'pinia'

// Helper to determine the API URL
const getApiUrl = () => {
  // If Vite env variable is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // Otherwise, default to localhost for development
  // or use the current host if deployed together
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000'
    }
  }
  return '/api'
}

export const useTranslationStore = defineStore('translation', {
  state: () => ({
    segments: [],
    glossary: [],
    sourceLang: 'auto',
    targetLang: 'vi',
    splitMethod: 'line',
    projectName: 'Untitled Document',
    isGlossaryOpen: false,
    suggestions: {}, // segmentId -> { google, mymemory, loading }
    apiUrl: getApiUrl(),
    rawText: ''
  }),

  getters: {
    totalSegments: (state) => state.segments.length,
    translatedSegmentsCount: (state) => 
      state.segments.filter(s => s.translation && s.translation.trim().length > 0).length,
    progressPercentage: (state) => {
      if (state.segments.length === 0) return 0
      return Math.round((state.segments.filter(s => s.translation && s.translation.trim().length > 0).length / state.segments.length) * 100)
    },
    // Highlights glossary matches inside original text
    // Returns regex or matcher for each glossary item
    glossaryMap: (state) => {
      const map = {}
      state.glossary.forEach(item => {
        if (item.original.trim()) {
          map[item.original.toLowerCase()] = item.translation
        }
      })
      return map
    }
  },

  actions: {
    // Save current workspace state to localStorage
    persistToLocalStorage() {
      try {
        const data = {
          segments: this.segments,
          glossary: this.glossary,
          sourceLang: this.sourceLang,
          targetLang: this.targetLang,
          splitMethod: this.splitMethod,
          projectName: this.projectName,
          rawText: this.rawText
        }
        localStorage.setItem('transassist_workspace', JSON.stringify(data))
      } catch (e) {
        console.error('Failed to auto-save to localStorage', e)
      }
    },

    // Load workspace state from localStorage
    loadFromLocalStorage() {
      try {
        const dataStr = localStorage.getItem('transassist_workspace')
        if (dataStr) {
          const data = JSON.parse(dataStr)
          if (data.segments) this.segments = data.segments
          if (data.glossary) this.glossary = data.glossary
          if (data.sourceLang) this.sourceLang = data.sourceLang
          if (data.targetLang) this.targetLang = data.targetLang
          if (data.splitMethod) this.splitMethod = data.splitMethod
          if (data.projectName) this.projectName = data.projectName
          if (data.rawText !== undefined) this.rawText = data.rawText
          return true
        }
      } catch (e) {
        console.error('Failed to load from localStorage', e)
      }
      return false
    },

    // Clear local storage and reset workspace
    clearWorkspace() {
      this.segments = []
      this.projectName = 'Untitled Document'
      this.suggestions = {}
      this.rawText = ''
      localStorage.removeItem('transassist_workspace')
    },

    // Parse raw text via FastAPI backend
    async parseText(text, splitMethod = 'line') {
      try {
        const response = await fetch(`${this.apiUrl}/api/parse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text,
            split_method: splitMethod
          })
        })

        if (!response.ok) {
          throw new Error(`Server returned code ${response.status}`)
        }

        const data = await response.json()
        this.rawText = text
        this.segments = data.segments
        this.splitMethod = splitMethod
        this.suggestions = {}
        this.persistToLocalStorage()
      } catch (e) {
        console.error('Failed to parse text', e)
        throw e
      }
    },

    // Update the translation text for a single segment
    updateTranslation(segmentId, translation) {
      const idx = this.segments.findIndex(s => s.id === segmentId)
      if (idx !== -1) {
        this.segments[idx].translation = translation
        this.persistToLocalStorage()
      }
    },

    // Update the original text for a single segment
    updateOriginal(segmentId, original) {
      const idx = this.segments.findIndex(s => s.id === segmentId)
      if (idx !== -1) {
        this.segments[idx].original = original
        this.persistToLocalStorage()
      }
    },

    // Merge segment with the one below it
    mergeWithNext(segmentId) {
      const idx = this.segments.findIndex(s => s.id === segmentId)
      if (idx !== -1 && idx < this.segments.length - 1) {
        const nextId = this.segments[idx + 1].id
        this.mergeSegments(segmentId, nextId)
      }
    },

    // Merge two segments together (used by Drag & Drop and merge-next)
    mergeSegments(id1, id2) {
      const idx1 = this.segments.findIndex(s => s.id === id1)
      const idx2 = this.segments.findIndex(s => s.id === id2)
      if (idx1 !== -1 && idx2 !== -1 && idx1 !== idx2) {
        const seg1 = this.segments[idx1]
        const seg2 = this.segments[idx2]
        
        // Sort chronologically
        const lowerIdx = Math.min(idx1, idx2)
        const upperIdx = Math.max(idx1, idx2)
        
        const firstSeg = this.segments[lowerIdx]
        const secondSeg = this.segments[upperIdx]
        
        const isAdjacent = Math.abs(idx1 - idx2) === 1
        
        let mergedOriginal = ""
        let newStart = 0
        let newEnd = 0
        
        if (isAdjacent && this.rawText) {
          // Re-create original text paragraph as in original text
          newStart = Math.min(firstSeg.startIndex, secondSeg.startIndex)
          newEnd = Math.max(firstSeg.endIndex, secondSeg.endIndex)
          mergedOriginal = this.rawText.substring(newStart, newEnd)
        } else {
          // Fallback/Non-adjacent: Concatenate with newline
          mergedOriginal = `${firstSeg.original.trim()}\n${secondSeg.original.trim()}`
          newStart = Math.min(firstSeg.startIndex, secondSeg.startIndex)
          newEnd = Math.max(firstSeg.endIndex, secondSeg.endIndex)
        }
        
        // Merge translation text chronologically
        let mergedTranslation = ""
        if (firstSeg.translation.trim() && secondSeg.translation.trim()) {
          mergedTranslation = `${firstSeg.translation.trim()} ${secondSeg.translation.trim()}`
        } else {
          mergedTranslation = firstSeg.translation.trim() || secondSeg.translation.trim()
        }
        
        // Place merged content in the first segment slot
        firstSeg.original = mergedOriginal
        firstSeg.translation = mergedTranslation
        firstSeg.startIndex = newStart
        firstSeg.endIndex = newEnd
        
        // Remove the second segment
        this.segments.splice(upperIdx, 1)
        
        // Clean up suggestions
        delete this.suggestions[id1]
        delete this.suggestions[id2]
        
        this.persistToLocalStorage()
      }
    },

    // Split segment into two segments at a specific word position in original text
    splitSegment(segmentId, originalLeft, originalRight, translationLeft = '', translationRight = '') {
      const idx = this.segments.findIndex(s => s.id === segmentId)
      if (idx !== -1) {
        const current = this.segments[idx]
        
        // Create new segment properties
        const newSegId = Math.max(...this.segments.map(s => s.id)) + 1
        
        // Update current segment to be the left side
        current.original = originalLeft.trim()
        current.translation = translationLeft.trim()
        
        // Create new segment for the right side
        const newSegment = {
          id: newSegId,
          original: originalRight.trim(),
          translation: translationRight.trim()
        }
        
        // Insert new segment right after the current one
        this.segments.splice(idx + 1, 0, newSegment)
        
        // Clear old suggestions
        delete this.suggestions[segmentId]
        
        this.persistToLocalStorage()
      }
    },

    // Delete a segment
    deleteSegment(segmentId) {
      const idx = this.segments.findIndex(s => s.id === segmentId)
      if (idx !== -1) {
        this.segments.splice(idx, 1)
        delete this.suggestions[segmentId]
        this.persistToLocalStorage()
      }
    },

    // Move segment order
    moveSegment(fromIdx, toIdx) {
      if (fromIdx >= 0 && fromIdx < this.segments.length && toIdx >= 0 && toIdx < this.segments.length) {
        const element = this.segments.splice(fromIdx, 1)[0]
        this.segments.splice(toIdx, 0, element)
        this.persistToLocalStorage()
      }
    },

    // Fetch translation suggestions for a segment from FastAPI backend
    async fetchSuggestions(segmentId) {
      const segment = this.segments.find(s => s.id === segmentId)
      if (!segment || !segment.original.trim()) return

      // Initialize suggestion state as loading
      this.suggestions[segmentId] = {
        google: '',
        mymemory: '',
        loading: true
      }

      try {
        const response = await fetch(`${this.apiUrl}/api/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: segment.original,
            source_lang: this.sourceLang,
            target_lang: this.targetLang
          })
        })

        if (!response.ok) {
          throw new Error('Failed to fetch translation suggestions')
        }

        const data = await response.json()
        this.suggestions[segmentId] = {
          google: data.google,
          mymemory: data.mymemory,
          loading: false
        }
      } catch (e) {
        console.error(`Failed to get translation for segment ${segmentId}`, e)
        this.suggestions[segmentId] = {
          google: 'Error fetching translation',
          mymemory: 'Error fetching translation',
          loading: false
        }
      }
    },

    // Glossary Actions
    addGlossaryTerm(original, translation) {
      if (!original.trim() || !translation.trim()) return
      
      const normOriginal = original.trim().toLowerCase()
      const existingIdx = this.glossary.findIndex(item => item.original.trim().toLowerCase() === normOriginal)
      
      if (existingIdx !== -1) {
        this.glossary[existingIdx].translation = translation.trim()
      } else {
        this.glossary.push({
          original: original.trim(),
          translation: translation.trim()
        })
      }
      this.persistToLocalStorage()
    },

    deleteGlossaryTerm(original) {
      const normOriginal = original.trim().toLowerCase()
      const idx = this.glossary.findIndex(item => item.original.trim().toLowerCase() === normOriginal)
      if (idx !== -1) {
        this.glossary.splice(idx, 1)
        this.persistToLocalStorage()
      }
    },

    importGlossary(list) {
      if (Array.isArray(list)) {
        list.forEach(item => {
          if (item.original && item.translation) {
            this.addGlossaryTerm(item.original, item.translation)
          }
        })
        this.persistToLocalStorage()
      }
    }
  }
})
