import { InvoiceType, Currency, Country } from '../types/Bill';
import * as RNLocalize from 'react-native-localize';

interface ClassificationKeywords {
  primary: string[];
  secondary: string[];
  companies: string[];
  patterns: RegExp[];
  negativeKeywords: string[];
}

interface ClassificationResult {
  type: InvoiceType;
  confidence: number;
  reasoning: string;
  companyName?: string;
  companyConfidence?: number;
}

export class AIBillClassifier {
  // Çok dilli ve geliştirilmiş anahtar kelime sözlükleri
  private static readonly CLASSIFICATION_RULES: { [key in InvoiceType]: ClassificationKeywords } = {
    [InvoiceType.ELECTRICITY]: {
      primary: [
        // Türkçe
        'elektrik', 'tedaş', 'elektrik tüketimi', 'kwh', 'enerji', 'güç',
        // İngilizce
        'electricity', 'electric', 'power', 'energy', 'kwh', 'kilowatt',
        // Almanca
        'strom', 'elektrizität', 'energie', 'kilowattstunde'
      ],
      secondary: [
        'fatura', 'bill', 'rechnung', 'tüketim', 'consumption', 'verbrauch',
        'meter', 'sayaç', 'zähler', 'watt', 'volt'
      ],
      companies: [
        'TEDAŞ', 'E.ON', 'RWE', 'VATTENFALL', 'ENEL', 'EDF', 'ENDESA',
        'PG&E', 'EDISON', 'ELECTRIC COMPANY', 'POWER COMPANY'
      ],
      patterns: [
        /(?:kw|kilowatt).?h/i,
        /(?:elektrik|electric|strom).{0,20}(?:fatura|bill|rechnung)/i,
        /(?:enerji|energy|energie).{0,20}(?:tüketim|consumption|verbrauch)/i
      ],
      negativeKeywords: ['su', 'water', 'wasser', 'gaz', 'gas', 'internet', 'telefon']
    },

    [InvoiceType.WATER]: {
      primary: [
        'su', 'water', 'wasser', 'iski', 'aqualogy', 'waterworks',
        'su faturası', 'water bill', 'wasserrechnung'
      ],
      secondary: [
        'tüketim', 'consumption', 'verbrauch', 'meter', 'sayaç', 'zähler',
        'municipal', 'belediye', 'stadtwerke'
      ],
      companies: [
        'İSKİ', 'SUSKI', 'AQUALOGY', 'WATERWORKS', 'MUNICIPAL WATER',
        'STADTWERKE', 'WATER AUTHORITY', 'WATER DISTRICT'
      ],
      patterns: [
        /(?:su|water|wasser).{0,20}(?:fatura|bill|rechnung)/i,
        /(?:m3|metre.?küp|cubic.?meter)/i,
        /water.?works/i
      ],
      negativeKeywords: ['elektrik', 'electric', 'strom', 'gaz', 'gas', 'telefon']
    },

    [InvoiceType.GAS]: {
      primary: [
        'doğalgaz', 'gaz', 'gas', 'erdgas', 'natural gas',
        'gaz faturası', 'gas bill', 'gasrechnung'
      ],
      secondary: [
        'tüketim', 'consumption', 'verbrauch', 'meter', 'sayaç', 'zähler',
        'm3', 'metreküp', 'cubic meter'
      ],
      companies: [
        'İGDAŞ', 'BOTAŞ', 'SHELL', 'BP', 'TOTAL', 'ENI',
        'GAZPROM', 'E.ON GAS', 'STADTWERKE'
      ],
      patterns: [
        /(?:doğal.?gaz|natural.?gas|erdgas)/i,
        /(?:gaz|gas).{0,20}(?:fatura|bill|rechnung)/i,
        /(?:m3|metre.?küp|cubic.?meter).{0,20}(?:gaz|gas)/i
      ],
      negativeKeywords: ['elektrik', 'electric', 'su', 'water', 'telefon']
    },

    [InvoiceType.INTERNET]: {
      primary: [
        'internet', 'broadband', 'wifi', 'fiber', 'adsl', 'vdsl',
        'internet faturası', 'internet bill', 'internetrechnung'
      ],
      secondary: [
        'mbps', 'gb', 'unlimited', 'sınırsız', 'unbegrenzt',
        'paket', 'package', 'paket', 'modem', 'router'
      ],
      companies: [
        'TÜRK TELEKOM', 'VODAFONE', 'TURKCELL', 'SUPERONLINE',
        'TELEKOM', 'COMCAST', 'VERIZON', 'AT&T', 'ORANGE'
      ],
      patterns: [
        /(?:internet|broadband|fiber|adsl).{0,20}(?:fatura|bill|rechnung)/i,
        /(?:\d+).?(?:mbps|gb)/i,
        /wifi|wi-fi/i
      ],
      negativeKeywords: ['elektrik', 'su', 'gaz', 'kredi', 'credit']
    },

    [InvoiceType.PHONE]: {
      primary: [
        'telefon', 'phone', 'mobile', 'cellular', 'gsm',
        'telefon faturası', 'phone bill', 'telefonrechnung'
      ],
      secondary: [
        'dakika', 'minutes', 'minuten', 'sms', 'mms', 'data',
        'hat', 'line', 'nummer', 'arama', 'calls', 'anrufe'
      ],
      companies: [
        'TURKCELL', 'VODAFONE', 'TÜRK TELEKOM', 'TELEKOM',
        'VERIZON', 'AT&T', 'T-MOBILE', 'ORANGE', 'O2'
      ],
      patterns: [
        /(?:telefon|phone|mobile).{0,20}(?:fatura|bill|rechnung)/i,
        /(?:\d+).?(?:dakika|minutes|minuten)/i,
        /gsm|cellular/i
      ],
      negativeKeywords: ['internet', 'elektrik', 'su', 'gaz']
    },

    [InvoiceType.CABLE]: {
      primary: [
        'kablo', 'cable', 'tv', 'satellite', 'uydu',
        'kablo tv', 'cable tv', 'kabelfernsehen'
      ],
      secondary: [
        'kanal', 'channels', 'kanäle', 'broadcast', 'yayın',
        'digital', 'hd', '4k', 'premium'
      ],
      companies: [
        'DIGITURK', 'TIVIBU', 'DSAT', 'COMCAST', 'SPECTRUM',
        'SKY', 'CANAL+', 'ZIGGO'
      ],
      patterns: [
        /(?:kablo|cable).?(?:tv|television)/i,
        /(?:uydu|satellite)/i,
        /(?:kanal|channels|kanäle).{0,20}(?:paket|package)/i
      ],
      negativeKeywords: ['internet', 'telefon', 'elektrik']
    },

    [InvoiceType.INSURANCE]: {
      primary: [
        'sigorta', 'insurance', 'versicherung', 'poliçe', 'policy',
        'sigorta faturası', 'insurance bill', 'versicherungsrechnung'
      ],
      secondary: [
        'prim', 'premium', 'prämie', 'kasko', 'dask', 'hayat',
        'sağlık', 'health', 'gesundheit', 'auto', 'car'
      ],
      companies: [
        'AXA', 'ALLIANZ', 'ZURICH', 'MAPFRE', 'AKSIGORTA',
        'ANADOLU SIGORTA', 'ALLIANZ TÜRKIYE'
      ],
      patterns: [
        /(?:sigorta|insurance|versicherung).{0,20}(?:fatura|bill|rechnung)/i,
        /(?:prim|premium|prämie)/i,
        /(?:poliçe|policy)/i
      ],
      negativeKeywords: ['elektrik', 'su', 'gaz', 'telefon']
    },

    [InvoiceType.RENT]: {
      primary: [
        'kira', 'rent', 'miete', 'rental', 'lease',
        'kira faturası', 'rent bill', 'mietrechnung'
      ],
      secondary: [
        'apartment', 'daire', 'wohnung', 'ev', 'house', 'haus',
        'aylık', 'monthly', 'monatlich', 'deposit', 'kaution'
      ],
      companies: [
        'REAL ESTATE', 'PROPERTY', 'EMLAK', 'IMMOBILIEN',
        'PROPERTY MANAGEMENT', 'ESTATE AGENCY'
      ],
      patterns: [
        /(?:kira|rent|miete).{0,20}(?:fatura|bill|rechnung)/i,
        /(?:apartment|daire|wohnung)/i,
        /(?:monthly|aylık|monatlich).{0,20}(?:rent|kira|miete)/i
      ],
      negativeKeywords: ['elektrik', 'su', 'telefon', 'internet']
    },

    [InvoiceType.CREDIT_CARD]: {
      primary: [
        'kredi kartı', 'credit card', 'kreditkarte', 'visa', 'mastercard',
        'kredi kartı faturası', 'credit card bill', 'kreditkartenrechnung'
      ],
      secondary: [
        'limit', 'minimum', 'payment', 'ödeme', 'zahlung',
        'balance', 'bakiye', 'saldo', 'interest', 'faiz'
      ],
      companies: [
        'AKBANK', 'GARANTI', 'İŞ BANKASI', 'YAPIKRED',
        'CHASE', 'WELLS FARGO', 'DEUTSCHE BANK', 'COMMERZBANK'
      ],
      patterns: [
        /(?:kredi.?kart|credit.?card|kreditkarte)/i,
        /(?:visa|mastercard|american.?express)/i,
        /(?:minimum.?payment|minimum.?ödeme)/i
      ],
      negativeKeywords: ['elektrik', 'su', 'gaz', 'internet']
    },

    [InvoiceType.UNKNOWN]: {
      primary: [],
      secondary: [],
      companies: [],
      patterns: [],
      negativeKeywords: []
    }
  };

