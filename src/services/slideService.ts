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
  private lastSlideChange: number = 0;
  private MIN_SLIDE_INTERVAL = 500;
  private MAX_RETRIES = 3;

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

  private sanitizeJsonResponse(text: string): string {
    // Remove any markdown code block indicators
    let sanitized = text.replace(/^```json\s*/g, '')
                       .replace(/^```\s*/g, '')
                       .replace(/\s*```$/g, '')
                       .trim();
    
    // Remove any potential trailing commas before closing braces/brackets
    sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');
    
    // Ensure proper JSON string escaping
    sanitized = sanitized.replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, '\\\\');
    
    return sanitized;
  }

  private validatePresentation(presentation: any): void {
    if (!presentation || typeof presentation !== 'object') {
      throw new Error('Invalid presentation format: not an object');
    }

    const requiredFields = ['title', 'description', 'slides'];
    for (const field of requiredFields) {
      if (!(field in presentation)) {
        throw new Error(`Invalid presentation format: missing required field '${field}'`);
      }
    }

    if (!Array.isArray(presentation.slides)) {
      throw new Error('Invalid presentation format: slides must be an array');
    }

    if (presentation.slides.length === 0) {
      throw new Error('Invalid presentation format: no slides provided');
    }

    for (const [index, slide] of presentation.slides.entries()) {
      const slideRequiredFields = ['id', 'content', 'narration', 'duration'];
      for (const field of slideRequiredFields) {
        if (!(field in slide)) {
          throw new Error(`Invalid slide format at index ${index}: missing required field '${field}'`);
        }
      }

      if (typeof slide.duration !== 'number' || slide.duration < 0) {
        throw new Error(`Invalid slide format at index ${index}: duration must be a positive number`);
      }
    }
  }

  private async retryGenerateContent(prompt: string, attempt = 1): Promise<any> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const sanitizedJson = this.sanitizeJsonResponse(text);
      const parsed = JSON.parse(sanitizedJson);
      
      this.validatePresentation(parsed);
      return parsed;
    } catch (error) {
      if (attempt < this.MAX_RETRIES) {
        console.warn(`Attempt ${attempt} failed, retrying...`);
        // Add exponential backoff delay
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        return this.retryGenerateContent(prompt, attempt + 1);
      }
      throw error;
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
      const presentation = await this.retryGenerateContent(prompt);

      const finalPresentation = {
        ...presentation,
        id: `presentation_${Date.now()}`,
        currentTime: 0,
        totalDuration: presentation.slides.reduce(
          (total: number, slide: Slide) => total + slide.duration,
          0
        )
      };

      this.currentPresentation = finalPresentation;
      return finalPresentation;
    } catch (error) {
      console.error('Error generating presentation:', error);
      
      // Provide more specific error messages
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse the AI response. Please try again.');
      } else if (error instanceof Error && error.message.includes('Invalid presentation format')) {
        throw new Error('The AI generated an invalid presentation structure. Please try again.');
      }
      
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
    this.lastSlideChange = Date.now();

    const updatePresentation = () => {
      if (!this.isPlaying || !this.currentPresentation) return;

      const currentTime = this.currentPresentation.currentTime;
      onTimeUpdate(currentTime);

      let accumulatedDuration = 0;
      for (let i = 0; i <= this.currentSlideIndex; i++) {
        accumulatedDuration += this.currentPresentation.slides[i].duration;
      }

      const now = Date.now();
      if (currentTime >= accumulatedDuration && 
          this.currentSlideIndex < this.currentPresentation.slides.length - 1 &&
          now - this.lastSlideChange >= this.MIN_SLIDE_INTERVAL) {
        this.currentSlideIndex++;
        this.lastSlideChange = now;
        onSlideChange(this.currentSlideIndex);
        if (this.isSpeakingEnabled && this.isPlaying) {
          speak(this.currentPresentation.slides[this.currentSlideIndex].narration);
        }
      }

      this.currentPresentation.currentTime++;
      this.playbackTimer = setTimeout(updatePresentation, 1000);
    };

    if (this.isSpeakingEnabled && presentation.slides.length > 0) {
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
    if (!this.currentPresentation || !this.currentPresentation.slides.length) return;

    this.isPlaying = true;
    
    if (this.currentSlideIndex >= this.currentPresentation.slides.length) {
      this.currentSlideIndex = this.currentPresentation.slides.length - 1;
    }
    
    const now = Date.now();
    if (this.isSpeakingEnabled && now - this.lastSlideChange >= this.MIN_SLIDE_INTERVAL) {
      this.lastSlideChange = now;
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

      const now = Date.now();
      if (currentTime >= accumulatedDuration && 
          this.currentSlideIndex < this.currentPresentation.slides.length - 1 &&
          now - this.lastSlideChange >= this.MIN_SLIDE_INTERVAL) {
        this.currentSlideIndex++;
        this.lastSlideChange = now;
        onSlideChange(this.currentSlideIndex);
        if (this.isSpeakingEnabled && this.isPlaying) {
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
    
    const now = Date.now();
    if (this.isPlaying && this.isSpeakingEnabled && now - this.lastSlideChange >= this.MIN_SLIDE_INTERVAL) {
      this.lastSlideChange = now;
      speak(this.currentPresentation.slides[slideIndex].narration);
    }
    
    return slideIndex;
  }

  setIsSpeakingEnabled(enabled: boolean): void {
    this.isSpeakingEnabled = enabled;
    if (!enabled) {
      stopSpeaking();
    } else if (this.isPlaying && this.currentPresentation) {
      const now = Date.now();
      if (now - this.lastSlideChange >= this.MIN_SLIDE_INTERVAL) {
        this.lastSlideChange = now;
        speak(this.currentPresentation.slides[this.currentSlideIndex].narration);
      }
    }
  }
}

const slideService = new SlideService();
export default slideService;