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

export interface Topic {
  id: string;
  title: string;
  description: string;
}

export interface TutorialSection {
  title: string;
  content: string;
  examples: string[];
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_DELAY = 1000; // 1 second

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

  private async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (
        retryCount >= this.MAX_RETRIES ||
        (error?.message && !error.message.includes('503'))
      ) {
        throw error;
      }

      const delay = this.INITIAL_DELAY * Math.pow(2, retryCount);
      console.log(`Retrying after ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryWithExponentialBackoff(operation, retryCount + 1);
    }
  }

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set API key first.');
    }

    try {
      const result = await this.retryWithExponentialBackoff(async () => {
        const response = await this.model.generateContent({
          contents: [{
            parts: [{ text: request.prompt }]
          }]
        });
        return response;
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
      throw new Error(
        'Failed to generate content after multiple attempts. The service might be temporarily unavailable. Please try again later.'
      );
    }
  }

  async generateTopicsList(subject: string): Promise<Topic[]> {
    const prompt = `
      Create a structured learning path for ${subject} with 6-8 topics.
      For each topic, provide:
      1. A clear, concise title
      2. A brief description of what will be covered
      3. A unique ID

      Format the response as:
      TOPIC
      ID: [unique_id]
      TITLE: [topic_title]
      DESCRIPTION: [brief_description]
      END_TOPIC

      Start with fundamentals and progress to more advanced concepts.
      Make each topic self-contained but build upon previous knowledge.
    `;
    
    const response = await this.generateContent({ prompt });
    
    return response.text
      .split('END_TOPIC')
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0)
      .map(topic => {
        const idMatch = topic.match(/ID:\s*(.+)/);
        const titleMatch = topic.match(/TITLE:\s*(.+)/);
        const descMatch = topic.match(/DESCRIPTION:\s*(.+)/);
        
        return {
          id: idMatch?.[1]?.trim() || `topic_${Date.now()}`,
          title: titleMatch?.[1]?.trim() || 'Untitled Topic',
          description: descMatch?.[1]?.trim() || 'No description available'
        };
      });
  }

  async generateTutorialContent(topicId: string, subject: string, level: string): Promise<TutorialSection[]> {
    const prompt = `
      Create a video tutorial script for the topic "${topicId}" in ${subject} for a ${level} level student.
      Format the content in clear sections, each with:
      1. A title
      2. Main content (written in a conversational style)
      3. Practical examples
      
      Structure each section like this:
      SECTION_TITLE: [Title]
      CONTENT: [Main explanation in conversational style]
      EXAMPLES: [Practical example 1]
      EXAMPLES: [Practical example 2]
      END_SECTION
      
      Include 3-4 sections that build upon each other.
      Make the content engaging and suitable for video presentation.
    `;
    
    const response = await this.generateContent({ prompt });
    
    return response.text
      .split('END_SECTION')
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

const geminiService = new GeminiService();
export default geminiService;