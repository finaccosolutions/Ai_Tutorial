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
  private currentSlideIndex: number = 0;
  private isPlaying: boolean = false;
  private isSpeakingEnabled: boolean = true;

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
  ): void {
    this.currentPresentation = presentation;
    this.currentSlideIndex = 0;
    this.isPlaying = true;
    this.isSpeakingEnabled = isSpeakingEnabled;

    const updatePresentation = () => {
      if (!this.isPlaying || !this.currentPresentation) return;

      const currentTime = this.currentPresentation.currentTime;
      onTimeUpdate(currentTime);

      // Calculate accumulated duration up to current slide
      let accumulatedDuration = 0;
      for (let i = 0; i <= this.currentSlideIndex; i++) {
        accumulatedDuration += this.currentPresentation.slides[i].duration;
      }

      // Check if we need to move to the next slide
      if (currentTime >= accumulatedDuration && this.currentSlideIndex < this.currentPresentation.slides.length - 1) {
        this.currentSlideIndex++;
        onSlideChange(this.currentSlideIndex);
        if (this.isSpeakingEnabled) {
          speak(this.currentPresentation.slides[this.currentSlideIndex].narration);
        }
      }

      this.currentPresentation.currentTime++;
      this.playbackTimer = setTimeout(updatePresentation, 1000);
    };

    // Start presentation
    if (this.isSpeakingEnabled) {
      speak(presentation.slides[0].narration);
    }
    updatePresentation();
  }

  stopPresentation(): void {
    this.isPlaying = false;
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
    stopSpeaking();
  }

  resumePresentation(
    onSlideChange: (slideIndex: number) => void,
    onTimeUpdate: (currentTime: number) => void
  ): void {
    if (!this.currentPresentation) return;

    this.isPlaying = true;
    if (this.isSpeakingEnabled) {
      speak(this.currentPresentation.slides[this.currentSlideIndex].narration);
    }
    
    this.startPresentation(
      this.currentPresentation,
      onSlideChange,
      onTimeUpdate,
      this.isSpeakingEnabled
    );
  }

  seekTo(time: number): number {
    if (!this.currentPresentation) return 0;

    let accumulatedTime = 0;
    let slideIndex = 0;

    for (let i = 0; i < this.currentPresentation.slides.length; i++) {
      accumulatedTime += this.currentPresentation.slides[i].duration;
      if (time < accumulatedTime) {
        slideIndex = i;
        break;
      }
    }

    this.currentPresentation.currentTime = time;
    this.currentSlideIndex = slideIndex;
    
    if (this.isPlaying && this.isSpeakingEnabled) {
      stopSpeaking();
      speak(this.currentPresentation.slides[slideIndex].narration);
    }
    
    return slideIndex;
  }

  setIsSpeakingEnabled(enabled: boolean): void {
    this.isSpeakingEnabled = enabled;
    if (!enabled) {
      stopSpeaking();
    } else if (this.isPlaying && this.currentPresentation) {
      speak(this.currentPresentation.slides[this.currentSlideIndex].narration);
    }
  }
}

const slideService = new SlideService();
export default slideService;