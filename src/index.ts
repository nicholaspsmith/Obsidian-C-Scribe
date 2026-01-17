import { Notice, normalizePath, Plugin, type TFile } from 'obsidian';

import { AudioRecord } from './audioRecord/audioRecord';
import { handleCommands } from './commands/commands';
import { ScribeControlsModal } from './modal/scribeControlsModal';
import { handleRibbon } from './ribbon/ribbon';
import {
  CONVERSATION_TEMPLATE,
  type ScribeTemplate,
} from './settings/components/NoteTemplateSettings';
import {
  DEFAULT_SETTINGS,
  handleSettingsTab,
  type ScribePluginSettings,
} from './settings/settings';
import { transcribeAudioWithAssemblyAi } from './util/assemblyAiUtil';
import {
  type LLM_MODELS,
  llmFixMermaidChart,
  summarizeTranscript,
} from './util/anthropicUtils';
import type { LanguageOptions } from './util/consts';
import { formatFilenamePrefix } from './util/filenameUtils';
import {
  appendTextToNote,
  createNewNote,
  renameFile,
  saveAudioRecording,
  setupFileFrontmatter,
} from './util/fileUtils';
import {
  mimeTypeToFileExtension,
  type SupportedMimeType,
} from './util/mimeType';
import { getDefaultPathSettings } from './util/pathUtils';
import { convertToSafeJsonKey, extractMermaidChart } from './util/textUtil';

export interface ScribeState {
  isOpen: boolean;
  counter: number;
  audioRecord: AudioRecord | null;
}

const DEFAULT_STATE: ScribeState = {
  isOpen: false,
  counter: 0,
  audioRecord: null,
};

export interface ScribeOptions {
  isAppendToActiveFile: boolean;
  isOnlyTranscribeActive: boolean;
  isSaveAudioFileActive: boolean;
  isMultiSpeakerEnabled: boolean;
  isDisableLlmTranscription: boolean;
  audioFileLanguage: LanguageOptions;
  scribeOutputLanguage: Exclude<LanguageOptions, 'auto'>;
  llmModel: LLM_MODELS;
  activeNoteTemplate: ScribeTemplate;
}

export default class ScribePlugin extends Plugin {
  settings: ScribePluginSettings = DEFAULT_SETTINGS;
  state: ScribeState = DEFAULT_STATE;
  controlModal: ScribeControlsModal;

  async onload() {
    /**
     * Ensures that Obsidian is fully bootstrapped before plugging in.
     * Helps with load time
     * Ensures that when we get the default folders for settings, they are available
     * https://docs.obsidian.md/Plugins/Guides/Optimizing+plugin+load+time#Listening+to+%60vault.on('create')%60
     */
    this.app.workspace.onLayoutReady(async () => {
      await this.loadSettings();
      handleRibbon(this);
      handleCommands(this);
      handleSettingsTab(this);
      this.controlModal = new ScribeControlsModal(this);
    });
  }

  onunload() {}

  async loadSettings() {
    const savedUserData: ScribePluginSettings = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...savedUserData };

    // Migration: Add Conversation template if it doesn't exist
    const hasConversationTemplate = this.settings.noteTemplates.some(
      (t) => t.name === CONVERSATION_TEMPLATE.name,
    );
    if (!hasConversationTemplate) {
      this.settings.noteTemplates.push(CONVERSATION_TEMPLATE);
      await this.saveData(this.settings);
    }

    const defaultPathSettings = await getDefaultPathSettings(this);

    if (!this.settings.anthropicApiKey) {
      console.error(
        'Anthropic API key is needed in Scribes settings - https://console.anthropic.com/settings/keys',
      );
      new Notice('⚠️ Scribe: Anthropic API key is missing for Scribe');
    }

    if (!this.settings.assemblyAiApiKey) {
      console.error(
        'AssemblyAI API key is needed in Scribes settings - https://www.assemblyai.com/app/account',
      );
      new Notice('⚠️ Scribe: AssemblyAI API key is missing for Scribe');
    }

