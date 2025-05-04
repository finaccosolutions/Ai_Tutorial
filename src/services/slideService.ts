import { GoogleGenerativeAI } from '@google/generative-ai';
import { speak, stopSpeaking } from './voiceService';

export interface Slide {
  id: string;
  content: string;
  narration: string;
  duration: number;
  visualAid?: string;
}

export interface SlidePresentation {
  id: string;
  title: string;
  description: string;
  slides: Slide[];
  totalDuration: number;
  currentTime: number;
}

class SlideService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private currentPresentation: SlidePresentation | null = null;
  private playbackTimer: NodeJS.Timeout | null = null;

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

    const prompt = `
      Create an educational presentation about "${topic}" for ${level} level students.
      Include visual descriptions and engaging content.
      Format as JSON with:
      {
        "title": "Presentation title",
        "description": "Brief overview",
        "slides": [
          {
            "id": "unique_id",
            "content": "Slide content in markdown",
            "narration": "Natural speaking script",
            "duration": seconds_for_slide,
            "visualAid": "Description of visual aid or diagram"
          }
        ]
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      let presentation = JSON.parse(cleanedText);

      // Add required fields and validate
      presentation = {
        ...presentation,
        id: `presentation_${Date.now()}`,
        currentTime: 0,
        totalDuration: presentation.slides.reduce(
          (total: number, slide: Slide) => total + slide.duration,
          0
        )
      };

      this.currentPresentation = presentation;
      return presentation;
    } catch (error) {
      console.error('Error generating presentation:', error);
      throw new Error('Failed to generate presentation. Please try again.');
    }
  }

  startPresentation(
    presentation: SlidePresentation,
    onSlideChange: (slideIndex: number) => void,
    onTimeUpdate: (currentTime: number) => void,
    isSpeakingEnabled: boolean
  ): () => void {
    this.currentPresentation = presentation;
    let currentSlideIndex = 0;
    let currentTime = 0;
    let isPlaying = true;

    const updateTimer = () => {
      if (!isPlaying) return;

      this.playbackTimer = setInterval(() => {
        currentTime++;
        onTimeUpdate(currentTime);

        const currentSlide = presentation.slides[currentSlideIndex];
        if (currentTime >= currentSlide.duration) {
          currentSlideIndex++;
          if (currentSlideIndex < presentation.slides.length) {
            onSlideChange(currentSlideIndex);
            if (isSpeakingEnabled) {
              speak(presentation.slides[currentSlideIndex].narration);
            }
          } else {
            this.stopPresentation();
          }
        }
      }, 1000);
    };

    // Start presentation
    if (isSpeakingEnabled) {
      speak(presentation.slides[0].narration);
    }
    updateTimer();

    // Return cleanup function
    return () => {
      isPlaying = false;
      if (this.playbackTimer) {
        clearInterval(this.playbackTimer);
      }
      stopSpeaking();
    };
  }

  stopPresentation() {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    stopSpeaking();
  }

  seekTo(time: number): void {
    if (!this.currentPresentation) return;

    let slideIndex = 0;
    let accumulatedTime = 0;

    // Find the correct slide based on time
    for (let i = 0; i < this.currentPresentation.slides.length; i++) {
      accumulatedTime += this.currentPresentation.slides[i].duration;
      if (accumulatedTime > time) {
        slideIndex = i;
        break;
      }
    }

    this.currentPresentation.currentTime = time;
    return slideIndex;
  }
}

const slideService = new SlideService();
export default slideService;