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
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  async generateTutorialContent(subject: string, level: string): Promise<string> {
    const prompt = `
      Create a detailed, conversational tutorial about ${subject} for a ${level} level student.
      Structure the content as if you're a friendly tutor speaking directly to the student.
      Include:
      - A warm introduction
      - Clear explanations of key concepts
      - Real-world examples
      - Interactive elements where you ask the student questions
      - Natural breaks where students might have questions
      
      Make the tone engaging and conversational, as this will be read aloud.
    `;
    
    const response = await this.generateContent({ prompt });
    return response.text;
  }

  async answerQuestion(question: string, context: string, level: string): Promise<string> {
    const prompt = `
      As a helpful tutor, answer this question about ${context} for a ${level} level student:
      "${question}"
      
      Provide a clear, conversational explanation that:
      - Directly addresses the question
      - Uses language appropriate for their level
      - Connects the answer back to the main topic
      - Encourages further learning
      
      Make the response sound natural and engaging, as it will be read aloud.
    `;
    
    const response = await this.generateContent({ prompt });
    return response.text;
  }

  async generateNextSection(currentContent: string, subject: string, level: string): Promise<string> {
    const prompt = `
      Continue the tutorial about ${subject} for a ${level} level student.
      Previous content: "${currentContent.slice(-500)}"
      
      Generate the next section that:
      - Flows naturally from the previous content
      - Introduces new but related concepts
      - Maintains the conversational teaching style
      - Includes interactive elements
      
      Keep the tone engaging and natural for voice delivery.
    `;
    
    const response = await this.generateContent({ prompt });
    return response.text;
  }
}

export const geminiService = new GeminiService();

export default geminiService;