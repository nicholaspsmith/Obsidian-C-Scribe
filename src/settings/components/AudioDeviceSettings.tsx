import { useEffect, useState } from 'react';
import useSettingsForm from '../hooks/useSettingsForm';
import { SettingsSelect, SettingsToggle } from './SettingsControl';

interface AudioDevice {
  deviceId: string;
  label: string;
}

/**
 * Settings input for selecting audio devices
 */
function AudioDeviceSettings() {
  const { register } = useSettingsForm();
  const [isLoading, setIsLoading] = useState(true);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);

  const valuesMapping = [
    { displayName: 'Default (System)', value: '' },
    ...audioDevices.map((device) => ({
      displayName: device.label,
      value: device.deviceId,
    })),
  ];

  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        // Request permission to access media devices
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());

        // Get list of audio input devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices
          .filter((device) => device.kind === 'audioinput')
          .map((device) => ({
            deviceId: device.deviceId,
            label:
              device.label || `Microphone (${device.deviceId.slice(0, 8)}...)`,
          }));

        setAudioDevices(audioInputDevices);
      } catch (error) {
        console.error('Error getting audio devices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getAudioDevices();
  }, []);

  return isLoading ? (
    <div>Loading devices...</div>
  ) : (
    <>
      <SettingsSelect
        {...register('selectedAudioDeviceId')}
        name="Audio Input Device"
        description="Select which microphone to use for recording"
        valuesMapping={valuesMapping}
      />
      <SettingsToggle
        {...register('enableMultiChannelMix')}
        name="Multi-Channel Mix (System Audio)"
        description="Mix channels 1-2 (mic) with channels 3-4 (monitor/system audio). Enable this when using an audio interface with virtual channels to capture both your mic and system audio together."
      />
    </>
  );
}

export default AudioDeviceSettings;
