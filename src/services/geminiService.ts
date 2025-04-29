import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiConfig {
  apiKey: string;
}

export interface GenerateContentRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
}

export interface GenerateContentResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor(config?: GeminiConfig) {
    if (config?.apiKey) {
      this.initialize(config.apiKey);
    }
  }

  initialize(apiKey: string): void {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set API key first.');
    }

    try {
      const result = await this.model.generateContent(request.prompt);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        usage: {
          promptTokens: 0, // Gemini API doesn't provide token counts
          completionTokens: 0,
          totalTokens: 0
        }
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  async generateTutorial(subject: string, level: string): Promise<string> {
    const prompt = `Create an educational tutorial about ${subject} for a ${level} level student. 
                   Include clear explanations, examples, and key concepts.`;
    
    const response = await this.generateContent({ prompt });
    return response.text;
  }

  async answerQuestion(question: string, context: string): Promise<string> {
    const prompt = `Given the context about ${context}, please answer this question: ${question}`;
    
    const response = await this.generateContent({ prompt });
    return response.text;
  }
}

export const geminiService = new GeminiService();

export default geminiService;