    if (!this.settings.recordingDirectory) {
      this.settings.recordingDirectory =
        defaultPathSettings.defaultNewResourcePath;
    }
    if (!this.settings.transcriptDirectory) {
      this.settings.transcriptDirectory =
        defaultPathSettings.defaultNewFilePath;
    }
  }

  async saveSettings() {
    new Notice('Scribe: ✅ Settings saved');
    await this.saveData(this.settings);
  }

  async startRecording() {
    new Notice('Scribe: 🎙️ Recording started');
    const newRecording = new AudioRecord();
    this.state.audioRecord = newRecording;

    newRecording.startRecording(
      this.settings.selectedAudioDeviceId,
      this.settings.enableMultiChannelMix,
    );
  }

  async handlePauseResumeRecording() {
    this.state.audioRecord?.handlePauseResume();
    if (this.state.audioRecord?.mediaRecorder?.state === 'recording') {
      new Notice('Scribe: ▶️🎙️ Resuming recording');
    }
    if (this.state.audioRecord?.mediaRecorder?.state === 'paused') {
      new Notice('Scribe: ⏸️🎙️ Recording paused');
    }
  }

  async cancelRecording() {
    if (this.state.audioRecord?.mediaRecorder) {
      new Notice('Scribe: 🛑️ Recording cancelled');
      await this.state.audioRecord?.stopRecording();
    }
  }

  async scribe(
    scribeOptions: ScribeOptions = {
      isAppendToActiveFile: this.settings.isAppendToActiveFile,
      isOnlyTranscribeActive: this.settings.isOnlyTranscribeActive,
      isMultiSpeakerEnabled: this.settings.isMultiSpeakerEnabled,
      isSaveAudioFileActive: this.settings.isSaveAudioFileActive,
      isDisableLlmTranscription: this.settings.isDisableLlmTranscription,
      audioFileLanguage: this.settings.audioFileLanguage,
      scribeOutputLanguage: this.settings.scribeOutputLanguage,
      llmModel: this.settings.llmModel,
      activeNoteTemplate: this.settings.activeNoteTemplate,
    },
  ) {
    try {
      const baseFileName = formatFilenamePrefix(
        this.settings.recordingFilenamePrefix,
        this.settings.dateFilenameFormat,
      );

      const { recordingBuffer, recordingFile } =
        await this.handleStopAndSaveRecording(baseFileName);

      await this.handleScribeFile({
        audioRecordingFile: recordingFile,
        audioRecordingBuffer: recordingBuffer,
        scribeOptions: scribeOptions,
      });

      if (!scribeOptions.isSaveAudioFileActive) {
        const fileName = recordingFile.name;
        await this.app.vault.delete(recordingFile);
        new Notice(`Scribe: ✅🗑️ Audio file deleted ${fileName}`);
      }
    } catch (error) {
      new Notice(`Scribe: Something went wrong ${error.toString()}`);
      console.error('Scribe: Something went wrong', error);
    } finally {
      await this.cleanup();
    }
  }

  async scribeExistingFile(
    audioFile: TFile,
    scribeOptions: ScribeOptions = {
      isAppendToActiveFile: this.settings.isAppendToActiveFile,
      isOnlyTranscribeActive: this.settings.isOnlyTranscribeActive,
      isMultiSpeakerEnabled: this.settings.isMultiSpeakerEnabled,
      isSaveAudioFileActive: this.settings.isSaveAudioFileActive,
      isDisableLlmTranscription: this.settings.isDisableLlmTranscription,
      audioFileLanguage: this.settings.audioFileLanguage,
      scribeOutputLanguage: this.settings.scribeOutputLanguage,
      llmModel: this.settings.llmModel,
      activeNoteTemplate: this.settings.activeNoteTemplate,
    },
  ) {
    try {
      if (
        !mimeTypeToFileExtension(
          `audio/${audioFile.extension}` as SupportedMimeType,
        )
      ) {
        new Notice('Scribe: ⚠️ This file type is not supported.');
        return;
      }

      const audioFileBuffer = await this.app.vault.readBinary(audioFile);

      await this.handleScribeFile({
        audioRecordingFile: audioFile,
        audioRecordingBuffer: audioFileBuffer,
        scribeOptions: scribeOptions,
      });
    } catch (error) {
      new Notice(`Scribe: Something went wrong ${error.toString()}`);
      console.error('Scribe: Something went wrong', error);
    } finally {
      await this.cleanup();
    }
  }

  async fixMermaidChart(file: TFile) {
    try {
      let brokenMermaidChart: string | undefined;
      await this.app.vault.process(file, (data) => {
        brokenMermaidChart = extractMermaidChart(data);
        return data;
      });

      let fixedMermaidChart: string | undefined;
      if (brokenMermaidChart) {
        fixedMermaidChart = (
          await llmFixMermaidChart(
            this.settings.anthropicApiKey,
            brokenMermaidChart,
            this.settings.llmModel,
          )
        ).mermaidChart;
      }

      if (brokenMermaidChart && fixedMermaidChart) {
        await this.app.vault.process(file, (data) => {
          brokenMermaidChart = extractMermaidChart(data);

          return data.replace(
            brokenMermaidChart as string,
            `${fixedMermaidChart}
`,
          );
        });
      }
    } catch (error) {
      new Notice(`Scribe: Something went wrong ${error.toString()}`);
    } finally {
      await this.cleanup();
    }
  }

  async handleStopAndSaveRecording(baseFileName: string) {
    const audioRecord = this.state.audioRecord as AudioRecord;

    const audioBlob = await audioRecord.stopRecording();
    const recordingBuffer = await audioBlob.arrayBuffer();

    const recordingFile = await saveAudioRecording(
      this,
      recordingBuffer,
      baseFileName,
    );
    new Notice(`Scribe: ✅ Audio file saved ${recordingFile.name}`);

    return { recordingBuffer, recordingFile };
  }

  async handleScribeFile({
    audioRecordingFile,
    audioRecordingBuffer,
    scribeOptions,
  }: {
    audioRecordingFile: TFile;
    audioRecordingBuffer: ArrayBuffer;
    scribeOptions: ScribeOptions;
  }) {
    const {
      isAppendToActiveFile,
      isOnlyTranscribeActive,
      isSaveAudioFileActive,
      activeNoteTemplate,
    } = scribeOptions;
    const scribeNoteFilename = `${formatFilenamePrefix(
      this.settings.noteFilenamePrefix,
      this.settings.dateFilenameFormat,
    )}`;

    let note = isAppendToActiveFile
      ? (this.app.workspace.getActiveFile() as TFile)
      : await createNewNote(this, scribeNoteFilename);

    if (!note) {
      new Notice('Scribe: ⚠️ No active file to append to, creating new one!');
      note = (await createNewNote(this, scribeNoteFilename)) as TFile;

      const currentPath = this.app.workspace.getActiveFile()?.path ?? '';
      this.app.workspace.openLinkText(note?.path, currentPath, true);
    }

    if (isSaveAudioFileActive) {
      await setupFileFrontmatter(this, note, audioRecordingFile);
    } else {
      await setupFileFrontmatter(this, note);
    }

    await this.cleanup();

    if (!isAppendToActiveFile) {
      const currentPath = this.app.workspace.getActiveFile()?.path ?? '';
      this.app.workspace.openLinkText(note?.path, currentPath, true);
    }

    await appendTextToNote(this, note, '# Audio in progress');

    const transcript = await this.handleTranscription(
      audioRecordingBuffer,
      scribeOptions,
    );

    const inProgressHeaderToReplace = isAppendToActiveFile
      ? '# Audio in progress'
      : '\n# Audio in progress';

    const transcriptTextToAppendToNote = isSaveAudioFileActive
      ? `# Audio\n![[${audioRecordingFile.path}]]\n${transcript}`
      : `# Audio\n${transcript}`;
    await appendTextToNote(
      this,
      note,
      transcriptTextToAppendToNote,
      inProgressHeaderToReplace,
    );

    if (isOnlyTranscribeActive) {
      return;
    }

    const llmSummary = await this.handleTranscriptSummary(
      transcript,
      scribeOptions,
    );

    activeNoteTemplate.sections.forEach(async (section) => {
      const {
        sectionHeader,
        sectionOutputPrefix,
        sectionOutputPostfix,
        isSectionOptional,
      } = section;
      const sectionKey = convertToSafeJsonKey(sectionHeader);
      const sectionValue = llmSummary[sectionKey];

      if (isSectionOptional && !sectionValue) {
        return;
      }

      if (sectionOutputPrefix || sectionOutputPostfix) {
        const textToAppend = `## ${sectionHeader}\n${sectionOutputPrefix || ''}\n${sectionValue}\n${sectionOutputPostfix || ''}`;

        await appendTextToNote(this, note, textToAppend);

        return;
      }

      await appendTextToNote(
        this,
        note,
        `## ${sectionHeader}\n${sectionValue}`,
      );
    });

    const shouldRenameNote = !isAppendToActiveFile;
    if (shouldRenameNote && llmSummary.fileTitle) {
      const llmFileName = `${formatFilenamePrefix(
        this.settings.noteFilenamePrefix,
        this.settings.dateFilenameFormat,
      )}${normalizePath(llmSummary.fileTitle)}`;

      await renameFile(this, note, llmFileName);
    }
  }

  async handleTranscription(
    audioBuffer: ArrayBuffer,
    scribeOptions: ScribeOptions,
  ) {
    try {
      if (this.settings.isDisableLlmTranscription) {
        new Notice('Scribe: 🎧 Transcription is disabled in settings');
        return '';
      }

      new Notice('Scribe: 🎧 Beginning transcription with AssemblyAI');
      const transcript = await transcribeAudioWithAssemblyAi(
        this.settings.assemblyAiApiKey,
        audioBuffer,
        scribeOptions,
      );

      new Notice('Scribe: 🎧 Completed transcription with AssemblyAI');
      return transcript;
    } catch (error) {
      new Notice(
        `Scribe: 🎧 🛑 Something went wrong trying to transcribe with AssemblyAI
        ${error.toString()}`,
      );

      console.error;
      throw error;
    }
  }

  async handleTranscriptSummary(
    transcript: string,
    scribeOptions: ScribeOptions,
  ) {
    new Notice('Scribe: 🧠 Sending to Claude for summarization');

    const llmSummary = await summarizeTranscript(
      this.settings.anthropicApiKey,
      transcript,
      scribeOptions,
      this.settings.llmModel,
    );

    new Notice('Scribe: 🧠 Claude summarization complete');

    return llmSummary;
  }

  cleanup() {
    this.controlModal.close();

    if (this.state.audioRecord?.mediaRecorder?.state === 'recording') {
      this.state.audioRecord?.stopRecording();
    }

    this.state.audioRecord = null;
  }
}
