# C-Scribe for Obsidian

A fork of [Scribe](https://github.com/Mikodin/obsidian-scribe) that uses **Claude (Anthropic)** for summarization instead of OpenAI.

Record voice notes in Obsidian, transcribe them with AssemblyAI, and summarize them into structured notes with Claude.

## Requirements

- [Anthropic API key](https://console.anthropic.com/settings/keys) - for Claude summarization
- [AssemblyAI API key](https://www.assemblyai.com/app/account) - for audio transcription

## Installation

1. Download the latest release from the [Releases](https://github.com/nicholaspsmith/Obsidian-C-Scribe/releases) page
2. Extract to your vault's `.obsidian/plugins/c-scribe/` folder
3. In Obsidian, go to `Settings` → `Community Plugins` and enable `C-Scribe`
4. Go to the C-Scribe settings and enter your API keys

## Usage

1. Click the microphone icon in the ribbon or use the command palette (`Scribe: Begin Recording`)
2. Speak your notes
3. Click stop - your audio will be transcribed and summarized automatically

## Building from Source

```bash
git clone https://github.com/nicholaspsmith/Obsidian-C-Scribe.git
cd Obsidian-C-Scribe
npm install
npm run build:prod
```

The built plugin will be in the `build/` folder.

## Credits

Based on [Scribe by Mike Alicea](https://github.com/Mikodin/obsidian-scribe).

## License

MIT
