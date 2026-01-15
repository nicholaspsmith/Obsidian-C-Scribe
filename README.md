<p align="center">
  <img src="logos/mr-c.png" alt="C-Scribe Logo" width="200">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-not%20functional-red" alt="Status: Not Functional">
</p>

# C-Scribe for Obsidian

Record voice notes, transcribe with AssemblyAI, and summarize conversations with Claude. Based on [Scribe by Mike Alicea](https://github.com/Mikodin/obsidian-scribe).

## Installation

1. Download the latest release from the Releases page
2. Extract to your vault's `.obsidian/plugins/c-scribe/` folder
3. Enable **C-Scribe** in Settings → Community Plugins
4. Add your API keys in the plugin settings:
   - [Anthropic API Key](https://console.anthropic.com/settings/keys) (for Claude summarization)
   - [AssemblyAI API Key](https://www.assemblyai.com/app/account) (for transcription, $50 free credit)
5. Grant microphone permission if prompted

## Features

- **Voice Recording** — Record directly in Obsidian with pause/resume support
- **Transcription** — AssemblyAI transcription with multi-speaker detection (enabled by default)
- **Conversation Summarization** — Claude generates structured notes from your recordings with sections for summary, key points, action items, decisions, and follow-ups
- **Custom Templates** — Built-in Conversation template for calls/meetings, or create your own
- **Interactive Queries** — Say "Hey Scribe" during recording to ask questions
- **Mobile Support** — Works on iOS/Android (screen must stay on while recording on iOS)

## Usage

**Start Recording:**
- Click the microphone icon in the ribbon, or
- Command Palette → "Begin Recording with Scribe"

**Other Commands:**
- **Transcribe & Summarize Current File** — Process an existing audio file
- **Fix Mermaid Chart** — Repair invalid mermaid diagrams

## Settings

| Setting | Default |
|---------|---------|
| Claude Model | Claude Opus 4.5 |
| Template | Conversation |
| Multi-speaker | Enabled |
| Append to active file | Enabled |
| Save audio file | Enabled |

## Supported Models

- Claude Opus 4.5
- Claude Sonnet 4
- Claude 3.7 Sonnet
- Claude 3.5 Sonnet
- Claude 3.5 Haiku

## Acknowledgments

This is a fork of [Scribe by Mike Alicea](https://github.com/Mikodin/obsidian-scribe). All credit for the original plugin architecture goes to Mike and contributors.

Additional thanks to [Drew McDonald (Magic Mic)](https://github.com/drewmcdonald/obsidian-magic-mic) and [Mossy1022 (Smart Memos)](https://github.com/Mossy1022/Smart-Memos).

## License

MIT License
