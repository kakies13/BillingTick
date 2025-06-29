import * as RNLocalize from 'react-native-localize';
import { Currency, DateInfo, Amount } from '../types/Bill';

interface DatePattern {
  regex: RegExp;
  order: number[];
  format: string;
}

interface CurrencyPattern {
  [key: string]: RegExp;
}

export class LocalizedParser {
  // Dil bazlı tarih formatları
  private static readonly DATE_PATTERNS_BY_LOCALE: { [key: string]: DatePattern[] } = {
    'en-US': [
      { 
        regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, 
        order: [1, 0, 2], 
        format: 'MM/DD/YYYY' 
      },
      { 
        regex: /(\d{1,2})-(\d{1,2})-(\d{4})/g, 
        order: [1, 0, 2], 
        format: 'MM-DD-YYYY' 
      }
    ],
    'de-DE': [
      { 
        regex: /(\d{1,2})\.(\d{1,2})\.(\d{4})/g, 
        order: [0, 1, 2], 
        format: 'DD.MM.YYYY' 
      },
      { 
        regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, 
        order: [0, 1, 2], 
        format: 'DD/MM/YYYY' 
      }
    ],
    'tr-TR': [
      { 
        regex: /(\d{1,2})\.(\d{1,2})\.(\d{4})/g, 
        order: [0, 1, 2], 
        format: 'DD.MM.YYYY' 
      },
      { 
        regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, 
        order: [0, 1, 2], 
        format: 'DD/MM/YYYY' 
      }
    ]
  };

  // Dil bazlı para birimi formatları
  private static readonly CURRENCY_PATTERNS_BY_LOCALE: { [key: string]: CurrencyPattern } = {
    'en-US': {
      [Currency.USD]: /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      [Currency.EUR]: /EUR\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      [Currency.GBP]: /GBP\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
    },
    'de-DE': {
      [Currency.EUR]: /€\s*(\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?)|(\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?)\s*€/g,
      [Currency.USD]: /USD\s*(\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?)/g,
      [Currency.CHF]: /CHF\s*(\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?)/g,
    },
    'tr-TR': {
      [Currency.TRY]: /₺\s*(\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?)|(\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?)\s*₺|(\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?)\s*TL/g,
      [Currency.USD]: /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      [Currency.EUR]: /€\s*(\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?)/g,
    }
  };

  // Dil bazlı "son ödeme" anahtar kelimeleri
  private static readonly DUE_KEYWORDS_BY_LANGUAGE: { [key: string]: string[] } = {
    'en': ['due', 'payment due', 'pay by', 'deadline', 'due date', 'payable by'],
    'de': ['fällig', 'zahlbar bis', 'zahlung bis', 'fälligkeit', 'zahlungstermin'],
    'tr': ['son ödeme', 'ödeme tarihi', 'vade', 'son tarih', 'ödeme vadesi', 'son ödeme tarihi'],
  };

  // Ülke bazlı birincil para birimi
  private static readonly PRIMARY_CURRENCY_BY_COUNTRY: { [key: string]: Currency } = {
    'US': Currency.USD, 'GB': Currency.GBP, 'TR': Currency.TRY,
    'DE': Currency.EUR, 'FR': Currency.EUR, 'ES': Currency.EUR,
    'IT': Currency.EUR, 'CA': Currency.CAD, 'AU': Currency.AUD,
    'JP': Currency.JPY, 'CH': Currency.CHF, 'SE': Currency.SEK,
    'NO': Currency.NOK,
  };

