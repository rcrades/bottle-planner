/**
 * Type declarations for @ai-sdk/openai
 */

declare module '@ai-sdk/openai' {
  /**
   * OpenAI provider instance that can be used to create language models
   */
  export const openai: OpenAIProvider;

  /**
   * Function to create a customized OpenAI provider instance
   */
  export function createOpenAI(options?: OpenAIOptions): OpenAIProvider;

  /**
   * OpenAI provider function type
   */
  interface OpenAIProvider {
    (modelId: string, options?: ModelOptions): any;
    chat: (modelId: string, options?: ChatModelOptions) => any;
    completion: (modelId: string, options?: CompletionModelOptions) => any;
    responses: (modelId: string, options?: ResponsesModelOptions) => any;
    tools: {
      webSearchPreview: (options?: WebSearchOptions) => any;
    };
  }

  /**
   * Options for the OpenAI provider
   */
  interface OpenAIOptions {
    baseURL?: string;
    apiKey?: string;
    name?: string;
    organization?: string;
    project?: string;
    headers?: Record<string, string>;
    fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    compatibility?: 'strict' | 'compatible';
  }

  /**
   * Options for a specific model
   */
  interface ModelOptions {
    logitBias?: Record<number, number>;
    user?: string;
  }

  /**
   * Chat model specific options
   */
  interface ChatModelOptions extends ModelOptions {
    logprobs?: boolean | number;
    parallelToolCalls?: boolean;
    useLegacyFunctionCalls?: boolean;
    structuredOutputs?: boolean;
    downloadImages?: boolean;
    simulateStreaming?: boolean;
    reasoningEffort?: 'low' | 'medium' | 'high';
  }

  /**
   * Completion model specific options
   */
  interface CompletionModelOptions extends ModelOptions {
    echo?: boolean;
    logprobs?: boolean | number;
    suffix?: string;
  }

  /**
   * Responses model specific options
   */
  interface ResponsesModelOptions extends ModelOptions {
    parallelToolCalls?: boolean;
    store?: boolean;
    metadata?: Record<string, string>;
    previousResponseId?: string;
    instructions?: string;
    reasoningEffort?: 'low' | 'medium' | 'high';
    strictSchemas?: boolean;
  }

  /**
   * Web search tool options
   */
  interface WebSearchOptions {
    searchContextSize?: 'high' | 'medium' | 'low';
    userLocation?: {
      type: 'approximate';
      city: string;
      region: string;
    };
  }
} 