import type { ScribeOptions } from 'src';
import { SettingsItem } from 'src/settings/components/SettingsItem';
import { LLM_MODELS } from 'src/util/anthropicUtils';

export function ModalAiModelOptions({
  options,
  setOptions,
}: {
  options: ScribeOptions;
  setOptions: React.Dispatch<ScribeOptions>;
}) {
  const handleOptionsChange = (updatedOptions: Partial<ScribeOptions>) => {
    setOptions({
      ...options,
      ...updatedOptions,
    });
  };

  const { llmModel } = options;

  return (
    <div className="scribe-recording-options">
      <SettingsItem
        name="Claude model"
        description=""
        control={
          <select
            defaultValue={llmModel}
            className="dropdown"
            onChange={(e) => {
              handleOptionsChange({
                llmModel: e.target.value as LLM_MODELS,
              });
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
        name="Transcription"
        description=""
        control={<span>AssemblyAI</span>}
      />
    </div>
  );
}
