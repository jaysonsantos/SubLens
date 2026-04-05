<script setup lang="ts">
import { computed, ref } from 'vue'
import { charDiff, type Segment } from '../lib/diff'
import { formatTime, parseSRT } from '../lib/srt-parser'

const leftRaw = ref('')
const rightRaw = ref('')
const leftFileName = ref('')
const rightFileName = ref('')

const leftFileInput = ref<HTMLInputElement>()
const rightFileInput = ref<HTMLInputElement>()
const bothFileInput = ref<HTMLInputElement>()

const hasBothFiles = computed(() => leftRaw.value && rightRaw.value)

interface DiffRow {
  index: number
  start: string
  end: string
  type: 'equal' | 'changed' | 'added' | 'removed'
  leftText: string
  rightText: string
  leftSegs: Segment[]
  rightSegs: Segment[]
}

const diffRows = computed<DiffRow[]>(() => {
  const left = parseSRT(leftRaw.value)
  const right = parseSRT(rightRaw.value)
  const max = Math.max(left.length, right.length)
  const rows: DiffRow[] = []

  for (let i = 0; i < max; i++) {
    const l = left[i]
    const r = right[i]

    if (!l && r) {
      const rText = maybeStrip(r.text)
      rows.push({
        index: r.index,
        start: formatTime(r.start),
        end: formatTime(r.end),
        type: 'added',
        leftText: '',
        rightText: rText,
        leftSegs: [],
        rightSegs: [{ text: rText, type: 'equal' }],
      })
    } else if (l && !r) {
      const lText = maybeStrip(l.text)
      rows.push({
        index: l.index,
        start: formatTime(l.start),
        end: formatTime(l.end),
        type: 'removed',
        leftText: lText,
        rightText: '',
        leftSegs: [{ text: lText, type: 'equal' }],
        rightSegs: [],
      })
    } else if (l && r) {
      const lText = maybeStrip(l.text)
      const rText = maybeStrip(r.text)
      const isDiff = lText !== rText
      const segs = isDiff ? charDiff(lText, rText) : null
      rows.push({
        index: l.index,
        start: formatTime(l.start),
        end: formatTime(l.end),
        type: isDiff ? 'changed' : 'equal',
        leftText: lText,
        rightText: rText,
        leftSegs: segs ? segs.left : [{ text: lText, type: 'equal' }],
        rightSegs: segs ? segs.right : [{ text: rText, type: 'equal' }],
      })
    }
  }

  return rows
})

const stats = computed(() => {
  const total = diffRows.value.length
  const equal = diffRows.value.filter((r) => r.type === 'equal').length
  const changed = diffRows.value.filter((r) => r.type === 'changed').length
  const added = diffRows.value.filter((r) => r.type === 'added').length
  const removed = diffRows.value.filter((r) => r.type === 'removed').length
  return { total, equal, changed, added, removed }
})

const showEqual = ref(true)
const stripHtml = ref(false)
const searchQuery = ref('')

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

function maybeStrip(text: string): string {
  return stripHtml.value ? stripTags(text) : text
}

const filteredRows = computed(() => {
  let rows = diffRows.value
  if (!showEqual.value) {
    rows = rows.filter((r) => r.type !== 'equal')
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    rows = rows.filter(
      (r) =>
        r.leftText.toLowerCase().includes(q) ||
        r.rightText.toLowerCase().includes(q) ||
        r.index.toString().includes(q),
    )
  }
  return rows
})

function readFile(file: File, side: 'left' | 'right') {
  const reader = new FileReader()
  reader.onload = () => {
    const text = reader.result as string
    if (side === 'left') {
      leftRaw.value = text
      leftFileName.value = file.name
    } else {
      rightRaw.value = text
      rightFileName.value = file.name
    }
  }
  reader.readAsText(file)
}

function onFileLoad(side: 'left' | 'right', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  readFile(file, side)
  input.value = ''
}

