import { useState } from 'react';
import type ScribePlugin from 'src';
import { LLM_MODELS } from 'src/util/anthropicUtils';
import { SettingsItem } from './SettingsItem';

export const AiModelSettings: React.FC<{
  plugin: ScribePlugin;
  saveSettings: () => void;
}> = ({ plugin, saveSettings }) => {
  const [llmModel, setLlmModel] = useState<LLM_MODELS>(
    plugin.settings.llmModel,
  );
  const [isMultiSpeakerEnabled, setIsMultiSpeakerEnabled] = useState(
    plugin.settings.isMultiSpeakerEnabled,
  );
  const [isDisableLlmTranscription, setIsDisableLlmTranscription] = useState(
    plugin.settings.isDisableLlmTranscription,
  );

  const handleToggleMultiSpeaker = () => {
    const value = !isMultiSpeakerEnabled;
    setIsMultiSpeakerEnabled(value);
    plugin.settings.isMultiSpeakerEnabled = value;
    saveSettings();
  };

  const handleToggleDisableLlmTranscription = () => {
    const value = !isDisableLlmTranscription;
    setIsDisableLlmTranscription(value);
    plugin.settings.isDisableLlmTranscription = value;
    saveSettings();
  };

  return (
    <div>
      <h2>AI model options</h2>

      <SettingsItem
        name="Transcription service"
        description="Audio is transcribed using AssemblyAI"
        control={<span className="setting-item-description">AssemblyAI</span>}
      />

      <SettingsItem
        name="Multi-speaker enabled"
        description="Enable this if you have multiple speakers in your recording (AssemblyAI feature)"
        control={
          <div
            className={`checkbox-container ${isMultiSpeakerEnabled ? 'is-enabled' : ''}`}
            onClick={(e) => {
              handleToggleMultiSpeaker();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleToggleMultiSpeaker();
              }
            }}
          >
            <input
              type="checkbox"
              checked={isMultiSpeakerEnabled}
              onChange={handleToggleMultiSpeaker}
            />
          </div>
        }
      />

      <SettingsItem
        name="Claude model for summarization"
        description="The transcript is sent to Claude for note generation"
        control={
          <select
            defaultValue={llmModel}
            className="dropdown"
            onChange={(e) => {
              const value = e.target.value as LLM_MODELS;
              setLlmModel(value);
              plugin.settings.llmModel = value;
              saveSettings();
            }}
          >
            {Object.keys(LLM_MODELS).map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        }
      />

      <SettingsItem
        name="Disable LLM summarization"
        description="Only transcribe audio without generating notes"
        control={
          <div
            className={`checkbox-container ${isDisableLlmTranscription ? 'is-enabled' : ''}`}
            onClick={(e) => {
              handleToggleDisableLlmTranscription();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleToggleDisableLlmTranscription();
              }
            }}
          >
            <input
              type="checkbox"
              checked={isDisableLlmTranscription}
              onChange={handleToggleDisableLlmTranscription}
            />
          </div>
        }
      />
    </div>
  );
};
