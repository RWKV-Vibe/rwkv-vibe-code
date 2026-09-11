export interface GeneratedResult {
  id: string;
  content: string;
  htmlCode: string;
  isLoading: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
