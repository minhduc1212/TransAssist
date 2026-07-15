<template>
  <div class="w-full h-full overflow-y-auto p-4 md:p-6">
    <div class="max-w-3xl mx-auto my-6 bg-zinc-50 border border-zinc-200 p-8">
    <div class="mb-8 text-center md:text-left">
      <h2 class="text-2xl font-bold tracking-tight text-zinc-900 uppercase">Start a New Translation Project</h2>
      <p class="text-sm text-zinc-500 mt-2">Upload a text file or paste your document content below to begin segmenting.</p>
    </div>

    <!-- Project Details & Languages -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">Project Name</label>
        <input 
          v-model="projectName" 
          type="text" 
          class="w-full bg-white border border-zinc-300 p-3 text-sm focus:outline-none focus:border-black"
          placeholder="e.g. Novel Chapter 1"
        />
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">Source Language</label>
        <select 
          v-model="sourceLang" 
          class="w-full bg-white border border-zinc-300 p-3 text-sm focus:outline-none focus:border-black appearance-none"
        >
          <option value="auto">Auto Detect</option>
          <option value="en">English</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="fr">French</option>
          <option value="es">Spanish</option>
          <option value="de">German</option>
          <option value="ru">Russian</option>
          <option value="vi">Vietnamese</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">Target Language</label>
        <select 
          v-model="targetLang" 
          class="w-full bg-white border border-zinc-300 p-3 text-sm focus:outline-none focus:border-black appearance-none"
        >
          <option value="vi">Vietnamese</option>
          <option value="en">English</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="fr">French</option>
          <option value="es">Spanish</option>
          <option value="de">German</option>
          <option value="ru">Russian</option>
        </select>
      </div>
    </div>

    <!-- Split Method Options -->
    <div class="mb-6 bg-white border border-zinc-200 p-4">
      <label class="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-3">Segmentation Method</label>
      <div class="flex flex-col sm:flex-row gap-4">
        <label class="flex-1 flex items-start gap-3 p-3 border border-zinc-200 cursor-pointer hover:bg-zinc-50" :class="{'border-black bg-zinc-50/55': splitMethod === 'line'}">
          <input 
            type="radio" 
            value="line" 
            v-model="splitMethod" 
            class="mt-1 accent-black" 
          />
          <div>
            <span class="block text-sm font-bold">Split by Paragraph/Line</span>
            <span class="block text-xs text-zinc-500 mt-1">Splits text by newline characters. Best for preserving paragraphs, poetry, or pre-formatted texts.</span>
          </div>
        </label>

        <label class="flex-1 flex items-start gap-3 p-3 border border-zinc-200 cursor-pointer hover:bg-zinc-50" :class="{'border-black bg-zinc-50/55': splitMethod === 'sentence'}">
          <input 
            type="radio" 
            value="sentence" 
            v-model="splitMethod" 
            class="mt-1 accent-black" 
          />
          <div>
            <span class="block text-sm font-bold">Split by Sentence</span>
            <span class="block text-xs text-zinc-500 mt-1">Splits text by punctuation delimiters (. ! ?). Best for prose, academic articles, and novels.</span>
          </div>
        </label>
      </div>
    </div>

    <!-- Drag & Drop / Upload -->
    <div 
      class="border-2 border-dashed p-8 mb-6 text-center cursor-pointer transition-colors"
      :class="isDragging ? 'border-black bg-zinc-100' : 'border-zinc-300 bg-white hover:border-zinc-400'"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleFileDrop"
      @click="triggerFileInput"
    >
      <input 
        type="file" 
        ref="fileInput" 
        class="hidden" 
        accept=".txt" 
        @change="handleFileSelect"
      />
      <div class="flex flex-col items-center justify-center gap-2">
        <UploadIcon class="w-8 h-8 text-zinc-400" />
        <span class="text-sm font-bold text-zinc-800">
          {{ selectedFileName || 'Drag and drop a .txt file here, or click to browse' }}
        </span>
        <span class="text-xs text-zinc-400">Plain text files (.txt) only</span>
      </div>
    </div>

    <!-- Paste Text Box -->
    <div class="mb-8">
      <label class="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">Or paste text directly</label>
      <textarea 
        v-model="pastedText" 
        rows="8" 
        class="w-full bg-white border border-zinc-300 p-4 text-sm font-sans focus:outline-none focus:border-black leading-relaxed"
        placeholder="Paste your source text here..."
      ></textarea>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-end gap-4">
      <button 
        v-if="hasSavedDraft"
        @click="loadDraft"
        class="border border-zinc-400 hover:border-zinc-800 text-zinc-800 font-bold text-xs uppercase tracking-widest px-6 py-4 transition-colors"
      >
        Restore Previous Session
      </button>
      <button 
        @click="processImport" 
        :disabled="isLoading || (!pastedText.trim() && !selectedFileContent)"
        class="bg-black hover:bg-zinc-850 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span v-if="isLoading">Processing...</span>
        <span v-else>Import & Segment</span>
      </button>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTranslationStore } from '../stores/translationStore'
import { Upload as UploadIcon } from '@lucide/vue'

const emit = defineEmits(['import-complete'])
const store = useTranslationStore()

const projectName = ref('Untitled Document')
const sourceLang = ref('auto')
const targetLang = ref('vi')
const splitMethod = ref('line')
const pastedText = ref('')

const isDragging = ref(false)
const isLoading = ref(false)
const selectedFileName = ref('')
const selectedFileContent = ref('')
const fileInput = ref(null)
const hasSavedDraft = ref(false)

onMounted(() => {
  // Check if a saved draft exists
  const saved = localStorage.getItem('transassist_workspace')
  if (saved) {
    hasSavedDraft.value = true
  }
})

const triggerFileInput = () => {
  fileInput.value.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    readFile(file)
  }
}

const handleFileDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.name.endsWith('.txt')) {
    readFile(file)
  } else {
    alert('Please drop a valid .txt file.')
  }
}

const readFile = (file) => {
  selectedFileName.value = file.name
  projectName.value = file.name.replace(/\.[^/.]+$/, "") // strip extension
  
  const reader = new FileReader()
  reader.onload = (e) => {
    selectedFileContent.value = e.target.result
    pastedText.value = e.target.result // Sync to pasted text area
  }
  reader.readAsText(file)
}

const loadDraft = () => {
  const success = store.loadFromLocalStorage()
  if (success) {
    emit('import-complete')
  }
}

const processImport = async () => {
  const textToParse = pastedText.value || selectedFileContent.value
  if (!textToParse.trim()) return

  isLoading.value = true
  try {
    store.projectName = projectName.value
    store.sourceLang = sourceLang.value
    store.targetLang = targetLang.value
    store.splitMethod = splitMethod.value
    
    await store.parseText(textToParse, splitMethod.value)
    emit('import-complete')
  } catch (e) {
    alert('Failed to parse text. Please make sure the backend is running.')
  } finally {
    isLoading.value = false
  }
}
</script>
