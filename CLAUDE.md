# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Development build with hot-reload (watches for changes)
npm run dev

# Production build (type-checks and minifies)
npm run build:prod

# Format code (check only)
npm run format:check

# Format code (write changes)
npm run format:write
```

### Development Setup

1. Copy `.env.example` to `.env` and set `OBSIDIAN_PLUGINS_PATH` to your vault's plugin folder
2. Run `npm run dev` - this watches for changes and auto-copies to your Obsidian plugins folder
3. Install the [hot-reload plugin](https://github.com/pjeby/hot-reload) in Obsidian for automatic reloading

## Architecture

This is an Obsidian plugin that records voice notes, transcribes them with AssemblyAI, and summarizes with Claude (Anthropic).

### Entry Points

- `main.ts` - Plugin entry point, re-exports from `src/index.ts`
- `src/index.ts` - `ScribePlugin` class extending Obsidian's `Plugin`, orchestrates all functionality

### Core Flow

1. **Recording** (`src/audioRecord/audioRecord.ts`) - Uses Web Audio API via `standardized-audio-context` to capture audio as WebM
2. **Transcription** (`src/util/assemblyAiUtil.ts`) - Sends audio to AssemblyAI, handles chunking for large files
3. **Summarization** (`src/util/anthropicUtils.ts`) - Uses LangChain with Claude to generate structured summaries with Zod schemas

### Key Components

- **Modal UI** (`src/modal/`) - React-based recording controls modal with timer, recording buttons, and options
- **Settings** (`src/settings/`) - React-based settings tab with tabs for General, AI Providers, and Templates
- **Commands** (`src/commands/commands.ts`) - Obsidian command palette integrations
- **Ribbon** (`src/ribbon/ribbon.ts`) - Sidebar ribbon button

### Tech Stack

- **TypeScript/React** with JSX (not TSX extension, uses `.tsx`)
- **Biome** for formatting/linting (2-space indent, single quotes)
- **esbuild** for bundling
- **LangChain** (`@langchain/anthropic`) for Claude integration with structured output
- **Zod** for runtime schema validation of LLM responses

### Important Patterns

- Plugin settings use a React provider pattern (`SettingsFormProvider`)
- LLM responses use Zod schemas with `withStructuredOutput()` for type-safe structured data
- Audio is chunked into smaller files if needed (`src/util/audioDataToChunkedFiles.ts`)
- Note templates are configurable with custom sections and prompts