function onBothFilesLoad(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length < 2) return
  readFile(files[0], 'left')
  readFile(files[1], 'right')
  input.value = ''
}

function onDrop(side: 'left' | 'right', event: DragEvent) {
  event.preventDefault()
  ;(event.currentTarget as HTMLElement)?.classList.remove('drag-over')
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  if (!file.name.match(/\.(srt|txt)$/i)) return
  readFile(file, side)
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).classList.add('drag-over')
}

function onDragLeave(event: DragEvent) {
  ;(event.currentTarget as HTMLElement).classList.remove('drag-over')
}

function triggerFileInput(side: 'left' | 'right') {
  if (side === 'left') leftFileInput.value?.click()
  else rightFileInput.value?.click()
}

function loadSample() {
  leftFileName.value = 'sample-en.srt'
  rightFileName.value = 'sample-pt.srt'

  leftRaw.value = `1
00:00:01,000 --> 00:00:04,000
Hello, how are you?

2
00:00:05,000 --> 00:00:08,000
I'm fine, thank you.

3
00:00:09,000 --> 00:00:12,000
Where is the train station?

4
00:00:13,000 --> 00:00:16,500
It's two blocks down the road.

5
00:00:17,000 --> 00:00:20,000
Thank you very much!`

  rightRaw.value = `1
00:00:01,000 --> 00:00:04,000
Olá, como vai você?

2
00:00:05,000 --> 00:00:08,000
Estou bem, obrigado.

3
00:00:09,000 --> 00:00:12,000
Onde fica a estação de trem?

4
00:00:13,000 --> 00:00:16,500
É a duas quadras descendo a rua.

5
00:00:17,000 --> 00:00:20,000
Muito obrigado!`
}

function clearAll() {
  leftRaw.value = ''
  rightRaw.value = ''
  leftFileName.value = ''
  rightFileName.value = ''
}

