/**
 * This was heavily inspired by
 * https://github.com/drewmcdonald/obsidian-magic-mic
 * Thank you for traversing this in such a clean way
 */
import { Notice } from 'obsidian';

import {
  mimeTypeToFileExtension,
  pickMimeType,
  type SupportedMimeType,
} from 'src/util/mimeType';

export class AudioRecord {
  mediaRecorder: MediaRecorder | null;
  data: BlobPart[] = [];
  fileExtension: string;
  startTime: number | null = null;
  chosenFormat: string;
  chosenMimeType: SupportedMimeType;

  // Web Audio API nodes for multi-channel mixing
  private audioContext: AudioContext | null = null;
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;

  // We always record in WebM format because it's widely supported
  private defaultMimeType: SupportedMimeType = pickMimeType(
    'audio/webm; codecs=opus',
  );
  private bitRate = 32000;

  constructor() {
    this.chosenMimeType = pickMimeType(this.defaultMimeType);
    this.chosenFormat = mimeTypeToFileExtension(this.chosenMimeType);
    this.fileExtension = this.chosenFormat;
  }

  async startRecording(deviceId?: string, enableMultiChannelMix = false) {
    const buildConstraints = (
      specificDeviceId?: string,
    ): MediaTrackConstraints => {
      const constraints: MediaTrackConstraints =
        specificDeviceId && specificDeviceId !== ''
          ? { deviceId: { exact: specificDeviceId } }
          : {};

      if (enableMultiChannelMix) {
        // Request up to 4 channels to capture mic (1-2) + monitor/system audio (3-4)
        constraints.channelCount = { ideal: 4, min: 2 };
      }

      return constraints;
    };

    const startWithStream = (stream: MediaStream) => {
      let recordingStream = stream;

      if (enableMultiChannelMix) {
        // Use Web Audio API to mix multiple channels
        recordingStream = this.createMultiChannelMixedStream(stream);
      }

      this.mediaRecorder = this.setupMediaRecorder(recordingStream);
      this.mediaRecorder.start();
      this.startTime = Date.now();
    };

    try {
      // First, try with the specified device
      const constraints = buildConstraints(deviceId);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: constraints,
      });
      startWithStream(stream);
    } catch (err) {
      const error = err as Error;
      console.error('Error accessing microphone with specified device:', error);

      // If a specific device was requested and failed, try falling back to default
      if (deviceId && deviceId !== '') {
        console.log('Scribe: Falling back to default microphone...');
        try {
          const fallbackConstraints = buildConstraints();
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            audio: fallbackConstraints,
          });
          new Notice(
            'Scribe: Selected microphone unavailable, using default instead',
          );
          startWithStream(fallbackStream);
          return;
        } catch (fallbackErr) {
          console.error('Error accessing default microphone:', fallbackErr);
        }
      }

      // Provide specific error messages based on error type
      if (error.name === 'NotAllowedError') {
        new Notice(
          'Scribe: Microphone permission denied. Check System Settings → Privacy → Microphone',
        );
      } else if (error.name === 'NotFoundError') {
        new Notice('Scribe: No microphone found. Please connect a microphone.');
      } else if (error.name === 'NotReadableError') {
        new Notice(
          'Scribe: Microphone is in use by another application. Close other apps using the mic.',
        );
      } else {
        new Notice(`Scribe: Failed to access microphone: ${error.message}`);
      }
    }
  }

  /**
   * Creates a mixed stereo stream from multi-channel input.
   * Combines channels 1-2 (typically mic) with channels 3-4 (typically monitor/system audio).
   */
  private createMultiChannelMixedStream(inputStream: MediaStream): MediaStream {
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(inputStream);
    const inputChannelCount = source.channelCount;

    console.log(`Scribe: Input stream has ${inputChannelCount} channels`);

    // If we only got 2 channels, just return the original stream
    if (inputChannelCount <= 2) {
      console.log(
        'Scribe: Only 2 channels available, using original stream',
      );
      return inputStream;
    }

    // Create a channel splitter to access individual channels
    const splitter = this.audioContext.createChannelSplitter(inputChannelCount);
    source.connect(splitter);

    // Create a channel merger for stereo output
    const merger = this.audioContext.createChannelMerger(2);

    // Create gain nodes to control mix levels
    const micGainL = this.audioContext.createGain();
    const micGainR = this.audioContext.createGain();
    const monitorGainL = this.audioContext.createGain();
    const monitorGainR = this.audioContext.createGain();

    // Set gain levels (can be adjusted)
    micGainL.gain.value = 1.0;
    micGainR.gain.value = 1.0;
    monitorGainL.gain.value = 1.0;
    monitorGainR.gain.value = 1.0;

    // Connect mic channels (0, 1) to gains
    splitter.connect(micGainL, 0); // Channel 1 (mic L or mono mic)
    splitter.connect(micGainR, 1); // Channel 2 (mic R, or duplicate of mono)

    // Connect monitor channels (2, 3) to gains if available
    if (inputChannelCount >= 4) {
      splitter.connect(monitorGainL, 2); // Channel 3 (monitor L / system audio L)
      splitter.connect(monitorGainR, 3); // Channel 4 (monitor R / system audio R)
    }

    // Mix both sources to the merger
    // Left output (merger input 0)
    micGainL.connect(merger, 0, 0);
    monitorGainL.connect(merger, 0, 0);

    // Right output (merger input 1)
    micGainR.connect(merger, 0, 1);
    monitorGainR.connect(merger, 0, 1);

    // Create destination for the mixed stream
    this.mediaStreamDestination =
      this.audioContext.createMediaStreamDestination();
    merger.connect(this.mediaStreamDestination);

    console.log('Scribe: Multi-channel mix created successfully');
    return this.mediaStreamDestination.stream;
  }

  async handlePauseResume() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.error(
        'There is no mediaRecorder, cannot resume handlePauseResume',
      );
      throw new Error('There is no mediaRecorder, cannot handlePauseResume');
    }

    if (this.mediaRecorder.state === 'paused') {
      this.resumeRecording();
    } else if (this.mediaRecorder.state === 'recording') {
      this.pauseRecording();
    }
  }

  async resumeRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.error('There is no mediaRecorder, cannot resume resumeRecording');
      throw new Error('There is no mediaRecorder, cannot resumeRecording');
    }
    this.mediaRecorder?.resume();
  }

  async pauseRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.error('There is no mediaRecorder, cannot pauseRecording');
      throw new Error('There is no mediaRecorder, cannot pauseRecording');
    }
    this.mediaRecorder?.pause();
  }

  stopRecording() {
    return new Promise<Blob>((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        const err = new Error(
          'There is no mediaRecorder, cannot stopRecording',
        );
        console.error(err.message);
        reject(err);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          this.mediaRecorder?.stream.getTracks().forEach((track) => {
            track.stop();
          });

          // Clean up Web Audio API resources
          if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
            this.mediaStreamDestination = null;
          }

          if (this.data.length === 0) {
            throw new Error('No audio data recorded.');
          }

          const blob = new Blob(this.data, { type: this.chosenMimeType });
          console.log('Scribe: Recording stopped, audio Blob created', blob);

          this.mediaRecorder = null;
          this.startTime = null;

          resolve(blob);
        } catch (err) {
          console.error('Error during recording stop:', err);
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  private setupMediaRecorder(stream: MediaStream) {
    const rec = new MediaRecorder(stream, {
      mimeType: this.chosenMimeType,
      audioBitsPerSecond: this.bitRate,
    });
    rec.ondataavailable = (e) => {
      this.data.push(e.data);
    };

    return rec;
  }
}
