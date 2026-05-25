import { Message, ApiUsage, ChatResponse, MemoryEntry, ProjectFile, AVAILABLE_MODELS } from '@/types';
import { getSettings, getProjectMemories, getProjectFiles, addMessage, recordApiUsage } from './storage';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildMemoryContext(memories: MemoryEntry[]): string {
  if (memories.length === 0) return '';

  let context = '\n\n## Project Memory & Notes:\n\n';
  for (const memory of memories) {
    context += `### ${memory.title}\n${memory.content}\n\n`;
  }
  return context;
}

function buildFilesContext(files: ProjectFile[]): string {
  const enabledFiles = files.filter(f => f.enabled);
  if (enabledFiles.length === 0) return '';

  let context = '\n\n## Project Files / Reference Material:\n\n';
  for (const file of enabledFiles) {
    context += `### ${file.name}\n${file.content}\n\n`;
  }
  return context;
}

async function buildMessages(
  projectId: string,
  userMessage: string,
  systemPrompt: string,
  context?: string
): Promise<OpenRouterMessage[]> {
  const messages: OpenRouterMessage[] = [];

  // Get memory entries
  const memories = await getProjectMemories(projectId);
  const memoryContext = buildMemoryContext(memories);

  // Build full system prompt with memory
  let fullSystemPrompt = systemPrompt;
  if (memoryContext) {
    fullSystemPrompt += memoryContext;
  }
  if (context) {
    fullSystemPrompt += '\n\n' + context;
  }

  if (fullSystemPrompt.trim()) {
    messages.push({ role: 'system', content: fullSystemPrompt.trim() });
  }

  // Add the current user message
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

export async function sendMessage(
  projectId: string,
  userMessage: string,
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: string
): Promise<ChatResponse> {
  const settings = await getSettings();

  if (!settings.openRouterApiKey) {
    throw new ApiError('API key not configured. Please add your OpenRouter API key in Settings.', 'NO_API_KEY');
  }

  // Build messages array
  const messages: OpenRouterMessage[] = [];

  // Get memory entries and project files
  const memories = await getProjectMemories(projectId);
  const memoryContext = buildMemoryContext(memories);

  const projectFiles = await getProjectFiles(projectId);
  const filesContext = buildFilesContext(projectFiles);

  // Build full system prompt with memory and files
  let fullSystemPrompt = systemPrompt;
  if (memoryContext) {
    fullSystemPrompt += memoryContext;
  }
  if (filesContext) {
    fullSystemPrompt += filesContext;
  }
  if (context) {
    fullSystemPrompt += '\n\n' + context;
  }

  if (fullSystemPrompt.trim()) {
    messages.push({ role: 'system', content: fullSystemPrompt.trim() });
  }

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add the current user message
  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://creative-writer.app',
        'X-Title': 'Creative Writing Assistant',
      },
      body: JSON.stringify({
        model: settings.selectedModel,
        messages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API error: ${response.status}`;

      if (response.status === 401) {
        throw new ApiError('Invalid API key. Please check your OpenRouter API key.', 'INVALID_API_KEY', 401);
      }
      if (response.status === 429) {
        throw new ApiError('Rate limit exceeded. Please wait a moment and try again.', 'RATE_LIMIT', 429);
      }
      if (response.status === 402) {
        throw new ApiError('Insufficient credits. Please add credits to your OpenRouter account.', 'INSUFFICIENT_CREDITS', 402);
      }

      throw new ApiError(errorMessage, 'API_ERROR', response.status);
    }

    const data: OpenRouterResponse = await response.json();

    const assistantContent = data.choices[0]?.message?.content || '';
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const totalTokens = data.usage?.total_tokens || 0;

    // Build usage object
    const usage: ApiUsage = {
      promptTokens,
      completionTokens,
      totalTokens,
      cost: undefined,
    };

    // Estimate cost
    const model = AVAILABLE_MODELS.find(m => m.id === settings.selectedModel);
    if (model) {
      const { estimateCost } = require('@/utils/helpers');
      usage.cost = estimateCost(promptTokens, completionTokens, settings.selectedModel);
    }

    // Calculate total if we have both components
    if (data.usage && !data.usage.total_tokens) {
      usage.totalTokens = promptTokens + completionTokens;
    }

    // Record usage
    await recordApiUsage(usage);

    // Save messages to storage
    const savedUserMessage = await addMessage({
      projectId,
      role: 'user',
      content: userMessage,
      tokens: promptTokens,
    });

    const savedAssistantMessage = await addMessage({
      projectId,
      role: 'assistant',
      content: assistantContent,
      tokens: completionTokens,
    });

    return {
      message: savedAssistantMessage,
      usage,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new ApiError(`Network error: ${errorMessage}. Please check your connection.`, 'NETWORK_ERROR');
  }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://creative-writer.app',
        'X-Title': 'Creative Writing Assistant',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });

    return response.ok || response.status === 429; // 429 means key is valid but rate limited
  } catch {
    return false;
  }
}
