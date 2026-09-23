export interface AssistantCalculation {
  label: string;
  value: string;
  type?: 'highlight' | 'default' | 'success' | 'warning';
}

export interface AssistantChartDataPoint {
  name: string;
  value: number;
  secondaryValue?: number;
  highlight?: boolean;
  share?: string;
  [key: string]: any;
}

export interface AssistantChartConfig {
  type: 'bar' | 'pie' | 'line' | 'comparison';
  title: string;
  description?: string;
  data: AssistantChartDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  dataKey?: string;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  calculations?: AssistantCalculation[];
  chart?: AssistantChartConfig | null;
  missingDataNotice?: string | null;
  suggestedFollowUps?: string[];
}

export interface AssistantChatResponse {
  reply: string;
  calculations?: AssistantCalculation[];
  chart?: AssistantChartConfig | null;
  missingDataNotice?: string | null;
  suggestedFollowUps?: string[];
}

export const assistantService = {
  async sendMessage(
    message: string,
    importId?: string,
    conversationHistory?: { sender: 'user' | 'assistant'; text: string }[]
  ): Promise<AssistantChatResponse> {
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        importId,
        conversationHistory,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur lors de la communication avec l’Assistant IA');
    }

    return res.json();
  },
};