function removeFile(side: 'left' | 'right') {
  if (side === 'left') {
    leftRaw.value = ''
    leftFileName.value = ''
  } else {
    rightRaw.value = ''
    rightFileName.value = ''
  }
}
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="logo">
        <svg
          class="logo-icon"
          viewBox="0 0 24 24"
          width="32"
          height="32"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
        <h1>SubLens</h1>
      </div>
      <p class="subtitle">Side-by-side subtitle comparison tool</p>
    </header>

    <!-- Upload State -->
    <div v-if="!hasBothFiles" class="upload-state">
      <div class="upload-area">
        <div
          class="upload-box"
          :class="{ 'upload-box--filled': leftRaw }"
          @click="triggerFileInput('left')"
          @drop="onDrop('left', $event)"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
        >
          <input
            ref="leftFileInput"
            type="file"
            accept=".srt,.txt"
            @change="onFileLoad('left', $event)"
            hidden
          />
          <div class="upload-icon">
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <template v-if="!leftRaw">
            <span class="upload-title">Original SRT</span>
            <span class="upload-hint">Drop a file or click to browse</span>
          </template>
          <template v-else>
            <span class="upload-filename">{{ leftFileName }}</span>
            <span class="upload-loaded">Loaded</span>
            <button class="upload-remove" @click.stop="removeFile('left')">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </template>
        </div>

        <div class="upload-vs">
          <input
            ref="bothFileInput"
            type="file"
            accept=".srt,.txt"
            multiple
            @change="onBothFilesLoad"
            hidden
          />
          <button
            class="btn-both"
            @click="bothFileInput?.click()"
            title="Select 2 files at once (1st = original, 2nd = translation)"
          >
            Select both
          </button>
        </div>

        <div
          class="upload-box"
          :class="{ 'upload-box--filled': rightRaw }"
          @click="triggerFileInput('right')"
          @drop="onDrop('right', $event)"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
        >
          <input
            ref="rightFileInput"
            type="file"
            accept=".srt,.txt"
            @change="onFileLoad('right', $event)"
            hidden
          />
          <div class="upload-icon">
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <template v-if="!rightRaw">
            <span class="upload-title">Translation SRT</span>
            <span class="upload-hint">Drop a file or click to browse</span>
          </template>
          <template v-else>
            <span class="upload-filename">{{ rightFileName }}</span>
            <span class="upload-loaded">Loaded</span>
            <button class="upload-remove" @click.stop="removeFile('right')">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </template>
        </div>
      </div>

      <div class="upload-actions">
        <div class="or-divider"><span>or</span></div>
        <button class="btn btn-sample" @click="loadSample">
          Load sample subtitles
        </button>
        <div class="paste-option">
          <details>
            <summary>Paste SRT content manually</summary>
            <div class="paste-fields">
              <div class="paste-col">
                <label>Original</label>
                <textarea
                  v-model="leftRaw"
                  placeholder="Paste original SRT here..."
                  rows="8"
                ></textarea>
              </div>
              <div class="paste-col">
                <label>Translation</label>
                <textarea
                  v-model="rightRaw"
                  placeholder="Paste translated SRT here..."
                  rows="8"
                ></textarea>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>

    <!-- Diff View -->
    <div v-else class="diff-view">
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="stat-pills">
            <span class="pill pill--total">{{ stats.total }} lines</span>
            <span class="pill pill--equal" v-if="stats.equal"
              >{{ stats.equal }} equal</span
            >
            <span class="pill pill--changed" v-if="stats.changed"
              >{{ stats.changed }} changed</span
            >
            <span class="pill pill--added" v-if="stats.added"
              >{{ stats.added }} added</span
            >
            <span class="pill pill--removed" v-if="stats.removed"
              >{{ stats.removed }} removed</span
            >
          </div>
        </div>
        <div class="toolbar-center">
          <div class="search-wrap">
            <svg
              class="search-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="searchQuery"
              class="search"
              type="text"
              placeholder="Search lines..."
            />
          </div>
        </div>
        <div class="toolbar-right">
          <label class="toggle">
            <input type="checkbox" v-model="showEqual" />
            <span class="toggle-slider"></span>
            Show equal
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="stripHtml" />
            <span class="toggle-slider"></span>
            Strip HTML
          </label>
          <button class="btn btn-small" @click="clearAll">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      <div class="diff-header">
        <span>#</span>
        <span class="hide-mobile">Time</span>
        <span class="diff-header-name">{{ leftFileName }}</span>
        <span class="diff-header-name">{{ rightFileName }}</span>
      </div>

      <div class="diff-body">
        <div
          v-for="row in filteredRows"
          :key="row.index"
          class="diff-row"
          :class="'diff-row--' + row.type"
        >
          <div class="line-number">{{ row.index }}</div>
          <div class="line-time hide-mobile">
            {{ row.start }} &rarr; {{ row.end }}
          </div>
          <div class="line-content line-left">
            <template v-if="row.type === 'changed'">
              <span
                v-for="(seg, si) in row.leftSegs"
                :key="si"
                :class="
                  seg.type === 'removed' ? 'char-diff char-diff--del' : ''
                "
                >{{ seg.text }}</span
              >
            </template>
            <template v-else>{{ row.leftText }}</template>
          </div>
          <div class="line-content line-right">
            <template v-if="row.type === 'changed'">
              <span
                v-for="(seg, si) in row.rightSegs"
                :key="si"
                :class="seg.type === 'added' ? 'char-diff char-diff--add' : ''"
                >{{ seg.text }}</span
              >
            </template>
            <template v-else>{{ row.rightText }}</template>
          </div>
        </div>
        <div v-if="filteredRows.length === 0" class="no-results">
          <svg
            viewBox="0 0 24 24"
            width="32"
            height="32"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>No matching lines found.</p>
        </div>
      </div>
    </div>
  </div>
</template>
