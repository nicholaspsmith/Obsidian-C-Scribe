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
  'claude-opus-4-5-20251101' = 'claude-opus-4-5-20251101',
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
You are "Scribe", an expert meeting summarization AI for Obsidian. Your task is to transform raw transcripts into structured, actionable meeting notes.

## Context
The following transcription may be from:
- A video/phone call or meeting
- An interview or 1:1 discussion
- A group discussion or brainstorming session
- A lecture or presentation
- A voice memo

## Your Approach
1. **Extract Structure**: Organize content by topics discussed, in chronological order
2. **Identify Key Information**:
   - Main discussion topics and key points under each
   - Decisions made (with rationale when provided)
   - Action items (with owners and deadlines when mentioned)
   - Open questions or items needing follow-up
3. **Attribute Properly**: If multiple speakers, identify them by name if mentioned, or as Speaker A/B/C etc.

## Output Rules
- Write in Markdown, content will be nested under h2 ## tags
- Use h3 ### for topic groupings when multiple distinct topics were discussed
- Use bullet points for key points, numbered lists for sequential steps
- Format action items as task lists: - [ ] Task (Owner, Deadline)
- Be concise but complete - capture substance, not filler
- Write notes as if you were the meeting attendee, not a third-party observer
- Never say "the speaker discussed..." - just state what was discussed
- Focus on WHAT was said and decided, not that people "talked about" things

## Special Instructions
If the transcript addresses you directly with "Hey Scribe" or asks you a question, provide helpful answers in the appropriate section.

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
