import { GoogleGenerativeAI } from '@google/generative-ai';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  type: 'multiple-choice' | 'coding';
  codeSnippet?: string;
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  initialize(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required to initialize Gemini API');
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Update model configuration to use the correct version
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
      throw new Error('Failed to initialize Gemini API. Please check your API key and ensure the service is available.');
    }
  }

  async generateQuizQuestions(topic: string, level: string): Promise<QuizQuestion[]> {
    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set API key first.');
    }

    if (!topic || !level) {
      throw new Error('Topic and level are required to generate quiz questions.');
    }

    const prompt = `
      Create a quiz about ${topic} for a ${level} level student.
      
      Generate 5 questions with:
      1. Clear, specific questions
      2. 4 options per question (one correct)
      3. Detailed explanations for answers
      4. Mix of concept and application questions
      5. For programming topics, include at least one coding question
      
      Format as JSON array:
      [
        {
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Detailed explanation",
          "type": "multiple-choice",
          "codeSnippet": "Optional code for coding questions"
        }
      ]
      
      Ensure:
      - Questions test understanding, not just memorization
      - Clear, unambiguous wording
      - Plausible but distinct options
      - Helpful explanations that teach
      - Difficulty matches ${level} level
    `;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      
      const response = await result.response;
      const text = response.text();
      
      // Clean and parse the response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      
      try {
        const questions = JSON.parse(cleanedText);

        // Validate the response format
        if (!Array.isArray(questions)) {
          throw new Error('Invalid response format: not an array');
        }

        questions.forEach((q, i) => {
          if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
              typeof q.correctAnswer !== 'number' || !q.explanation) {
            throw new Error(`Invalid question format at index ${i}`);
          }
        });

        return questions;
      } catch (parseError) {
        console.error('Error parsing quiz questions:', parseError);
        throw new Error('Failed to parse quiz questions from API response');
      }
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
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      
      const response = await result.response;
      return response.text();
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