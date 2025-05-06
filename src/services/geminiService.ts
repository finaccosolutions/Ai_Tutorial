// Add this interface and method to the existing geminiService class

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  type: 'multiple-choice' | 'coding';
  codeSnippet?: string;
}

async generateQuizQuestions(topic: string, level: string): Promise<QuizQuestion[]> {
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
    const response = await this.generateContent({ prompt });
    const questions = JSON.parse(response.text);
    return questions;
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    throw new Error('Failed to generate quiz questions');
  }
}

export default generateQuizQuestions