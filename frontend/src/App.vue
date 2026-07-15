<template>
  <div class="h-screen flex flex-col font-sans overflow-hidden">
    <!-- Header / Nav -->
    <header class="bg-black text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-b border-zinc-800 shrink-0">
      <div class="flex items-center gap-3 cursor-pointer" @click="goHome">
        <LanguagesIcon class="w-6 h-6 text-white" />
        <h1 class="text-lg font-black tracking-widest uppercase">TransAssist</h1>
      </div>

      <!-- Action items when a project is loaded -->
      <div v-if="store.segments.length > 0" class="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
        <!-- Load Project -->
        <label class="border border-zinc-700 hover:border-white text-zinc-300 hover:text-white text-xxs font-bold uppercase tracking-wider px-3 py-2 cursor-pointer transition-colors">
          Open .transassist
          <input 
            type="file" 
            accept=".transassist" 
            class="hidden" 
            @change="loadProjectFile" 
          />
        </label>

        <!-- Save Project -->
        <button 
          @click="saveProjectFile"
          class="border border-zinc-700 hover:border-white text-zinc-300 hover:text-white text-xxs font-bold uppercase tracking-wider px-3 py-2 transition-colors"
          title="Save work-in-progress project as a backup file"
        >
          Save Backup
        </button>

        <!-- Export Text -->
        <button 
          @click="exportTranslatedText"
          class="bg-white hover:bg-zinc-200 text-black text-xxs font-bold uppercase tracking-wider px-4 py-2 transition-colors"
          title="Export final translated text"
        >
          Export TXT
        </button>

        <!-- Toggle Glossary -->
        <button 
          @click="store.isGlossaryOpen = !store.isGlossaryOpen"
          class="border text-xxs font-bold uppercase tracking-wider px-3 py-2 transition-colors"
          :class="store.isGlossaryOpen ? 'bg-zinc-800 border-zinc-700 text-white' : 'border-zinc-700 text-zinc-300 hover:border-white hover:text-white'"
        >
          {{ store.isGlossaryOpen ? '[-] Glossary' : '[+] Glossary' }}
        </button>

        <!-- Reset Workspace -->
        <button 
          @click="confirmReset"
          class="border border-zinc-800 hover:border-red-650 hover:bg-red-950/20 text-zinc-400 hover:text-red-500 text-xxs font-bold uppercase tracking-wider px-3 py-2 transition-colors"
          title="Close current project and start over"
        >
          New File
        </button>
      </div>

      <!-- Quick Restore option if workspace is empty but has local draft -->
      <div v-else-if="hasSavedDraft" class="flex items-center gap-2 mt-4 sm:mt-0">
        <span class="text-xxs text-zinc-400">Restore last translation draft:</span>
        <button 
          @click="restoreDraft"
          class="bg-white text-black hover:bg-zinc-200 text-xxs font-bold uppercase tracking-wider px-3 py-1.5 transition-colors"
        >
          Restore
        </button>
      </div>
    </header>

    <!-- Main Workspace Container -->
    <main class="flex-1 flex overflow-hidden min-h-0">
      <!-- Left side: File import (if empty) or Split table -->
      <div class="flex-1 flex flex-col min-w-0">
        <FileImport 
          v-if="store.segments.length === 0" 
          @import-complete="onImportComplete" 
        />
        <Workspace v-else />
      </div>

      <!-- Right side: Collapsible Glossary Panel -->
      <Glossary 
        v-if="store.segments.length > 0 && store.isGlossaryOpen" 
        @close="store.isGlossaryOpen = false" 
        class="shrink-0"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTranslationStore } from './stores/translationStore'
import FileImport from './components/FileImport.vue'
import Workspace from './components/Workspace.vue'
import Glossary from './components/Glossary.vue'
import { Languages as LanguagesIcon } from '@lucide/vue'

const store = useTranslationStore()
const hasSavedDraft = ref(false)

onMounted(() => {
  // Check if saved workspace draft exists
  const saved = localStorage.getItem('transassist_workspace')
  if (saved) {
    hasSavedDraft.value = true
  }
})

const onImportComplete = () => {
  hasSavedDraft.value = false
}

const restoreDraft = () => {
  const success = store.loadFromLocalStorage()
  if (success) {
    hasSavedDraft.value = false
  }
}

const goHome = () => {
  // Can just do nothing or print status
}

const confirmReset = () => {
  if (confirm("Are you sure you want to close this project? Any unsaved backups will be lost. (Drafts are saved locally in browser)")) {
    store.clearWorkspace()
    hasSavedDraft.value = false
  }
}

// Download .transassist JSON project file
const saveProjectFile = () => {
  const data = {
    projectName: store.projectName,
    sourceLang: store.sourceLang,
    targetLang: store.targetLang,
    splitMethod: store.splitMethod,
    segments: store.segments,
    glossary: store.glossary,
    rawText: store.rawText
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2))
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute("href", dataStr)
  downloadAnchor.setAttribute("download", `${store.projectName.replace(/\s+/g, '-').toLowerCase()}.transassist`)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
}

// Load .transassist JSON project file
const loadProjectFile = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (data.segments) {
        store.projectName = data.projectName || 'Restored Project'
        store.sourceLang = data.sourceLang || 'auto'
        store.targetLang = data.targetLang || 'vi'
        store.splitMethod = data.splitMethod || 'line'
        store.segments = data.segments
        if (data.glossary) store.glossary = data.glossary
        store.rawText = data.rawText || ''
        
        store.persistToLocalStorage()
        alert('Project backup loaded successfully!')
      } else {
        alert('Invalid transassist project file.')
      }
    } catch (err) {
      alert('Failed to parse the project file.')
    }
  }
  reader.readAsText(file)
}

// Export final compiled translation text
const exportTranslatedText = () => {
  // Join the translated segment rows with appropriate spaces/newlines
  // If splitMethod is 'line', join by newline. If 'sentence', join by space or newline depending on spacing
  let delimiter = '\n'
  if (store.splitMethod === 'sentence') {
    delimiter = ' '
  }

  // Map segments to their translations. If translation is empty, fallback to original
  const texts = store.segments.map(seg => {
    return seg.translation.trim() ? seg.translation.trim() : seg.original.trim()
  })

  // Create document string
  const fileContent = texts.join(delimiter)
  
  const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(fileContent)
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute("href", dataStr)
  downloadAnchor.setAttribute("download", `${store.projectName.replace(/\s+/g, '-').toLowerCase()}-translated.txt`)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
}
</script>

<style>
/* Global resets & animations */
.text-xxs {
  font-size: 0.65rem;
}
.text-xxs {
  font-size: 0.65rem;
}
</style>
