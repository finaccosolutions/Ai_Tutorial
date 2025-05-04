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
    if (!apiKey) {
      throw new Error('API key is required to initialize Gemini API.');
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
      throw new Error('Failed to initialize Gemini API. Please check your API key.');
    }
  }

  async generateSlidePresentation(topic: string, level: string): Promise<SlidePresentation> {
    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set API key first.');
    }

    if (!topic || !level) {
      throw new Error('Topic and level are required to generate a presentation.');
    }

    const prompt = `
      Create an educational presentation about "${topic}" for ${level} level students.
      Respond with ONLY the following JSON structure, no markdown formatting or backticks:
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
      - Use markdown formatting in content
      - Keep each narration around 30-60 seconds
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean the response text by removing any markdown formatting
      const cleanedText = text
        .replace(/```json\s*/g, '')  // Remove ```json
        .replace(/```\s*/g, '')      // Remove remaining ```
        .trim();                     // Remove any extra whitespace
      
      let presentation;
      try {
        presentation = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        console.error('Raw response:', text);
        console.error('Cleaned response:', cleanedText);
        throw new Error('Failed to parse AI response. The response format was invalid. Please try again.');
      }

      // Validate the presentation structure
      if (!presentation.title || !Array.isArray(presentation.slides) || presentation.slides.length === 0) {
        throw new Error('Invalid presentation structure received from AI. Missing required fields.');
      }

      // Ensure each slide has required properties
      presentation.slides = presentation.slides.map((slide: any, index: number) => ({
        id: slide.id || `slide_${index + 1}`,
        content: slide.content || 'Content not available',
        narration: slide.narration || 'Narration not available',
        duration: slide.duration || 30
      }));
      
      // Calculate total duration
      const totalDuration = presentation.slides.reduce(
        (total: number, slide: Slide) => total + slide.duration,
        0
      );

      return {
        ...presentation,
        id: `presentation_${Date.now()}`,
        totalDuration
      };
    } catch (error: any) {
      console.error('Error generating presentation:', error);
      if (error.message.includes('API key')) {
        throw new Error('Invalid or expired API key. Please check your Gemini API key.');
      }
      throw error; // Propagate the specific error message instead of a generic one
    }
  }

  startPresentation(
    presentation: SlidePresentation, 
    onSlideChange: (slideIndex: number) => void,
    isSpeakingEnabled: boolean
  ) {
    if (!presentation || !presentation.slides || presentation.slides.length === 0) {
      throw new Error('Invalid presentation data.');
    }

    let currentSlideIndex = 0;
    let isPlaying = true;
    
    const playSlide = async (index: number) => {
      if (!isPlaying || index >= presentation.slides.length) {
        return;
      }
      
      const slide = presentation.slides[index];
      onSlideChange(index);
      
      if (isSpeakingEnabled && slide.narration) {
        try {
          await speak(slide.narration, () => {
            if (isPlaying) {
              currentSlideIndex++;
              if (currentSlideIndex < presentation.slides.length) {
                playSlide(currentSlideIndex);
              }
            }
          });
        } catch (error) {
          console.error('Error playing narration:', error);
          if (isPlaying) {
            currentSlideIndex++;
            if (currentSlideIndex < presentation.slides.length) {
              playSlide(currentSlideIndex);
            }
          }
        }
      } else {
        setTimeout(() => {
          if (isPlaying) {
            currentSlideIndex++;
            if (currentSlideIndex < presentation.slides.length) {
              playSlide(currentSlideIndex);
            }
          }
        }, slide.duration * 1000);
      }
    };

    // Start with first slide
    playSlide(0);

    // Return a function to stop the presentation
    return () => {
      isPlaying = false;
      stopSpeaking();
    };
  }

  stopPresentation() {
    stopSpeaking();
  }
}

const slideService = new SlideService();
export default slideService;