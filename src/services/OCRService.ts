import TextRecognition from '@react-native-ml-kit/text-recognition';
import { OCRResult, TextBlock } from '../types/Bill';

export class OCRService {
  static async processImage(imageUri: string): Promise<OCRResult> {
    try {
      const result = await TextRecognition.recognize(imageUri);
      
      // Convert ML Kit result to our format
      const blocks: TextBlock[] = result.blocks.map(block => ({
        text: block.text,
        boundingBox: {
          left: block.frame?.left || 0,
          top: block.frame?.top || 0,
          width: block.frame?.width || 0,
          height: block.frame?.height || 0,
        },
        confidence: 0.8, // ML Kit TextBlock doesn't provide confidence, use default
      }));

      return {
        text: result.text,
        confidence: this.calculateOverallConfidence(blocks),
        blocks,
      };
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Failed to process image with OCR');
    }
  }

  private static calculateOverallConfidence(blocks: TextBlock[]): number {
    if (blocks.length === 0) return 0;
    
    const totalConfidence = blocks.reduce((sum, block) => sum + block.confidence, 0);
    return totalConfidence / blocks.length;
  }

  // Enhanced text preprocessing for better analysis
  static preprocessText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // normalize whitespace
      .replace(/[^\w\s.,:-€$£¥₺]/g, '') // keep only relevant characters
      .trim()
      .toLowerCase();
  }
} 