  /**
   * Metindeki tutarı dil bazlı parse eder
   */
  static parseAmount(text: string): Amount | undefined {
    const locale = RNLocalize.getLocales()[0];
    const localeKey = `${locale?.languageCode}-${locale?.countryCode}` || 'en-US';
    
    console.log(`💰 Parsing amount with locale: ${localeKey}`);
    
    const patterns = this.CURRENCY_PATTERNS_BY_LOCALE[localeKey] || 
                    this.CURRENCY_PATTERNS_BY_LOCALE['en-US'];

    // Locale'in birincil para biriminden başla
    const primaryCurrency = this.getPrimaryCurrency(locale?.countryCode || 'US');
    const currencies = [primaryCurrency, ...Object.values(Currency)];

    for (const currency of currencies) {
      const pattern = patterns[currency];
      if (!pattern) continue;

      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        // En büyük tutarı al (genellikle toplam tutar)
        let maxAmount = 0;
        let bestMatch = '';

        for (const match of matches) {
          const amountStr = match[1] || match[2] || match[3] || match[0];
          const numericAmount = this.parseNumericAmount(amountStr, localeKey);
          
          if (numericAmount > maxAmount) {
            maxAmount = numericAmount;
            bestMatch = amountStr;
          }
        }

        if (maxAmount > 0) {
          console.log(`✅ Amount found: ${maxAmount} ${currency} (${bestMatch})`);
          return {
            value: maxAmount,
            currency,
            raw: bestMatch,
          };
        }
      }
    }

