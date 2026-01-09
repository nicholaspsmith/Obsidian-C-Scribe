/**
 * Anthropic/Claude utilities for text summarization
 * Transcription is handled by AssemblyAI
 */
import { ChatAnthropic } from '@langchain/anthropic';
import { z } from 'zod';
import { SystemMessage } from '@langchain/core/messages';

import type { ScribeOptions } from 'src';
import { convertToSafeJsonKey } from './textUtil';

export enum LLM_MODELS {
  'claude-sonnet-4-20250514' = 'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219' = 'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022' = 'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022' = 'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307' = 'claude-3-haiku-20240307',
}

export async function summarizeTranscript(
  anthropicApiKey: string,
  transcript: string,
  { scribeOutputLanguage, activeNoteTemplate }: ScribeOptions,
  llmModel: LLM_MODELS = LLM_MODELS['claude-sonnet-4-20250514'],
) {
  const systemPrompt = `
  You are "Scribe" an expert note-making AI for Obsidian you specialize in the Linking Your Thinking (LYK) strategy.
  The following is the transcription generated from a recording of someone talking aloud or multiple people in a conversation.
  There may be a lot of random things said given fluidity of conversation or thought process and the microphone's ability to pick up all audio.

  The transcription may address you by calling you "Scribe" or saying "Hey Scribe" and asking you a question, they also may just allude to you by asking "you" to do something.
  Give them the answers to this question

  Give me notes in Markdown language on what was said, they should be
  - Easy to understand
  - Succinct
  - Clean
  - Logical
  - Insightful

  It will be nested under a h2 # tag, feel free to nest headers underneath it
  Rules:
  - Do not include escaped new line characters
  - Do not mention "the speaker" anywhere in your response.
  - The notes should be written as if I were writing them.

  The following is the transcribed audio:
  <transcript>
  ${transcript}
  </transcript>
  `;

  const model = new ChatAnthropic({
    model: llmModel,
    apiKey: anthropicApiKey,
    temperature: 0.5,
  });
  const messages = [new SystemMessage(systemPrompt)];

  if (scribeOutputLanguage) {
    messages.push(
      new SystemMessage(`Please respond in ${scribeOutputLanguage} language`),
    );
  }

  // Build schema dynamically for the template sections
  const schemaShape: Record<string, z.ZodTypeAny> = {
    fileTitle: z
      .string()
      .describe(
        'A suggested title for the Obsidian Note. Ensure that it is in the proper format for a file on mac, windows and linux, do not include any special characters',
      ),
  };

  activeNoteTemplate.sections.forEach((section) => {
    const { sectionHeader, sectionInstructions, isSectionOptional } = section;
    schemaShape[convertToSafeJsonKey(sectionHeader)] = isSectionOptional
      ? z.string().nullable().describe(sectionInstructions)
      : z.string().describe(sectionInstructions);
  });

  const structuredOutput = z.object(schemaShape);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structuredLlm = model.withStructuredOutput(structuredOutput as any);
  const result = (await structuredLlm.invoke(messages)) as Record<
    string,
    string
  > & { fileTitle: string };

  return result;
}

export async function llmFixMermaidChart(
  anthropicApiKey: string,
  brokenMermaidChart: string,
  llmModel: LLM_MODELS = LLM_MODELS['claude-sonnet-4-20250514'],
) {
  const systemPrompt = `
You are an expert in mermaid charts and Obsidian (the note taking app)
Below is a <broken-mermaid-chart> that isn't rendering correctly in Obsidian
There may be some new line characters, or tab characters, or special characters.
Strip them out and only return a fully valid unicode Mermaid chart that will render properly in Obsidian
Remove any special characters in the nodes text that isn't valid.

<broken-mermaid-chart>
${brokenMermaidChart}
</broken-mermaid-chart>

Thank you
  `;

  const model = new ChatAnthropic({
    model: llmModel,
    apiKey: anthropicApiKey,
    temperature: 0.3,
  });
  const messages = [new SystemMessage(systemPrompt)];
  const mermaidSchema = z.object({
    mermaidChart: z.string().describe('A fully valid unicode mermaid chart'),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structuredLlm = model.withStructuredOutput(mermaidSchema as any);
  const response = await structuredLlm.invoke(messages);
  const { mermaidChart } = response as { mermaidChart: string };

  return { mermaidChart };
}
