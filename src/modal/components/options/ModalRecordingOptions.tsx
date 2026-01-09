import type { ScribeOptions } from 'src';
import { SettingsItem } from 'src/settings/components/SettingsItem';
import type { ScribeTemplate } from 'src/settings/components/NoteTemplateSettings';

export function ModalRecordingOptions({
  options,
  setOptions,
  noteTemplates,
}: {
  options: ScribeOptions;
  setOptions: React.Dispatch<ScribeOptions>;
  noteTemplates: ScribeTemplate[];
}) {
  const handleOptionsChange = (updatedOptions: Partial<ScribeOptions>) => {
    setOptions({
      ...options,
      ...updatedOptions,
    });
  };

  const {
    isAppendToActiveFile,
    isOnlyTranscribeActive,
    isSaveAudioFileActive,
    isMultiSpeakerEnabled,
    activeNoteTemplate,
  } = options;

  return (
    <div className="scribe-recording-options">
      <label>
        <input
          type="checkbox"
          checked={isAppendToActiveFile}
          onChange={(event) => {
            handleOptionsChange({
              isAppendToActiveFile: event.target.checked,
            });
          }}
        />
        Append to active file
      </label>

      <label>
        <input
          type="checkbox"
          checked={isOnlyTranscribeActive}
          onChange={(event) => {
            handleOptionsChange({
              isOnlyTranscribeActive: event.target.checked,
            });
          }}
        />
        Only transcribe recording
      </label>
      <label>
        <input
          type="checkbox"
          checked={isSaveAudioFileActive}
          onChange={(event) => {
            handleOptionsChange({
              isSaveAudioFileActive: event.target.checked,
            });
          }}
        />
        Save audio file
      </label>

      <label>
        <input
          type="checkbox"
          checked={isMultiSpeakerEnabled}
          onChange={(event) => {
            handleOptionsChange({
              isMultiSpeakerEnabled: event.target.checked,
            });
          }}
        />
        Multi-speaker enabled (AssemblyAI)
      </label>

      <SettingsItem
        name="Active template"
        description=""
        control={
          <select
            defaultValue={activeNoteTemplate.name}
            className="dropdown"
            onChange={(e) => {
              const selectedTemplate = noteTemplates.find(
                (template) => template.name === e.target.value,
              );
              handleOptionsChange({
                activeNoteTemplate: selectedTemplate,
              });
            }}
          >
            {noteTemplates.map((template) => (
              <option key={template.name} value={template.name}>
                {template.name}
              </option>
            ))}
          </select>
        }
      />
    </div>
  );
}
