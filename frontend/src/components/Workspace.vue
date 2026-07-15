<template>
  <div class="flex-1 flex flex-col min-h-0 bg-white">
    <!-- Workspace Subheader -->
    <div class="p-4 border-b border-zinc-200 bg-zinc-50 flex justify-between items-center">
      <div class="flex items-center gap-4">
        <span class="text-xs font-bold uppercase tracking-widest text-zinc-950">{{ store.projectName }}</span>
        <span class="text-xxs bg-zinc-200 text-zinc-800 px-2 py-0.5 font-semibold uppercase tracking-wider">
          {{ store.segments.length }} rows
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-zinc-500 font-medium">Progress: {{ store.progressPercentage }}%</span>
        <div class="w-24 bg-zinc-200 h-1.5">
          <div class="bg-black h-1.5" :style="{ width: `${store.progressPercentage}%` }"></div>
        </div>
      </div>
    </div>

    <!-- The Split-Screen Workspace Grid -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <div class="grid grid-cols-12 border-b border-zinc-200 text-xxs font-bold uppercase tracking-wider text-zinc-500 bg-zinc-50 sticky top-0 z-10">
        <div class="col-span-1 border-r border-zinc-200 p-3 text-center">#</div>
        <div class="col-span-5 border-r border-zinc-200 p-3">Original Source ({{ getLangName(store.sourceLang) }})</div>
        <div class="col-span-6 p-3">Translation ({{ getLangName(store.targetLang) }})</div>
      </div>

      <!-- Rows -->
      <div v-if="store.segments.length === 0" class="flex flex-col items-center justify-center p-20 text-zinc-400">
        <FileTextIcon class="w-12 h-12 stroke-1 mb-4" />
        <p class="text-sm font-bold uppercase tracking-wider">Workspace is Empty</p>
        <p class="text-xs mt-1">Please import a text file or paste text to get started.</p>
      </div>

      <div 
        v-else
        v-for="(seg, idx) in store.segments" 
        :key="seg.id"
        class="grid grid-cols-12 border-b border-zinc-150 transition-colors group relative"
        :class="[
          focusedSegmentId === seg.id ? 'bg-zinc-50/70 border-zinc-400' : 'hover:bg-zinc-50/30',
          draggedIdx === idx ? 'opacity-40' : '',
          dragoverIdx === idx && draggedIdx !== idx ? 'border border-dashed border-amber-600 bg-amber-50/30' : ''
        ]"
        @dragover.prevent="onDragOver(idx)"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop(idx)"
      >
        <!-- Segment Number & Drag Handle -->
        <div 
          class="col-span-1 border-r border-zinc-200 p-4 flex flex-col items-center justify-center gap-2 select-none"
        >
          <span class="text-xs text-zinc-400 font-mono">{{ idx + 1 }}</span>
          <!-- Drag icon that serves as the handle -->
          <div 
            draggable="true" 
            @dragstart="onDragStart(idx)"
            class="cursor-grab text-zinc-300 hover:text-zinc-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Drag and drop onto another cell to merge them"
          >
            <GripIcon class="w-4 h-4" />
          </div>
        </div>

        <!-- Left Column: Source Text -->
        <div class="col-span-5 border-r border-zinc-200 p-4 relative group/original">
          <!-- Text Display with Glossary Highlights -->
          <div 
            v-if="editingOriginalId !== seg.id"
            v-html="highlightGlossary(seg.original)"
            class="text-sm text-zinc-800 leading-relaxed font-sans select-text whitespace-pre-wrap"
          ></div>
          
          <!-- Direct Editor for Source Code Correction -->
          <textarea 
            v-else
            v-model="editOriginalText"
            rows="2"
            class="w-full bg-white border border-black p-2 text-sm font-sans focus:outline-none leading-relaxed"
            @blur="saveOriginalEdit(seg.id)"
            @keydown.ctrl.enter="saveOriginalEdit(seg.id)"
            ref="originalEditor"
            data-workspace-input="true"
          ></textarea>

          <!-- Edit Original Inline Tool -->
          <div class="absolute right-2 top-2 flex gap-1 opacity-0 group-hover/original:opacity-100 transition-opacity">
            <button 
              v-if="editingOriginalId !== seg.id"
              @click="startOriginalEdit(seg.id, seg.original)"
              class="bg-white border border-zinc-200 p-1 hover:border-black text-zinc-500 hover:text-black transition-colors"
              title="Edit source text"
            >
              <EditIcon class="w-3.5 h-3.5" />
            </button>
            <button 
              @click="openSplitDialog(seg)"
              class="bg-white border border-zinc-200 p-1 hover:border-black text-zinc-500 hover:text-black transition-colors"
              title="Split segment"
            >
              <ScissorsIcon class="w-3.5 h-3.5" />
            </button>
            <button 
              v-if="idx < store.segments.length - 1"
              @click="store.mergeWithNext(seg.id)"
              class="bg-white border border-zinc-200 p-1 hover:border-black text-zinc-500 hover:text-black transition-colors"
              title="Merge with sentence below"
            >
              <MergeIcon class="w-3.5 h-3.5" />
            </button>
            <button 
              @click="store.deleteSegment(seg.id)"
              class="bg-white border border-zinc-200 p-1 hover:border-red-650 text-zinc-400 hover:text-red-650 transition-colors"
              title="Delete segment"
            >
              <TrashIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Right Column: Editable Target Input & MT Suggestions -->
        <div class="col-span-6 p-4 flex flex-col justify-between">
          <textarea 
            v-model="seg.translation"
            rows="2"
            @focus="onTranslationFocus(seg.id)"
            @blur="onTranslationBlur"
            @input="store.updateTranslation(seg.id, seg.translation)"
            class="w-full bg-transparent border-0 border-b border-transparent focus:border-black py-1 px-0 text-sm font-sans focus:outline-none leading-relaxed transition-colors resize-y"
            placeholder="Type translation here..."
            data-workspace-input="true"
          ></textarea>

          <!-- Suggestions Row (Visible when focused or if suggestion exists) -->
          <div 
            v-if="focusedSegmentId === seg.id || (store.suggestions[seg.id] && !store.suggestions[seg.id].loading)"
            class="mt-3 pt-3 border-t border-zinc-100 flex flex-col gap-2"
          >
            <!-- Loading Suggestions -->
            <div v-if="store.suggestions[seg.id]?.loading" class="flex items-center gap-2 text-xxs text-zinc-400">
              <span class="animate-spin inline-block w-3 h-3 border-t border-black rounded-full"></span>
              Fetching translation suggestions...
            </div>

            <!-- Suggestion Badges -->
            <div v-else class="flex flex-wrap gap-2">
              <!-- Google Suggestion -->
              <button 
                v-if="store.suggestions[seg.id]?.google"
                @click="applySuggestion(seg.id, store.suggestions[seg.id].google)"
                class="flex items-center gap-1.5 bg-zinc-50 hover:bg-zinc-150 border border-zinc-200 px-2 py-1 text-xxs font-sans text-zinc-700 hover:text-black text-left transition-colors"
              >
                <span class="font-bold text-zinc-500 uppercase">Google:</span>
                <span>{{ store.suggestions[seg.id].google }}</span>
              </button>

              <!-- MyMemory Suggestion -->
              <button 
                v-if="store.suggestions[seg.id]?.mymemory && store.suggestions[seg.id]?.mymemory !== store.suggestions[seg.id]?.google"
                @click="applySuggestion(seg.id, store.suggestions[seg.id].mymemory)"
                class="flex items-center gap-1.5 bg-zinc-50 hover:bg-zinc-150 border border-zinc-200 px-2 py-1 text-xxs font-sans text-zinc-700 hover:text-black text-left transition-colors"
              >
                <span class="font-bold text-zinc-500 uppercase">MyMemory:</span>
                <span>{{ store.suggestions[seg.id].mymemory }}</span>
              </button>

              <!-- Glossary Match Suggestions -->
              <div 
                v-for="glossTerm in getGlossaryMatches(seg.original)" 
                :key="glossTerm.original"
                class="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1 text-xxs"
              >
                <span class="font-bold uppercase text-amber-700">Glossary:</span>
                <span class="font-semibold">{{ glossTerm.original }}</span>
                <span class="text-amber-500">→</span>
                <button 
                  @click="insertGlossaryWord(seg.id, glossTerm.translation)"
                  class="font-bold underline hover:text-black transition-colors"
                  title="Click to insert at cursor"
                >
                  {{ glossTerm.translation }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Inline Split Dialog Modal -->
    <div 
      v-if="splitDialogVisible"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white border border-black p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <h3 class="text-sm font-bold uppercase tracking-wider text-black mb-4">Split Segment</h3>
        <p class="text-xs text-zinc-500 mb-4">Edit the text in the boxes below to define where the segment splits into two.</p>
        
        <div class="space-y-4">
          <!-- Original Split -->
          <div>
            <label class="block text-xxs font-bold uppercase tracking-wider text-zinc-500 mb-2">Original Source text</label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="block text-xxs text-zinc-400 mb-1">Part 1 (Current row)</span>
                <textarea 
                  v-model="splitOriginalLeft" 
                  rows="3" 
                  class="w-full bg-zinc-50 border border-zinc-300 p-2 text-xs font-sans focus:outline-none focus:border-black resize-none"
                ></textarea>
              </div>
              <div>
                <span class="block text-xxs text-zinc-400 mb-1">Part 2 (New row below)</span>
                <textarea 
                  v-model="splitOriginalRight" 
                  rows="3" 
                  class="w-full bg-zinc-50 border border-zinc-300 p-2 text-xs font-sans focus:outline-none focus:border-black resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Translation Split (Optional) -->
          <div>
            <label class="block text-xxs font-bold uppercase tracking-wider text-zinc-500 mb-2">Translation (Optional)</label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="block text-xxs text-zinc-400 mb-1">Part 1</span>
                <textarea 
                  v-model="splitTranslationLeft" 
                  rows="2" 
                  class="w-full bg-zinc-50 border border-zinc-300 p-2 text-xs font-sans focus:outline-none focus:border-black resize-none"
                ></textarea>
              </div>
              <div>
                <span class="block text-xxs text-zinc-400 mb-1">Part 2</span>
                <textarea 
                  v-model="splitTranslationRight" 
                  rows="2" 
                  class="w-full bg-zinc-50 border border-zinc-300 p-2 text-xs font-sans focus:outline-none focus:border-black resize-none"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button 
            @click="splitDialogVisible = false"
            class="border border-zinc-300 hover:border-black text-xs font-bold uppercase tracking-widest px-4 py-2 transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="confirmSplit"
            :disabled="!splitOriginalLeft.trim() || !splitOriginalRight.trim()"
            class="bg-black hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-widest px-6 py-2 transition-colors disabled:opacity-40"
          >
            Split
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useTranslationStore } from '../stores/translationStore'
import { 
  FileText as FileTextIcon, 
  GripVertical as GripIcon, 
  Edit as EditIcon, 
  Scissors as ScissorsIcon,
  GitMerge as MergeIcon,
  Trash2 as TrashIcon
} from '@lucide/vue'

