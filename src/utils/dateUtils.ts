import * as RNLocalize from 'react-native-localize';

export class DateUtils {
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

  static formatCurrency(amount: number, currency: string, locale?: string): string {
    const deviceLocale = locale || RNLocalize.getLocales()[0]?.languageTag || 'en-US';
    
    try {
      return new Intl.NumberFormat(deviceLocale, {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      const symbols: { [key: string]: string } = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'TRY': '₺',
        'JPY': '¥',
        'CHF': 'CHF',
        'CAD': 'C$',
        'AUD': 'A$',
        'SEK': 'kr',
        'NOK': 'kr',
      };
      
      const symbol = symbols[currency] || currency;
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  static isDateInFuture(date: Date): boolean {
    return date > new Date();
  }

  static getDaysUntilDue(dueDate: Date): number {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
} 