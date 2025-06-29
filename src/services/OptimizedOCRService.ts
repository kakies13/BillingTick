import TextRecognition from '@react-native-ml-kit/text-recognition';
import { OCRResult, TextBlock } from '../types/Bill';
import * as RNLocalize from 'react-native-localize';

export interface OCROptions {
  language?: string;
  script?: 'latin' | 'chinese' | 'devanagari' | 'japanese' | 'korean';
  imageQuality?: number;
  enableTextSegmentation?: boolean;
}

export class OptimizedOCRService {
  // Language-specific OCR settings
  private static readonly LANGUAGE_CONFIGS = {
    'tr': { 
      script: 'latin',
      expectedChars: 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789.,€₺TL',
      companies: ['TEDAŞ', 'İGDAŞ', 'İSKİ', 'TÜRK TELEKOM', 'VODAFONE', 'TURKCELL'],
      commonErrors: { 
        '0': 'O', '1': 'I', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ş': 's', 'ç': 'c',
        'İ': 'I', 'ı': 'i'
      }
    },
    'de': { 
      script: 'latin',
      expectedChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß0123456789.,€',
      companies: ['E.ON', 'RWE', 'VATTENFALL', 'TELEKOM', 'STADTWERKE'],
      commonErrors: { 
        'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
        '0': 'O', 'l': '1'
      }
    },
    'en': { 
      script: 'latin',
      expectedChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,$',
      companies: ['VERIZON', 'AT&T', 'COMCAST', 'PG&E', 'EDISON'],
      commonErrors: { 
        '0': 'O', 'l': '1', 'I': '1', 'S': '5'
      }
    }
  };

  static async processImageOptimized(
    imageUri: string, 
    options: OCROptions = {}
  ): Promise<OCRResult> {
    try {
      // Auto-detect optimal settings
      const locale = RNLocalize.getLocales()[0];
      const languageCode = locale?.languageCode || 'en';
      const config = this.LANGUAGE_CONFIGS[languageCode as keyof typeof this.LANGUAGE_CONFIGS] || this.LANGUAGE_CONFIGS['en'];
      
      console.log(`🌍 OCR Processing with language: ${languageCode}`);
      
      // Process with ML Kit
      const result = await TextRecognition.recognize(imageUri);
      
      // Language-specific post-processing
      const cleanedText = this.cleanTextForLanguage(result.text, languageCode, config);
      
      const blocks: TextBlock[] = result.blocks.map(block => ({
        text: block.text,
        boundingBox: {
          left: block.frame?.left || 0,
          top: block.frame?.top || 0,
          width: block.frame?.width || 0,
          height: block.frame?.height || 0,
        },
        confidence: this.calculateBlockConfidence(block.text, config),
      }));

      const processedResult: OCRResult = {
        text: cleanedText,
        confidence: this.calculateOverallConfidence(blocks),
        blocks,
      };
      
      console.log(`✅ OCR Completed - Confidence: ${Math.round(processedResult.confidence * 100)}%`);
      return processedResult;
      
    } catch (error) {
      console.error('Optimized OCR Error:', error);
      throw new Error(`OCR processing failed: ${error}`);
    }
  }

  private static cleanTextForLanguage(text: string, lang: string, config: any): string {
    let cleaned = text;
    
    // Apply language-specific error corrections
    Object.entries(config.commonErrors).forEach(([wrong, correct]) => {
      const regex = new RegExp(wrong, 'g');
      cleaned = cleaned.replace(regex, correct as string);
    });

    // Language-specific character filtering
    switch (lang) {
      case 'tr':
        cleaned = this.cleanTurkishOCRText(cleaned);
        break;
      case 'de':
        cleaned = this.cleanGermanOCRText(cleaned);
        break;
      default:
        cleaned = this.cleanEnglishOCRText(cleaned);
    }

    return cleaned.trim();
  }

  // Turkish text cleaning for common OCR errors
  private static cleanTurkishOCRText(text: string): string {
    return text
      .replace(/İ/g, 'I')  // Turkish capital I
      .replace(/ı/g, 'i')  // Turkish lowercase ı
      .replace(/[^\w\sğüşıöçĞÜŞIÖÇ.,:€₺TL\-]/g, '') // Keep only Turkish chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // German text cleaning
  private static cleanGermanOCRText(text: string): string {
    return text
      .replace(/[^\w\säöüßÄÖÜ.,:-€]/g, '') // Keep only German chars
      .replace(/\s+/g, ' ')
      .trim();
  }

  // English text cleaning
  private static cleanEnglishOCRText(text: string): string {
    return text
      .replace(/[^\w\s.,:-$€£¥₺]/g, '') // Keep only relevant chars
      .replace(/\s+/g, ' ')              // Normalize whitespace
      .trim();
  }

  private static calculateBlockConfidence(blockText: string, config: any): number {
    let confidence = 0.8; // Base confidence
    
    if (blockText.length === 0) return 0;
    
    // Check for expected characters
    const validChars = blockText.split('').filter(char => 
      config.expectedChars.includes(char.toUpperCase())
    ).length;
    
    confidence = (validChars / blockText.length) * 0.9 + 0.1;
    
    // Boost confidence for known companies
    config.companies.forEach((company: string) => {
      if (blockText.toUpperCase().includes(company.toUpperCase())) {
        confidence = Math.min(confidence + 0.15, 1.0);
      }
    });
    
    return Math.max(0, Math.min(confidence, 1.0));
  }

  private static calculateOverallConfidence(blocks: TextBlock[]): number {
    if (blocks.length === 0) return 0;
    
    const totalConfidence = blocks.reduce((sum, block) => sum + block.confidence, 0);
    return totalConfidence / blocks.length;
  }

  // Multi-language text preprocessing for analysis
  static preprocessTextForLanguage(text: string, languageCode?: string): string {
    const lang = languageCode || RNLocalize.getLocales()[0]?.languageCode || 'en';
    const config = this.LANGUAGE_CONFIGS[lang as keyof typeof this.LANGUAGE_CONFIGS] || this.LANGUAGE_CONFIGS['en'];
    
    return this.cleanTextForLanguage(text.toLowerCase(), lang, config);
  }
} 