  /**
   * Gelişmiş AI fatura sınıflandırması
   */
  static async classifyBill(
    text: string, 
    context?: { 
      currency?: Currency; 
      country?: Country; 
      companyHint?: string;
      amountHint?: number;
    }
  ): Promise<ClassificationResult> {
    console.log('🤖 AI Bill Classification started...');
    
    const normalizedText = this.normalizeText(text);
    const scores: { [key in InvoiceType]: number } = {} as any;
    let bestCompany: { name: string; confidence: number } | undefined;

    // Her fatura türü için skor hesapla
    for (const [type, rules] of Object.entries(this.CLASSIFICATION_RULES) as [InvoiceType, ClassificationKeywords][]) {
      const score = this.calculateTypeScore(normalizedText, rules, context);
      scores[type] = score.score;
      
      // En iyi şirket eşleşmesini takip et
      if (score.companyMatch && (!bestCompany || score.companyMatch.confidence > bestCompany.confidence)) {
        bestCompany = score.companyMatch;
      }
    }

    // En yüksek skoru bul
    const bestType = Object.entries(scores).reduce((a, b) => scores[a[0] as InvoiceType] > scores[b[0] as InvoiceType] ? a : b)[0] as InvoiceType;
    const confidence = scores[bestType];

    // Sınıflandırma gerekçesi oluştur
    const reasoning = this.generateReasoning(bestType, confidence, normalizedText, context);

    console.log(`✅ Classification: ${bestType} (${Math.round(confidence * 100)}%)`);
    console.log(`📝 Reasoning: ${reasoning}`);

    return {
      type: bestType,
      confidence,
      reasoning,
      companyName: bestCompany?.name,
      companyConfidence: bestCompany?.confidence,
    };
  }

