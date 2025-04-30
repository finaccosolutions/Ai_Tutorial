import { GoogleGenerativeAI } from '@google/generative-ai';
import { speak, stopSpeaking } from './voiceService';

export interface Slide {
  id: string;
  content: string;
  narration: string;
  duration: number;
}

export interface SlidePresentation {
  id: string;
  title: string;
  slides: Slide[];
  totalDuration: number;
}

class SlideService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  initialize(apiKey: string): void {
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
      throw new Error('Failed to initialize Gemini API. Please check your API key.');
    }
  }

  async generateSlidePresentation(topic: string, level: string): Promise<SlidePresentation> {
    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set API key first.');
    }

    const prompt = `
      Create an educational presentation about "${topic}" for ${level} level students.
      Format as JSON with the following structure:
      {
        "title": "Presentation title",
        "slides": [
          {
            "id": "unique_id",
            "content": "Slide content in markdown format",
            "narration": "Natural speaking script for this slide",
            "duration": estimated_duration_in_seconds
          }
        ]
      }
      
      Guidelines:
      - Include 5-7 slides
      - Start with an introduction
      - Each slide should focus on one key concept
      - Use clear, concise language
      - Include examples where appropriate
      - End with a summary
      - Keep narration conversational and engaging
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      const presentation = JSON.parse(text);
      
      // Calculate total duration
      const totalDuration = presentation.slides.reduce(
        (total: number, slide: Slide) => total + slide.duration,
        0
      );

      return {
        ...presentation,
        totalDuration
      };
    } catch (error) {
      console.error('Error generating presentation:', error);
      throw new Error('Failed to generate presentation. Please try again.');
    }
  }

  startPresentation(presentation: SlidePresentation, onSlideChange: (slideIndex: number) => void) {
    let currentSlideIndex = 0;
    
    const playSlide = async (index: number) => {
      if (index >= presentation.slides.length) {
        return;
      }
      
      const slide = presentation.slides[index];
      onSlideChange(index);
      
      // Start narration
      speak(slide.narration, () => {
        // When narration ends, move to next slide
        currentSlideIndex++;
        if (currentSlideIndex < presentation.slides.length) {
          playSlide(currentSlideIndex);
        }
      });
    };

    // Start with first slide
    playSlide(0);
  }

  stopPresentation() {
    stopSpeaking();
  }
}

const slideService = new SlideService();
export default slideService;