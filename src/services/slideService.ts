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
  private lastSpeakTime: number = 0;

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

    const prompt = `You are a presentation generator. Generate an educational presentation about "${topic}" for ${level} level students. Return ONLY a JSON object with no additional formatting or markdown syntax. The response must be a valid JSON object with the following structure:

{
  "title": "Main presentation title",
  "description": "Brief overview of the presentation",
  "slides": [
    {
      "id": "slide_1",
      "content": "# Slide Title\\n- Key point 1\\n- Key point 2",
      "narration": "Natural speaking script for this slide",
      "duration": 45,
      "visualAid": "Description for relevant image"
    }
  ]
}

Create 5-7 slides with engaging, educational content. Each slide should have clear content with headers and bullet points (using markdown syntax within the content string), a conversational narration script, a relevant visual aid description, and a duration between 30-60 seconds.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      text = text.replace(/^```json\s*/, '')
                 .replace(/\s*```$/, '')
                 .trim();
      
      let presentation;
      try {
        presentation = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.debug('Failed JSON content:', text);
        throw new Error('Failed to parse presentation content. The AI response was not in the correct format.');
      }

      if (!presentation.title || !presentation.description || !Array.isArray(presentation.slides)) {
        throw new Error('Invalid presentation format: missing required fields');
      }

      for (const slide of presentation.slides) {
        if (!slide.id || !slide.content || !slide.narration || !slide.duration) {
          throw new Error('Invalid slide format: missing required fields');
        }
      }

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
      throw new Error(
        error instanceof Error ? error.message : 'Failed to generate presentation. Please try again.'
      );
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
    this.lastSpeakTime = Date.now();

    const updatePresentation = () => {
      if (!this.isPlaying || !this.currentPresentation) return;

      const currentTime = this.currentPresentation.currentTime;
      onTimeUpdate(currentTime);

      let accumulatedDuration = 0;
      for (let i = 0; i <= this.currentSlideIndex; i++) {
        accumulatedDuration += this.currentPresentation.slides[i].duration;
      }

      if (currentTime >= accumulatedDuration && this.currentSlideIndex < this.currentPresentation.slides.length - 1) {
        this.currentSlideIndex++;
        onSlideChange(this.currentSlideIndex);
        if (this.isSpeakingEnabled && this.isPlaying) {
          this.lastSpeakTime = Date.now();
          speak(this.currentPresentation.slides[this.currentSlideIndex].narration);
        }
      }

      this.currentPresentation.currentTime++;
      this.playbackTimer = setTimeout(updatePresentation, 1000);
    };

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
    if (this.isSpeakingEnabled) {
      stopSpeaking();
    }
  }

  resumePresentation(
    onSlideChange: (slideIndex: number) => void,
    onTimeUpdate: (currentTime: number) => void
  ): void {
    if (!this.currentPresentation) return;

    this.isPlaying = true;
    
    // Only start speaking if enough time has passed since the last speak
    const timeSinceLastSpeak = Date.now() - this.lastSpeakTime;
    if (this.isSpeakingEnabled && timeSinceLastSpeak > 500) {
      this.lastSpeakTime = Date.now();
      speak(this.currentPresentation.slides[this.currentSlideIndex].narration);
    }
    
    const updatePresentation = () => {
      if (!this.isPlaying || !this.currentPresentation) return;

      const currentTime = this.currentPresentation.currentTime;
      onTimeUpdate(currentTime);

      let accumulatedDuration = 0;
      for (let i = 0; i <= this.currentSlideIndex; i++) {
        accumulatedDuration += this.currentPresentation.slides[i].duration;
      }

      if (currentTime >= accumulatedDuration && this.currentSlideIndex < this.currentPresentation.slides.length - 1) {
        this.currentSlideIndex++;
        onSlideChange(this.currentSlideIndex);
        if (this.isSpeakingEnabled && this.isPlaying) {
          this.lastSpeakTime = Date.now();
          speak(this.currentPresentation.slides[this.currentSlideIndex].narration);
        }
      }

      this.currentPresentation.currentTime++;
      this.playbackTimer = setTimeout(updatePresentation, 1000);
    };

    updatePresentation();
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
      this.lastSpeakTime = Date.now();
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
      this.lastSpeakTime = Date.now();
      speak(this.currentPresentation.slides[this.currentSlideIndex].narration);
    }
  }
}

const slideService = new SlideService();
export default slideService;