  private static calculateTypeScore(
    text: string, 
    rules: ClassificationKeywords, 
    context?: any
  ): { score: number; companyMatch?: { name: string; confidence: number } } {
    let score = 0;
    let companyMatch: { name: string; confidence: number } | undefined;

    // Primary keywords (yüksek ağırlık)
    const primaryMatches = rules.primary.filter(keyword => 
      text.includes(keyword.toLowerCase())
    ).length;
    score += primaryMatches * 0.4;

    // Secondary keywords (orta ağırlık)
    const secondaryMatches = rules.secondary.filter(keyword => 
      text.includes(keyword.toLowerCase())
    ).length;
    score += secondaryMatches * 0.2;

    // Pattern matches (yüksek ağırlık)
    const patternMatches = rules.patterns.filter(pattern => 
      pattern.test(text)
    ).length;
    score += patternMatches * 0.3;

    // Company name matches (çok yüksek ağırlık)
    for (const company of rules.companies) {
      if (text.includes(company.toLowerCase())) {
        score += 0.5;
        companyMatch = { name: company, confidence: 0.9 };
        break; // İlk eşleşmeyi al
      }
    }

    // Negative keywords (skor düşürme)
    const negativeMatches = rules.negativeKeywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    ).length;
    score -= negativeMatches * 0.3;

    // Context-based boost
    if (context) {
      score += this.calculateContextBoost(rules, context);
    }

    // Normalize score
    score = Math.max(0, Math.min(score, 1.0));

