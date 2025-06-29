import ImageResizer from 'react-native-image-resizer';
import { Platform } from 'react-native';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'JPEG' | 'PNG';
  outputPath?: string;
}

export class ImageOptimizer {
  // OCR için optimal ayarlar
  private static readonly OCR_OPTIMIZATION_SETTINGS = {
    maxWidth: 1200,        // OCR için yeterli çözünürlük
    maxHeight: 1600,       // A4 oranını koruyacak yükseklik
    quality: 85,           // Hız vs kalite dengesi
    format: 'JPEG' as const,
    compressionRatio: 0.8,
  };

  static async optimizeForOCR(imageUri: string, options?: ImageOptimizationOptions): Promise<string> {
    try {
      console.log('🖼️ Starting image optimization for OCR...');
      
      const settings = {
        ...this.OCR_OPTIMIZATION_SETTINGS,
        ...options,
      };

      // React Native Image Resizer ile optimizasyon
      const response = await ImageResizer.createResizedImage(
        imageUri,
        settings.maxWidth,
        settings.maxHeight,
        settings.format,
        settings.quality,
        0, // rotation
        undefined, // outputPath
        false, // keepMeta - metadata'yı kaldır (dosya boyutu için)
        {
          mode: 'contain',
          onlyScaleDown: true,  // Sadece küçültme, büyütme yapma
        }
      );

      console.log(`✅ Image optimized: ${imageUri} -> ${response.uri}`);
      console.log(`📏 Original size -> Optimized: ${response.size} bytes`);
      
      return response.uri;
    } catch (error) {
      console.warn('⚠️ Image optimization failed, using original:', error);
      return imageUri; // Hata durumunda orijinal görüntüyü kullan
    }
  }

  // Hızlı thumbnail oluşturma (gallery için)
  static async createThumbnail(imageUri: string, size: number = 200): Promise<string> {
    try {
      const response = await ImageResizer.createResizedImage(
        imageUri,
        size, 
        size, 
        'JPEG', 
        70, // Düşük kalite (thumbnail için yeterli)
        0
      );
      
      console.log(`📱 Thumbnail created: ${size}x${size}`);
      return response.uri;
    } catch (error) {
      console.warn('Thumbnail creation failed:', error);
      return imageUri;
    }
  }

  // Platform-specific görsel iyileştirme
  static async enhanceImageForOCR(imageUri: string): Promise<string> {
    // Gelecekte görsel iyileştirme algoritmaları eklenebilir
    // Örneğin: kontrast artırma, parlaklık ayarlama, gürültü azaltma
    
    if (Platform.OS === 'android') {
      // Android-specific optimizations
      return await this.androidImageEnhancement(imageUri);
    } else {
      // iOS optimizations (future implementation)
      return imageUri;
    }
  }

  private static async androidImageEnhancement(imageUri: string): Promise<string> {
    try {
      // Android için özel görsel iyileştirme
      // Bu örnekte sadece temel optimizasyon yapıyoruz
      const response = await ImageResizer.createResizedImage(
        imageUri,
        1200,
        1600,
        'JPEG',
        90, // Yüksek kalite (OCR accuracy için)
        0,
        undefined,
        false,
        {
          mode: 'cover', // Görüntü oranını koru
          onlyScaleDown: true,
        }
      );
      
      return response.uri;
    } catch (error) {
      console.warn('Android image enhancement failed:', error);
      return imageUri;
    }
  }

  // Çoklu boyut optimizasyonu (farklı kullanım senaryoları için)
  static async createMultipleSizes(imageUri: string): Promise<{
    original: string;
    optimized: string;
    thumbnail: string;
    preview: string;
  }> {
    try {
      const [optimized, thumbnail, preview] = await Promise.all([
        this.optimizeForOCR(imageUri),
        this.createThumbnail(imageUri, 150),
        this.createThumbnail(imageUri, 400), // Preview için orta boyut
      ]);

      return {
        original: imageUri,
        optimized,
        thumbnail,
        preview,
      };
    } catch (error) {
      console.error('Multiple size creation failed:', error);
      return {
        original: imageUri,
        optimized: imageUri,
        thumbnail: imageUri,
        preview: imageUri,
      };
    }
  }

  // Dosya boyutu kontrolü ve optimizasyon
  static async optimizeFileSize(imageUri: string, maxSizeKB: number = 500): Promise<string> {
    try {
      let quality = 85;
      let optimizedUri = imageUri;
      
      // Iterative quality reduction until file size is acceptable
      while (quality > 20) {
        const response = await ImageResizer.createResizedImage(
          imageUri,
          1200,
          1600,
          'JPEG',
          quality,
          0
        );
        
        // Dosya boyutunu kontrol et (approximation)
        if (response.size && response.size <= maxSizeKB * 1024) {
          optimizedUri = response.uri;
          break;
        }
        
        quality -= 10;
      }
      
      console.log(`📦 File size optimized with quality: ${quality}`);
      return optimizedUri;
    } catch (error) {
      console.warn('File size optimization failed:', error);
      return imageUri;
    }
  }

  // Görsel metadata temizleme (privacy için)
  static async removeMetadata(imageUri: string): Promise<string> {
    try {
      const response = await ImageResizer.createResizedImage(
        imageUri,
        2000, // Yüksek çözünürlük koru
        2000,
        'JPEG',
        95,
        0,
        undefined,
        false, // keepMeta = false (metadata kaldır)
      );
      
      console.log('🔒 Metadata removed for privacy');
      return response.uri;
    } catch (error) {
      console.warn('Metadata removal failed:', error);
      return imageUri;
    }
  }

  // Format dönüştürme
  static async convertFormat(
    imageUri: string, 
    targetFormat: 'JPEG' | 'PNG' = 'JPEG'
  ): Promise<string> {
    try {
      const response = await ImageResizer.createResizedImage(
        imageUri,
        2000,
        2000,
        targetFormat,
        targetFormat === 'PNG' ? 100 : 90, // PNG için kayıpsız, JPEG için yüksek kalite
        0
      );
      
      console.log(`🔄 Format converted to ${targetFormat}`);
      return response.uri;
    } catch (error) {
      console.warn(`Format conversion to ${targetFormat} failed:`, error);
      return imageUri;
    }
  }
} 