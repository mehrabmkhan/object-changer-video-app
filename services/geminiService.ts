
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult } from "../types";

export class GeminiService {
  private static getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  static async analyzeVideo(videoBase64: string, mimeType: string): Promise<AnalysisResult> {
    const ai = this.getAI();
    const prompt = `Analyze this video carefully. Identify:
    1. The environment (e.g., snowy Antarctic tundra).
    2. Main subjects (e.g., penguins, car).
    3. Lighting conditions.
    4. Cinematic techniques used (e.g., close-ups, wide shots, shallow depth of field).
    5. Details of the car currently in the video.
    
    Then, create a "Template Prompt" where the car description is a placeholder like [TARGET_CAR]. The prompt should describe the entire scene but use that placeholder.
    
    Return the result in JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: videoBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            environment: { type: Type.STRING },
            subjects: { type: Type.STRING },
            lighting: { type: Type.STRING },
            cinematography: { type: Type.STRING },
            originalCar: { type: Type.STRING },
            suggestedPrompt: { type: Type.STRING }
          },
          required: ["environment", "subjects", "lighting", "cinematography", "originalCar", "suggestedPrompt"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  }

  static async generateSwappedVideo(
    prompt: string, 
    originalVideoUri?: string, 
    refImageBase64?: string,
    onStatusUpdate?: (msg: string) => void
  ): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    onStatusUpdate?.("Initializing advanced render engine...");
    
    const config: any = {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    };

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      ...(refImageBase64 ? { 
        image: { 
          imageBytes: refImageBase64, 
          mimeType: 'image/png' 
        } 
      } : {}),
      config
    });

    let dots = "";
    while (!operation.done) {
      dots = dots.length > 3 ? "" : dots + ".";
      onStatusUpdate?.(`Cinematic frames are being processed${dots}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed - no URI returned.");

    const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
}