    return { score, companyMatch };
  }

  private static calculateContextBoost(rules: ClassificationKeywords, context: any): number {
    let boost = 0;

    // Currency-based hints
    if (context.currency) {
      // Örneğin: TRY para birimi varsa Türk şirketlerine boost
      if (context.currency === Currency.TRY) {
        const turkishCompanies = ['TEDAŞ', 'İGDAŞ', 'İSKİ', 'TURKCELL', 'VODAFONE'];
        if (rules.companies.some(company => turkishCompanies.includes(company))) {
          boost += 0.1;
        }
      }
    }

    // Amount-based hints
    if (context.amountHint) {
      // Yüksek tutarlar genellikle elektrik/gaz faturalarıdır
      if (context.amountHint > 100 && 
          [InvoiceType.ELECTRICITY, InvoiceType.GAS].includes(rules as any)) {
        boost += 0.05;
      }
    }

    // Country-based hints
    if (context.country) {
      // Ülke bazlı şirket eşleşmeleri
      const countryCompanies = this.getCountryCompanies(context.country);
      if (rules.companies.some(company => countryCompanies.includes(company))) {
        boost += 0.1;
      }
    }

    return boost;
  }

  private static getCountryCompanies(country: Country): string[] {
    const countryMappings: { [key in Country]?: string[] } = {
      [Country.TR]: ['TEDAŞ', 'İGDAŞ', 'İSKİ', 'TURKCELL', 'VODAFONE', 'TÜRK TELEKOM'],
      [Country.DE]: ['E.ON', 'RWE', 'VATTENFALL', 'TELEKOM', 'STADTWERKE'],
      [Country.US]: ['VERIZON', 'AT&T', 'COMCAST', 'PG&E', 'EDISON'],
      [Country.UK]: ['BT', 'SKY', 'BRITISH GAS', 'EDF ENERGY'],
    };

    return countryMappings[country] || [];
  }

  private static generateReasoning(
    type: InvoiceType, 
    confidence: number, 
    text: string, 
    context?: any
  ): string {
    const rules = this.CLASSIFICATION_RULES[type];
    const foundKeywords = rules.primary.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    const foundCompanies = rules.companies.filter(company => 
      text.includes(company.toLowerCase())
    );

    let reasoning = `Classified as ${type}`;
    
    if (foundKeywords.length > 0) {
      reasoning += ` due to keywords: ${foundKeywords.slice(0, 3).join(', ')}`;
    }
    
    if (foundCompanies.length > 0) {
      reasoning += ` and company: ${foundCompanies[0]}`;
    }

    if (context?.currency) {
      reasoning += ` (Currency: ${context.currency})`;
    }

    reasoning += `. Confidence: ${Math.round(confidence * 100)}%`;

    return reasoning;
  }

  private static normalizeText(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Şirket adı çıkarma (gelişmiş)
   */
  static extractCompanyName(text: string, type?: InvoiceType): { name: string; confidence: number } | undefined {
    const normalizedText = this.normalizeText(text);
    
    // Eğer tür biliniyorsa, o türe özel şirketleri öncelikle kontrol et
    if (type) {
      const rules = this.CLASSIFICATION_RULES[type];
      for (const company of rules.companies) {
        if (normalizedText.includes(company.toLowerCase())) {
          return { name: company, confidence: 0.95 };
        }
      }
    }

    // Genel şirket pattern'ları
    const companyPatterns = [
      /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+ (?:Ltd|Inc|Corp|Company|Şirketi|GmbH|AG))/g,
      /([A-ZÇĞİÖŞÜ]{2,}(?:\s+[A-ZÇĞİÖŞÜ]{2,})*)/g, // All caps words
    ];

    for (const pattern of companyPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // En uzun eşleşmeyi al (genellikle tam şirket adı)
        const longestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
        return { name: longestMatch.trim(), confidence: 0.7 };
      }
    }

    return undefined;
  }

  /**
   * Güven skoru kalibrasyon
   */
  static calibrateConfidence(
    confidence: number, 
    hasAmount: boolean, 
    hasDate: boolean, 
    hasCompany: boolean
  ): number {
    let calibrated = confidence;

    // Eksik bilgiler için skor düşür
    if (!hasAmount) calibrated *= 0.8;
    if (!hasDate) calibrated *= 0.9;
    if (!hasCompany) calibrated *= 0.85;

    // Minimum güven seviyesi
    calibrated = Math.max(calibrated, 0.1);

    return Math.min(calibrated, 0.98); // Maximum %98 güven
  }
} 