<template>
  <div class="h-full bg-zinc-50 border-l border-zinc-200 flex flex-col w-80">
    <!-- Header -->
    <div class="p-4 border-b border-zinc-200 flex justify-between items-center bg-white">
      <div class="flex items-center gap-2">
        <BookOpenIcon class="w-4 h-4 text-black" />
        <span class="text-xs font-bold uppercase tracking-wider text-zinc-950">Glossary Manager</span>
      </div>
      <button 
        @click="$emit('close')" 
        class="text-zinc-400 hover:text-black p-1 transition-colors"
        title="Close Sidebar"
      >
        <XIcon class="w-4 h-4" />
      </button>
    </div>

    <!-- Quick Add Form -->
    <div class="p-4 border-b border-zinc-200 bg-white">
      <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-3">Add Term</h3>
      <div class="space-y-3">
        <div>
          <input 
            v-model="newOriginal" 
            type="text" 
            placeholder="Original word / term" 
            class="w-full bg-zinc-50 border border-zinc-300 p-2 text-xs font-medium focus:outline-none focus:border-black"
            @keyup.enter="handleAdd"
          />
        </div>
        <div>
          <input 
            v-model="newTranslation" 
            type="text" 
            placeholder="Translated definition" 
            class="w-full bg-zinc-50 border border-zinc-300 p-2 text-xs font-medium focus:outline-none focus:border-black"
            @keyup.enter="handleAdd"
          />
        </div>
        <button 
          @click="handleAdd"
          :disabled="!newOriginal.trim() || !newTranslation.trim()"
          class="w-full bg-black hover:bg-zinc-800 text-white font-bold text-xxs uppercase tracking-wider py-2 transition-colors disabled:opacity-40"
        >
          Save Term
        </button>
      </div>
    </div>

    <!-- List & Search -->
    <div class="flex-1 flex flex-col min-h-0 bg-zinc-50">
      <div class="p-3 border-b border-zinc-200">
        <div class="relative">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search glossary..." 
            class="w-full bg-white border border-zinc-300 pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-black"
          />
          <SearchIcon class="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3" />
        </div>
      </div>

      <!-- Glossary List -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        <div v-if="filteredGlossary.length === 0" class="text-center py-8 text-zinc-400 text-xs">
          No terms found
        </div>
        <div 
          v-for="item in filteredGlossary" 
          :key="item.original"
          class="bg-white border border-zinc-200 p-2 flex justify-between items-start group hover:border-zinc-400"
        >
          <div class="min-w-0 pr-2">
            <span class="block text-xs font-bold text-zinc-800 truncate" :title="item.original">{{ item.original }}</span>
            <span class="block text-xs text-zinc-500 mt-1 truncate" :title="item.translation">{{ item.translation }}</span>
          </div>
          <button 
            @click="store.deleteGlossaryTerm(item.original)"
            class="text-zinc-300 hover:text-red-600 p-0.5 self-center transition-colors opacity-0 group-hover:opacity-100"
          >
            <TrashIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Import/Export Footer -->
    <div class="p-3 border-t border-zinc-200 bg-white grid grid-cols-2 gap-2">
      <button 
        @click="exportGlossary"
        class="border border-zinc-300 hover:border-black text-zinc-700 hover:text-black text-xxs font-bold uppercase tracking-wider py-2 text-center"
      >
        Export JSON
      </button>
      <label class="border border-zinc-300 hover:border-black text-zinc-700 hover:text-black text-xxs font-bold uppercase tracking-wider py-2 text-center cursor-pointer">
        Import JSON
        <input 
          type="file" 
          accept=".json" 
          class="hidden" 
          @change="importGlossary" 
        />
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTranslationStore } from '../stores/translationStore'
import { 
  BookOpen as BookOpenIcon, 
  X as XIcon, 
  Trash2 as TrashIcon, 
  Search as SearchIcon 
} from '@lucide/vue'

const store = useTranslationStore()

const newOriginal = ref('')
const newTranslation = ref('')
const searchQuery = ref('')

const handleAdd = () => {
  if (newOriginal.value.trim() && newTranslation.value.trim()) {
    store.addGlossaryTerm(newOriginal.value, newTranslation.value)
    newOriginal.value = ''
    newTranslation.value = ''
  }
}

const filteredGlossary = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return store.glossary
  return store.glossary.filter(item => 
    item.original.toLowerCase().includes(q) || 
    item.translation.toLowerCase().includes(q)
  )
})

const exportGlossary = () => {
  if (store.glossary.length === 0) {
    alert('Glossary is empty!')
    return
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store.glossary, null, 2))
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute("href", dataStr)
  downloadAnchor.setAttribute("download", `glossary-${store.projectName.replace(/\s+/g, '-').toLowerCase()}.json`)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
}

const importGlossary = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const list = JSON.parse(e.target.result)
      store.importGlossary(list)
      alert('Glossary imported successfully!')
    } catch (err) {
      alert('Failed to parse glossary file. Make sure it is valid JSON.')
    }
  }
  reader.readAsText(file)
}
</script>

<style scoped>
.text-xxs {
  font-size: 0.65rem;
}
</style>
