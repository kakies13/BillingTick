import { AnalysisResult, BillData, Currency, Country, InvoiceType } from '../types/Bill';
import { OptimizedOCRService } from './OptimizedOCRService';
import { ImageOptimizer } from './ImageOptimizer';
import { LocalizedParser } from './LocalizedParser';
import { AIBillClassifier } from './AIBillClassifier';
import { BillDatabase } from './BillDatabase';
import { NotificationService } from './NotificationService';
import * as RNLocalize from 'react-native-localize';

export class AdvancedBillAnalyzer {
  private static instance: AdvancedBillAnalyzer;
  private database: BillDatabase;
  private notificationService: NotificationService;

  constructor() {
    this.database = BillDatabase.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): AdvancedBillAnalyzer {
    if (!AdvancedBillAnalyzer.instance) {
      AdvancedBillAnalyzer.instance = new AdvancedBillAnalyzer();
    }
    return AdvancedBillAnalyzer.instance;
  }

  /**
   * Gelişmiş fatura analizi - tüm optimizasyonları kullanan ana fonksiyon
   */
  async analyzeBillAdvanced(
    imageUri: string,
    options?: {
      optimizeImage?: boolean;
      saveToDatabase?: boolean;
      scheduleNotifications?: boolean;
      forceLanguage?: string;
      hints?: {
        currency?: Currency;
        country?: Country;
        company?: string;
      };
    }
  ): Promise<{
    success: boolean;
    result?: AnalysisResult;
    billData?: BillData;
    confidence: number;
    processing: {
      imageOptimized: boolean;
      ocrAccuracy: number;
      classificationAccuracy: number;
      parsingAccuracy: number;
    };
    error?: string;
  }> {
    try {
      console.log('🚀 Starting Advanced Bill Analysis...');
      
      const startTime = Date.now();
      let optimizedImageUri = imageUri;
      let imageOptimized = false;

      // 1. Görsel Optimizasyonu
      if (options?.optimizeImage !== false) {
        console.log('📷 Step 1: Image Optimization');
        optimizedImageUri = await ImageOptimizer.optimizeForOCR(imageUri);
        imageOptimized = optimizedImageUri !== imageUri;
        
        if (imageOptimized) {
          console.log('✅ Image optimized successfully');
        }
      }

      // 2. Gelişmiş OCR İşlemi
      console.log('🔍 Step 2: Advanced OCR Processing');
      const ocrResult = await OptimizedOCRService.processImageOptimized(
        optimizedImageUri,
        {
          language: options?.forceLanguage,
        }
      );

      const ocrAccuracy = ocrResult.confidence;
      console.log(`📝 OCR completed with ${Math.round(ocrAccuracy * 100)}% confidence`);

      if (ocrAccuracy < 0.3) {
        return {
          success: false,
          confidence: ocrAccuracy,
          processing: {
            imageOptimized,
            ocrAccuracy,
            classificationAccuracy: 0,
            parsingAccuracy: 0
          },
          error: 'OCR confidence too low. Please try with a clearer image.'
        };
      }

      // 3. Gelişmiş Parsing (Tutar ve Tarih)
      console.log('💰 Step 3: Localized Amount & Date Parsing');
      const amount = LocalizedParser.parseAmountAdvanced(
        ocrResult.text,
        {
          currency: options?.hints?.currency,
          country: options?.hints?.country
        }
      );

      const dueDate = LocalizedParser.parseDate(ocrResult.text);
      
      const parsingAccuracy = this.calculateParsingAccuracy(amount, dueDate);
      console.log(`📅 Parsing completed with ${Math.round(parsingAccuracy * 100)}% accuracy`);

      // 4. AI Fatura Sınıflandırması
      console.log('🤖 Step 4: AI Bill Classification');
      const classificationResult = await AIBillClassifier.classifyBill(
        ocrResult.text,
        {
          currency: amount?.currency,
          country: this.getDeviceCountry(),
          companyHint: options?.hints?.company,
          amountHint: amount?.value
        }
      );

      const classificationAccuracy = classificationResult.confidence;
      console.log(`🎯 Classification: ${classificationResult.type} (${Math.round(classificationAccuracy * 100)}%)`);

      // 5. Şirket Adı Çıkarma (Gelişmiş)
      const companyInfo = AIBillClassifier.extractCompanyName(
        ocrResult.text,
        classificationResult.type
      );

      // 6. Güven Skoru Kalibrasyonu
      const calibratedConfidence = AIBillClassifier.calibrateConfidence(
        classificationResult.confidence,
        !!amount,
        !!dueDate,
        !!companyInfo
      );

      // 7. Sonuçları Birleştir
      const analysisResult: AnalysisResult = {
        type: classificationResult.type,
        amount,
        dueDate,
        company: companyInfo?.name || classificationResult.companyName,
        confidence: calibratedConfidence
      };

      // 8. BillData Objesi Oluştur
      const billData: BillData = {
        id: this.generateBillId(),
        type: analysisResult.type,
        amount: analysisResult.amount,
        dueDate: analysisResult.dueDate,
        company: analysisResult.company,
        confidence: calibratedConfidence,
        ocrText: ocrResult.text,
        imageUri: optimizedImageUri,
        createdAt: new Date()
      };

      // 9. Veritabanına Kaydet
      if (options?.saveToDatabase !== false) {
        console.log('💾 Step 5: Saving to Database');
        const imageSizes = await ImageOptimizer.createMultipleSizes(imageUri);
        
        const saveResult = await this.database.saveBill(billData, {
          thumbnail: imageSizes.thumbnail,
          optimized: imageSizes.optimized
        });

        if (!saveResult.success) {
          console.warn('⚠️ Failed to save to database:', saveResult.error);
        } else {
          console.log('✅ Bill saved to database');
        }
      }

      // 10. Bildirim Schedule Et
      if (options?.scheduleNotifications !== false && billData.dueDate?.date) {
        console.log('🔔 Step 6: Scheduling Notifications');
        try {
          const notificationScheduled = await this.notificationService.scheduleBillReminders(
            billData.id,
            billData.dueDate.date,
            {
              company: billData.company,
              amount: billData.amount,
              type: billData.type
            }
          );

          if (notificationScheduled) {
            console.log('✅ Notifications scheduled');
          } else {
            console.warn('⚠️ Failed to schedule notifications');
          }
        } catch (notifError) {
          console.warn('⚠️ Notification error:', notifError);
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`🎉 Advanced Analysis completed in ${processingTime}ms`);
      console.log(`📊 Final confidence: ${Math.round(calibratedConfidence * 100)}%`);
      console.log(`🔍 Classification reasoning: ${classificationResult.reasoning}`);

      return {
        success: true,
        result: analysisResult,
        billData,
        confidence: calibratedConfidence,
        processing: {
          imageOptimized,
          ocrAccuracy,
          classificationAccuracy,
          parsingAccuracy
        }
      };

    } catch (error) {
      console.error('❌ Advanced Bill Analysis failed:', error);
      return {
        success: false,
        confidence: 0,
        processing: {
          imageOptimized: false,
          ocrAccuracy: 0,
          classificationAccuracy: 0,
          parsingAccuracy: 0
        },
        error: String(error)
      };
    }
  }

  /**
   * Hızlı analiz (sadece temel bilgiler)
   */
  async quickAnalyze(imageUri: string): Promise<{
    type: InvoiceType;
    amount?: { value: number; currency: Currency };
    company?: string;
    confidence: number;
  }> {
    try {
      console.log('⚡ Quick Analysis started...');

      // Hızlı OCR (düşük kalite, hızlı)
      const ocrResult = await OptimizedOCRService.processImageOptimized(imageUri);
      
      // Hızlı sınıflandırma
      const classification = await AIBillClassifier.classifyBill(ocrResult.text);
      
      // Hızlı tutar parsing
      const amount = LocalizedParser.parseAmount(ocrResult.text);

      return {
        type: classification.type,
        amount,
        company: classification.companyName,
        confidence: classification.confidence
      };
    } catch (error) {
      console.error('❌ Quick analysis failed:', error);
      return {
        type: InvoiceType.UNKNOWN,
        confidence: 0
      };
    }
  }

  private calculateParsingAccuracy(amount: any, dueDate: any): number {
    let accuracy = 0;
    
    if (amount) accuracy += 0.5;
    if (dueDate) accuracy += 0.5;
    
    return accuracy;
  }

  private getDeviceCountry(): Country {
    const locale = RNLocalize.getLocales()[0];
    const countryCode = locale?.countryCode;
    
    // Enum değerlerini kontrol et
    if (countryCode && Object.values(Country).includes(countryCode as Country)) {
      return countryCode as Country;
    }
    
    return Country.US; // Varsayılan
  }

  private generateBillId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `bill_${timestamp}_${random}`;
  }
} 