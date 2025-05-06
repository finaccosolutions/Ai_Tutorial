import { GoogleGenerativeAI } from '@google/generative-ai';

interface QuizQuestion {
  question: string;
  type: 'multiple-choice' | 'fill-blank' | 'true-false' | 'short-answer';
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  codeSnippet?: string;
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private maxRetries = 3;
  private retryDelay = 1000;

  initialize(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required to initialize Gemini API');
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro-002",
        generationConfig: {
          temperature: 0.9, // Increased for more variety
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096, // Increased for longer responses
        },
      });
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
      throw new Error('Failed to initialize Gemini API. Please check your API key and ensure the service is available.');
    }
  }

  private async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt > this.maxRetries) {
        throw error;
      }
      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryWithExponentialBackoff(operation, attempt + 1);
    }
  }

  private sanitizeJsonResponse(text: string): string {
    // Remove code fences and any non-JSON content
    let cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    
    // Handle potential line breaks and indentation issues
    cleaned = cleaned.replace(/\n\s+/g, ' ');
    
    // Ensure proper quote usage
    cleaned = cleaned.replace(/[""]/g, '"');
    
    return cleaned;
  }

  async generateQuizQuestions(topic: string, level: string): Promise<QuizQuestion[]> {
    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set API key first.');
    }

    if (!topic || !level) {
      throw new Error('Topic and level are required to generate quiz questions.');
    }

    const prompt = `
      Create a comprehensive quiz about ${topic} for a ${level} level student.
      
      Generate exactly 20 unique and diverse questions with a mix of:
      - Multiple choice questions (40%)
      - Fill in the blank questions (20%)
      - True/False questions (20%)
      - Short answer questions (20%)
      
      For each question include:
      1. Clear, specific question text
      2. Question type (multiple-choice, fill-blank, true-false, or short-answer)
      3. For multiple choice: 4 options (one correct)
      4. Correct answer
      5. Detailed explanation
      6. Optional code snippet for programming topics
      
      Format as valid JSON array. Example:
      [
        {
          "question": "What is...",
          "type": "multiple-choice",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "0",
          "explanation": "Because..."
        }
      ]
      
      Ensure:
      - Questions test understanding, not just memorization
      - Clear, unambiguous wording
      - Mix of theoretical and practical questions
      - Helpful explanations that teach
      - Difficulty matches ${level} level
      - For fill-in-blank and short answer, ensure answers are specific
      - Each question is unique and tests different aspects
      - Questions are properly formatted as valid JSON
    `;

    try {
      return await this.retryWithExponentialBackoff(async () => {
        const result = await this.model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        
        const response = await result.response;
        const text = response.text();
        
        // Clean and parse the response
        const cleanedText = this.sanitizeJsonResponse(text);
        
        try {
          const questions = JSON.parse(cleanedText);

          // Validate the response format
          if (!Array.isArray(questions)) {
            throw new Error('Invalid response format: not an array');
          }

          // Validate each question
          questions.forEach((q, i) => {
            if (!q.question || !q.type || !q.correctAnswer || !q.explanation) {
              throw new Error(`Invalid question format at index ${i}`);
            }
            
            if (q.type === 'multiple-choice' && (!Array.isArray(q.options) || q.options.length !== 4)) {
              throw new Error(`Invalid options for multiple choice question at index ${i}`);
            }
          });

          // Shuffle questions
          return questions.sort(() => Math.random() - 0.5);
        } catch (parseError) {
          console.error('Error parsing quiz questions:', parseError);
          throw new Error('Failed to parse quiz questions. Please try again.');
        }
      });
    } catch (error: any) {
      console.error('Error generating quiz questions:', error);
      throw new Error(
        `Failed to generate quiz questions: ${error.message || 'Unknown error occurred'}`
      );
    }
  }

  async answerQuestion(
    question: string,
    subject: string,
    level: string = 'beginner',
    language: string = 'english'
  ): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set API key first.');
    }

    if (!question || !subject) {
      throw new Error('Question and subject are required.');
    }

    const prompt = `
      As a tutor teaching ${subject} to a ${level} level student in ${language}, 
      provide a clear and helpful answer to this question:

      ${question}

      Ensure the answer:
      1. Is appropriate for ${level} level understanding
      2. Includes examples where relevant
      3. Uses clear, simple language
      4. Explains concepts step by step
      5. Is provided in ${language}
    `;

    try {
      return await this.retryWithExponentialBackoff(async () => {
        const result = await this.model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        
        const response = await result.response;
        return response.text();
      });
    } catch (error: any) {
      console.error('Error generating answer:', error);
      throw new Error(
        `Failed to generate answer: ${error.message || 'Unknown error occurred'}`
      );
    }
  }
}

const geminiService = new GeminiService();
export default geminiService;