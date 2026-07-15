# DESIGN.md

## 1. Project Overview
**TransFlow** is a minimalist, high-efficiency web application designed to assist translators in translating novels, documents, and other text-based files. By breaking down text line-by-line and pairing it with integrated translation APIs, glossary management, and intuitive paragraph merging, TransFlow streamlines the translation workflow.

---

## 2. Design System (UI/UX)
Following a **flat, ultra-minimalist, and modern** aesthetic (inspired by DeepL and minimalist typography-focused platforms), the interface prioritizes readability, sharp lines, and zero distractions.

### Design Principles
* **Zero Rounded Corners:** No border-radius ($0\text{px}$). Sharp, structural, and flat.
* **High-Contrast Typography:** Clean sans-serif fonts optimized for long-form reading.
* **Neutral Palette:** Rely heavily on whites, grays, and deep blacks/blues to reduce eye strain.
* **Spacious Layout:** Generous padding and clear grid structures.

### Color Palette
| Element | Color Code | Description |
| :--- | :--- | :--- |
| **Primary Background** | `#FFFFFF` | Main background for clean workspace |
| **Secondary Background**| `#F9F9F9` | Used for tables, sidebars, and inactive inputs |
| **Border / Grid Line** | `#E0E0E0` | Ultra-thin flat borders ($1\text{px}$ solid) |
| **Text (Primary)** | `#1A1A1A` | Off-black for high readability |
| **Text (Secondary)** | `#707070` | Muted gray for original text/meta-info |
| **Accent / Interactive**| `#000000` or `#121212` | Bold black for buttons and active states |

### Typography
* **Primary Font:** `Inter`, `Helvetica Neue`, system-ui, sans-serif.
* **Font Scaling:**
    * Headers: Bold, sharp, medium scale (no oversized elements).
    * Translation Text: `16px` with a comfortable line-height (`1.6`) to prevent eye fatigue during long sessions.

---

## 3. Core Features & User Flow

### 3.1. File Import
* Users upload/paste their raw text or document.
* The system automatically parses the text, splitting it **line-by-line** (or sentence-by-sentence based on delimiters like `.`, `?`, `!`, `\n`).

### 3.2. Split-Screen Translation Workspace (The Grid)
* **Left Column (Original):** Read-only, source language text.
* **Right Column (Target):** Editable text areas for the translator.
* **Drag-and-Drop Merging:**
    * If a sentence makes more sense when translated in context with the next one, users can drag a cell and drop it onto the adjacent one to **merge** them into a single translation block.
* **Integrated Machine Translation (MT) Row:**
    * Hovering or focusing on a line displays quick translation suggestions from **Google Translate, Bing Translator**, etc., directly under the target cell. One-click to apply.

### 3.3. Glossary Box (Collapsible)
* A collapsible floating panel or docked sidebar located in a small right corner (e.g., bottom-right).
* Can be easily toggled open/closed (`[+] / [-]`) to maximize workspace real estate when not in use.
* Allows translators to quickly save terms: `[Original Term] = [Translated Term]`.
* **Smart Highlight:** If an original text line contains a saved glossary term, it is subtly highlighted, and the translation is suggested nearby.

---

## 4. Architecture & Technology Stack

```
+-------------------------------------------------------------+
|                         Frontend                            |
|                          Vue.js                             |
|    (State: Pinia | Drag & Drop: HTML5 DnD / vuedraggable)   |
+------------------------------+------------------------------+
                               |
                        REST / WebSocket
                               |
+------------------------------v------------------------------+
|                         Backend                             |
|                         FastAPI                             |
|        (Parsing engine, Glossary DB, MT API Wrapper)        |
+-------------------------------------------------------------+
```

### Frontend: Vue.js
* **Why Vue.js:** Perfect for reactive UI updates (like dynamically merging/splitting cells without page reloads).
* **Key libraries:**
    * `vuedraggable` (or raw HTML5 Drag and Drop API) for merging cells.
    * `Tailwind CSS` (configured with `rounded-none` globally) for rapid, flat utility-first styling.

### Backend: FastAPI
* **Why FastAPI:** High performance, auto-documented, and excellent for handling third-party API requests (Google, Bing Translate) asynchronously.
* **Key Responsibilities:**
    * Text segmentation/parsing logic.
    * Aggregating translations from Google Translate and Bing APIs.
    * Managing glossary CRUD operations (SQLite/PostgreSQL).

---

## 5. UI Mockup Blueprint (Layout)

```
+------------------------------------------------------------------------------------+
|  TransFlow  |  [File: novel_ch1.txt]                      [ Glossary  ] [Settings] |
+------------------------------------------------------------------------------------+
|  ORIGINAL (Source)                  |  TRANSLATION (Target)                        |
+-------------------------------------+----------------------------------------------+
|  [Line 1]                           |  [ Editable Input Area ]                     |
|  Once upon a time, in a far land... |  Ngày xửa ngày xưa, tại một nơi xa xôi...    |
|                                     |  ------------------------------------------  |
|                                     |  Suggest: [Google: Ngày xửa ngày xưa...]     |
+-------------------------------------+----------------------------------------------+
|  [Line 2] (Drag handle [=])         |  [ Editable Input Area ]                     |
|  There lived a young coder.         |  Có một lập trình viên trẻ sinh sống.        |
+-------------------------------------+----------------------------------------------+
|  [Line 3] (Drag handle [=])         |  [ Editable Input Area ]                     |
|  He loved minimalist designs.       |                                              |
+-------------------------------------+----------------------------------------------+
|                                     |  [Glossary Sidebar]                          |
|                                     |  +----------------------------------------+  |
|                                     |  | coder = lập trình viên          [x]    |  |
|                                     |  | minimalist = tối giản           [x]    |  |
|                                     |  | + [Add New Term]                       |  |
|                                     |  +----------------------------------------+  |
+-------------------------------------+----------------------------------------------+