const store = useTranslationStore()

const focusedSegmentId = ref(null)
const editingOriginalId = ref(null)
const editOriginalText = ref('')
const originalEditor = ref(null)

// Drag and drop state
const draggedIdx = ref(null)
const dragoverIdx = ref(null)

// Split dialog state
const splitDialogVisible = ref(false)
const activeSplitSegment = ref(null)
const splitOriginalLeft = ref('')
const splitOriginalRight = ref('')
const splitTranslationLeft = ref('')
const splitTranslationRight = ref('')

const getLangName = (code) => {
  const names = {
    'auto': 'Auto',
    'en': 'English',
    'vi': 'Vietnamese',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'fr': 'French',
    'es': 'Spanish',
    'de': 'German',
    'ru': 'Russian'
  }
  return names[code] || code.toUpperCase()
}

// Escapes HTML tags to prevent XSS
const escapeHtml = (unsafe) => {
  if (!unsafe) return ''
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// Highlight glossary items in the original text
const highlightGlossary = (text) => {
  if (!text) return ''
  const escapedText = escapeHtml(text)
  if (store.glossary.length === 0) return escapedText

  // Sort terms by length descending to match longer terms first
  const sortedTerms = [...store.glossary]
    .filter(item => item.original.trim().length > 0)
    .sort((a, b) => b.original.length - a.original.length)

  if (sortedTerms.length === 0) return escapedText

  // Escape special chars for regex
  const escapedTerms = sortedTerms
    .map(t => t.original.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .join('|')

  // We use word boundaries \b to prevent partial word matches
  // Unicode word boundary fallback is approximate but \b works great for standard text
  const regex = new RegExp(`\\b(${escapedTerms})\\b`, 'gi')

  return escapedText.replace(regex, (match) => {
    const term = sortedTerms.find(t => t.original.toLowerCase() === match.toLowerCase())
    const trans = term ? term.translation : ''
    return `<span class="bg-amber-100 text-amber-900 border-b border-dashed border-amber-600 font-medium px-0.5 cursor-help" title="Glossary suggestion: ${escapeHtml(trans)}">${match}</span>`
  })
}

// Get matching glossary items for suggestion row
const getGlossaryMatches = (text) => {
  if (!text || store.glossary.length === 0) return []
  const normText = text.toLowerCase()
  return store.glossary.filter(item => {
    if (!item.original.trim()) return false
    const regex = new RegExp(`\\b${item.original.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
    return regex.test(normText)
  })
}

// Focus handlers
const onTranslationFocus = (segmentId) => {
  focusedSegmentId.value = segmentId
  // Async fetch machine translation suggestion if not exists
  if (!store.suggestions[segmentId]) {
    store.fetchSuggestions(segmentId)
  }
}

const onTranslationBlur = () => {
  // Keep active to display suggestions when user wants to click them
  // We can let the click handler apply suggestions before we reset
}

const applySuggestion = (segmentId, suggestion) => {
  store.updateTranslation(segmentId, suggestion)
}

const insertGlossaryWord = (segmentId, word) => {
  const seg = store.segments.find(s => s.id === segmentId)
  if (seg) {
    // Append or insert glossary word
    const text = seg.translation.trim()
    seg.translation = text ? `${text} ${word}` : word
    store.updateTranslation(segmentId, seg.translation)
  }
}

// Edit original source inline
const startOriginalEdit = (segmentId, originalText) => {
  editingOriginalId.value = segmentId
  editOriginalText.value = originalText
  nextTick(() => {
    if (originalEditor.value && originalEditor.value[0]) {
      originalEditor.value[0].focus()
    }
  })
}

const saveOriginalEdit = (segmentId) => {
  if (editingOriginalId.value === segmentId) {
    store.updateOriginal(segmentId, editOriginalText.value)
    editingOriginalId.value = null
  }
}

// Drag & Drop handlers
const onDragStart = (idx) => {
  draggedIdx.value = idx
}

const onDragOver = (idx) => {
  dragoverIdx.value = idx
}

const onDragLeave = () => {
  dragoverIdx.value = null
}

const onDrop = (targetIdx) => {
  if (draggedIdx.value === null) return
  const from = draggedIdx.value
  const to = targetIdx
  
  if (from !== to) {
    const id1 = store.segments[from].id
    const id2 = store.segments[to].id
    
    const isAdjacent = Math.abs(from - to) === 1
    let confirmMsg = ""
    
    if (isAdjacent) {
      confirmMsg = `Merge row ${from + 1} and row ${to + 1}?`
    } else {
      confirmMsg = `Merge row ${from + 1} into row ${to + 1} (non-adjacent)?`
    }
    
    if (confirm(confirmMsg)) {
      store.mergeSegments(id1, id2)
    }
  }
  
  draggedIdx.value = null
  dragoverIdx.value = null
}

// Split logic
const openSplitDialog = (segment) => {
  activeSplitSegment.value = segment
  
  // Try to find a logical midpoint to split the sentence
  const orig = segment.original
  const midPoint = Math.floor(orig.length / 2)
  // Find nearest space to midpoint
  const spaceIdx = orig.indexOf(' ', midPoint)
  
  if (spaceIdx !== -1) {
    splitOriginalLeft.value = orig.substring(0, spaceIdx)
    splitOriginalRight.value = orig.substring(spaceIdx + 1)
  } else {
    splitOriginalLeft.value = orig
    splitOriginalRight.value = ''
  }

  // Same for translation if exists
  const trans = segment.translation
  if (trans) {
    const transMid = Math.floor(trans.length / 2)
    const transSpace = trans.indexOf(' ', transMid)
    if (transSpace !== -1) {
      splitTranslationLeft.value = trans.substring(0, transSpace)
      splitTranslationRight.value = trans.substring(transSpace + 1)
    } else {
      splitTranslationLeft.value = trans
      splitTranslationRight.value = ''
    }
  } else {
    splitTranslationLeft.value = ''
    splitTranslationRight.value = ''
  }
  
  splitDialogVisible.value = true
}

const confirmSplit = () => {
  if (activeSplitSegment.value) {
    store.splitSegment(
      activeSplitSegment.value.id,
      splitOriginalLeft.value,
      splitOriginalRight.value,
      splitTranslationLeft.value,
      splitTranslationRight.value
    )
    splitDialogVisible.value = false
    activeSplitSegment.value = null
  }
}
</script>

<style scoped>
.text-xxs {
  font-size: 0.65rem;
}
</style>