    console.log('❌ No amount found in text');
    return undefined;
  }

  /**
   * Metindeki tarihi dil bazlı parse eder
   */
  static parseDate(text: string): DateInfo | undefined {
    const locale = RNLocalize.getLocales()[0];
    const localeKey = `${locale?.languageCode}-${locale?.countryCode}` || 'en-US';
    
    console.log(`📅 Parsing date with locale: ${localeKey}`);
    
    const patterns = this.DATE_PATTERNS_BY_LOCALE[localeKey] || 
                    this.DATE_PATTERNS_BY_LOCALE['en-US'];

    // Dil bazlı "son ödeme" anahtar kelimeleri
    const dueKeywords = this.getDueKeywords(locale?.languageCode || 'en');

    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern.regex));
      
      for (const match of matches) {
        const fullMatch = match[0];
        const index = match.index || 0;
        
        // "Son ödeme" kelimesine yakın mı kontrol et
        const surrounding = text.substring(Math.max(0, index - 50), index + 100);
        const isDueDate = dueKeywords.some(keyword => 
          surrounding.toLowerCase().includes(keyword.toLowerCase())
        );

        if (isDueDate || matches.length === 1) {
          const day = parseInt(match[pattern.order[0] + 1]);
          const month = parseInt(match[pattern.order[1] + 1]);
          const year = parseInt(match[pattern.order[2] + 1]);
          
          // Tarih validasyonu
          if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020) {
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
              console.log(`✅ Date found: ${date.toISOString().split('T')[0]} (${fullMatch})`);
              return {
                date,
                raw: fullMatch,
                format: pattern.format,
              };
            }
          }
        }
      }
    }

    console.log('❌ No valid date found in text');
    return undefined;
  }

  /**
   * Gelişmiş tutar parse (çoklu format desteği)
   */
  static parseAmountAdvanced(text: string, hint?: { currency?: Currency; country?: string }): Amount | undefined {
    // Hint ile birincil para birimini belirle
    const primaryCurrency = hint?.currency || this.getPrimaryCurrency(hint?.country || 'US');
    
    // Global currency pattern'ları (hint yoksa tüm para birimlerini dene)
    const globalPatterns: { [key in Currency]?: RegExp[] } = {
      [Currency.USD]: [
        /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
        /USD\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      ],
      [Currency.EUR]: [
        /€\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g,
        /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*€/g,
        /EUR\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g,
      ],
      [Currency.TRY]: [
        /₺\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g,
        /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*₺/g,
        /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*TL/g,
      ],
      [Currency.GBP]: [
        /£\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
        /GBP\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      ],
    };

    // Önce hint'teki para birimini dene
    if (hint?.currency && globalPatterns[hint.currency]) {
      const patterns = globalPatterns[hint.currency];
      if (patterns) {
        const result = this.tryParseWithPatterns(text, hint.currency, patterns);
        if (result) return result;
      }
    }

    // Sonra diğer para birimlerini dene
    for (const [currency, patterns] of Object.entries(globalPatterns)) {
      if (currency === hint?.currency) continue; // Zaten denendi
      
      if (patterns) {
        const result = this.tryParseWithPatterns(text, currency as Currency, patterns);
        if (result) return result;
      }
    }

    return undefined;
  }

  private static tryParseWithPatterns(text: string, currency: Currency, patterns: RegExp[]): Amount | undefined {
    for (const pattern of patterns) {
      pattern.lastIndex = 0; // Reset regex state
      const matches = Array.from(text.matchAll(pattern));
      
      if (matches.length > 0) {
        let maxAmount = 0;
        let bestMatch = '';

        for (const match of matches) {
          const amountStr = match[1] || match[2] || match[0];
          const numericAmount = this.parseNumericAmount(amountStr, 'auto');
          
          if (numericAmount > maxAmount) {
            maxAmount = numericAmount;
            bestMatch = amountStr;
          }
        }

        if (maxAmount > 0) {
          return {
            value: maxAmount,
            currency,
            raw: bestMatch,
          };
        }
      }
    }
    return undefined;
  }

  private static parseNumericAmount(amountStr: string, locale: string): number {
    const cleanAmount = amountStr.replace(/[^\d.,]/g, '');
    
    // Auto-detect decimal separator
    if (locale === 'auto') {
      // Eğer virgül sonuncuysa ve 2 haneli ise decimal separator
      if (/,\d{2}$/.test(cleanAmount)) {
        return parseFloat(cleanAmount.replace(/\./g, '').replace(',', '.'));
      }
      // Eğer nokta sonuncuysa ve 2 haneli ise decimal separator  
      else if (/\.\d{2}$/.test(cleanAmount)) {
        return parseFloat(cleanAmount.replace(/,/g, ''));
      }
      // Varsayılan: noktayı decimal olarak al
      else {
        return parseFloat(cleanAmount.replace(/,/g, ''));
      }
    }
    
    // Locale bazlı decimal ayırıcı
    if (locale.includes('DE') || locale.includes('TR')) {
      // Avrupa formatı: 1.234,56
      return parseFloat(cleanAmount.replace(/\./g, '').replace(',', '.'));
    } else {
      // ABD formatı: 1,234.56
      return parseFloat(cleanAmount.replace(/,/g, ''));
    }
  }

  private static getDueKeywords(languageCode: string): string[] {
    return this.DUE_KEYWORDS_BY_LANGUAGE[languageCode] || this.DUE_KEYWORDS_BY_LANGUAGE['en'];
  }

  private static getPrimaryCurrency(countryCode: string): Currency {
    return this.PRIMARY_CURRENCY_BY_COUNTRY[countryCode] || Currency.USD;
  }

  private static getDateFormatString(locale: string): string {
    if (locale.includes('US')) return 'MM/DD/YYYY';
    if (locale.includes('DE') || locale.includes('TR')) return 'DD.MM.YYYY';
    return 'DD/MM/YYYY';
  }

  /**
   * Utility: Format currency for display
   */
  static formatCurrency(amount: number, currency: Currency, locale?: string): string {
    const deviceLocale = locale || RNLocalize.getLocales()[0]?.languageTag || 'en-US';
    
    try {
      return new Intl.NumberFormat(deviceLocale, {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      const symbols: { [key: string]: string } = {
        [Currency.USD]: '$',
        [Currency.EUR]: '€',
        [Currency.GBP]: '£',
        [Currency.TRY]: '₺',
        [Currency.JPY]: '¥',
        [Currency.CHF]: 'CHF',
        [Currency.CAD]: 'C$',
        [Currency.AUD]: 'A$',
        [Currency.SEK]: 'kr',
        [Currency.NOK]: 'kr',
      };
      
      const symbol = symbols[currency] || currency;
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  /**
   * Utility: Format date for display
   */
  static formatDate(date: Date, locale?: string): string {
    const deviceLocale = locale || RNLocalize.getLocales()[0]?.languageTag || 'en-US';
    
    try {
      return date.toLocaleDateString(deviceLocale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (error) {
      // Fallback to ISO format
      return date.toISOString().split('T')[0];
    }
  }
} 