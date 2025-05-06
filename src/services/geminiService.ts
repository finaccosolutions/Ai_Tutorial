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
  learningObjectives: string[];
  prerequisites: string[];
  estimatedDuration: number;
  difficulty: string;
}

export interface TutorialSection {
  title: string;
  content: string;
  examples: string[];
  practiceExercises: string[];
  keyTakeaways: string[];
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_DELAY = 1000;

  constructor(config?: GeminiConfig) {
    if (config?.apiKey) {
      this.initialize(config.apiKey);
    }
  }

  setApiKey(apiKey: string): void {
    this.initialize(apiKey);
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

  async generateTopicsList(
    subject: string,
    level: string,
    language: string,
    learningGoals: string[]
  ): Promise<Topic[]> {
    const prompt = `
      Create a comprehensive learning path for ${subject} with 6-8 detailed topics.
      Target audience: ${level} level students
      Language: ${language}
      Learning goals: ${learningGoals.join(', ')}

      For each topic, provide:
      1. A unique ID
      2. A clear, descriptive title
      3. A detailed description covering key concepts and importance
      4. 3-5 specific learning objectives
      5. Any prerequisites or required knowledge
      6. Estimated duration in minutes
      7. Difficulty rating (Beginner/Intermediate/Advanced)

      Format each topic as:
      TOPIC
      ID: [unique_id]
      TITLE: [topic_title]
      DESCRIPTION: [comprehensive_description]
      OBJECTIVES: [objective1],[objective2],[objective3]
      PREREQUISITES: [prerequisite1],[prerequisite2]
      DURATION: [minutes]
      DIFFICULTY: [level]
      END_TOPIC

      Ensure:
      - Topics progress logically from fundamentals to advanced concepts
      - Content aligns with specified learning goals
      - Language and complexity match the student's level
      - Each topic builds upon previous knowledge
      - Examples and applications are relevant to the subject
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
        const objectivesMatch = topic.match(/OBJECTIVES:\s*(.+)/);
        const prerequisitesMatch = topic.match(/PREREQUISITES:\s*(.+)/);
        const durationMatch = topic.match(/DURATION:\s*(\d+)/);
        const difficultyMatch = topic.match(/DIFFICULTY:\s*(.+)/);
        
        return {
          id: idMatch?.[1]?.trim() || `topic_${Date.now()}`,
          title: titleMatch?.[1]?.trim() || 'Untitled Topic',
          description: descMatch?.[1]?.trim() || 'No description available',
          learningObjectives: objectivesMatch?.[1]?.split(',').map(obj => obj.trim()) || [],
          prerequisites: prerequisitesMatch?.[1]?.split(',').map(pre => pre.trim()) || [],
          estimatedDuration: parseInt(durationMatch?.[1] || '60', 10),
          difficulty: difficultyMatch?.[1]?.trim() || level
        };
      });
  }

  async generateTutorialContent(
    topicId: string,
    subject: string,
    level: string,
    language: string,
    learningGoals: string[]
  ): Promise<TutorialSection[]> {
    const prompt = `
      Create a detailed interactive tutorial for topic "${topicId}" in ${subject}.
      
      Context:
      - Student level: ${level}
      - Language: ${language}
      - Learning goals: ${learningGoals.join(', ')}
      
      For each section, provide:
      1. Clear title
      2. Comprehensive explanation in conversational style
      3. Real-world examples and applications
      4. Practice exercises or activities
      5. Key takeaways or summary points
      
      Format each section as:
      SECTION
      TITLE: [section_title]
      CONTENT: [detailed_explanation]
      EXAMPLES: [example1]
      EXAMPLES: [example2]
      PRACTICE: [exercise1]
      PRACTICE: [exercise2]
      TAKEAWAYS: [key_point1],[key_point2],[key_point3]
      END_SECTION
      
      Requirements:
      - Content must be in ${language}
      - Explanations appropriate for ${level} level
      - Examples relevant to the subject and level
      - Progressive difficulty within sections
      - Clear connections to learning goals
      - Interactive elements for engagement
      - Practical applications emphasized
    `;
    
    const response = await this.generateContent({ prompt });
    
    return response.text
      .split('END_SECTION')
      .map(section => section.trim())
      .filter(section => section.length > 0)
      .map(section => {
        const titleMatch = section.match(/TITLE:\s*(.+)/);
        const contentMatch = section.match(/CONTENT:\s*(.+?)(?=EXAMPLES:|PRACTICE:|TAKEAWAYS:|$)/s);
        const examplesMatches = Array.from(section.matchAll(/EXAMPLES:\s*(.+)/g));
        const practiceMatches = Array.from(section.matchAll(/PRACTICE:\s*(.+)/g));
        const takeawaysMatch = section.match(/TAKEAWAYS:\s*(.+)/);
        
        return {
          title: titleMatch?.[1]?.trim() || '',
          content: contentMatch?.[1]?.trim() || '',
          examples: examplesMatches.map(m => m[1]?.trim() || ''),
          practiceExercises: practiceMatches.map(m => m[1]?.trim() || ''),
          keyTakeaways: takeawaysMatch?.[1]?.split(',').map(point => point.trim()) || []
        };
      });
  }

  async answerQuestion(
    question: string,
    context: string,
    level: string,
    language: string
  ): Promise<string> {
    if (!question || !context || !level) {
      throw new Error('Missing required parameters for answering question');
    }

    const prompt = `
      As a knowledgeable tutor, provide a detailed answer to this question about ${context}
      for a ${level} level student in ${language}:
      
      Question: "${question}"
      
      Requirements:
      1. Clear, structured explanation
      2. Relevant examples and applications
      3. Visual descriptions or analogies when helpful
      4. Connection to broader ${context} concepts
      5. Verification questions to check understanding
      
      Format:
      1. Direct answer
      2. Detailed explanation
      3. Examples/Applications
      4. Check for understanding
      5. Related concepts
      
      Ensure:
      - Language level matches ${level} understanding
      - Examples are relevant to ${context}
      - Response is in ${language}
      - Explanation builds on fundamental concepts
      - Answer encourages further learning
    `;
    
    const response = await this.generateContent({ prompt });
    return response.text;
  }
}

export const geminiService = new GeminiService();
export default geminiService;