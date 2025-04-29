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

export interface TutorialSection {
  title: string;
  content: string;
  examples: string[];
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
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
      throw new Error('Failed to initialize Gemini API. Please check your API key.');
    }
  }

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set API key first.');
    }

    try {
      const result = await this.model.generateContent({
        contents: [{
          parts: [{ text: request.prompt }]
        }]
      });
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
      throw new Error('Failed to generate content. Please try again later.');
    }
  }

  async generateTopics(subject: string): Promise<string[]> {
    const prompt = `
      Generate a list of 6-8 main topics or concepts that are essential to understanding ${subject}.
      Format each topic as a clear, concise title (2-4 words).
      Return only the topic titles, one per line, without numbers or bullets.
      Example format:
      Variables and Types
      Control Structures
      Functions and Methods
    `;
    
    const response = await this.generateContent({ prompt });
    return response.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  async generateTutorialContent(subject: string, level: string): Promise<TutorialSection[]> {
    const prompt = `
      Create a structured tutorial about ${subject} for a ${level} level student.
      Format the response in clear sections, each with a title, main content, and examples.
      Make the content conversational, as if a teacher is speaking directly to the student.
      
      Structure each section like this:
      SECTION_TITLE: [Title]
      CONTENT: [Main explanation]
      EXAMPLES: [Practical example 1]
      EXAMPLES: [Practical example 2]
      END_SECTION
      
      Include 3-4 sections that build upon each other.
      Use clear, simple language appropriate for ${level} level.
      Focus on practical understanding and real-world applications.
    `;
    
    const response = await this.generateContent({ prompt });
    const sections = response.text.split('END_SECTION')
      .map(section => section.trim())
      .filter(section => section.length > 0)
      .map(section => {
        const titleMatch = section.match(/SECTION_TITLE:\s*(.+)/);
        const contentMatch = section.match(/CONTENT:\s*(.+)/s);
        const examplesMatches = section.matchAll(/EXAMPLES:\s*(.+)/g);
        
        return {
          title: titleMatch?.[1]?.trim() || '',
          content: contentMatch?.[1]?.trim() || '',
          examples: Array.from(examplesMatches, m => m[1]?.trim() || '')
        };
      });
    
    return sections;
  }

  async answerQuestion(question: string, context: string, level: string): Promise<string> {
    if (!question || !context || !level) {
      throw new Error('Missing required parameters for answering question');
    }

    const prompt = `
      As a helpful tutor, answer this question about ${context} for a ${level} level student:
      "${question}"
      
      Format your response in a clear, structured way:
      1. Direct answer to the question
      2. Brief explanation with an example
      3. Connection to the main topic
      
      Use natural, conversational language as if speaking to the student.
    `;
    
    const response = await this.generateContent({ prompt });
    return response.text;
  }
}

export const geminiService = new GeminiService();

export default geminiService;