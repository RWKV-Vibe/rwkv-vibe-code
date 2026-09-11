import type { ResultUpdate } from '@/lib/chat-sync';

export interface GenerationStore {
  abortController: AbortController | null;
  updateBuffer: Map<number, ResultUpdate>;
  isGenerating: boolean;
}

const store: GenerationStore = {
  abortController: null,
  updateBuffer: new Map(),
  isGenerating: false,
};

export const getGenerationStore = (): GenerationStore => store;
