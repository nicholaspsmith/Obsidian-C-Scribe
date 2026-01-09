import { SettingsInput } from './components/SettingsControl';
import { SettingsItemHeader } from './components/SettingsItem';
import useSettingsForm from './hooks/useSettingsForm';

/**
 * Tab, containing provider settings for AssemblyAI (transcription) and Anthropic (summarization)
 */
function ProviderSettingsTab() {
  const { register, settings } = useSettingsForm();

  return (
    <div>
      <SettingsItemHeader name="API keys" />
      <SettingsInput
        {...register('anthropicApiKey')}
        name="Anthropic API key"
        description="Used for Claude AI summarization - https://console.anthropic.com/settings/keys"
        placeholder="sk-ant-..."
      />
      <SettingsInput
        {...register('assemblyAiApiKey')}
        name="AssemblyAI API key"
        description="Used for audio transcription - https://www.assemblyai.com/app/account"
        placeholder="c3p0..."
      />
    </div>
  );
}

export default ProviderSettingsTab;
