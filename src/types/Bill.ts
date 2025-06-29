export enum InvoiceType {
  ELECTRICITY = 'electricity',
  WATER = 'water',
  GAS = 'gas',
  INTERNET = 'internet',
  PHONE = 'phone',
  CABLE = 'cable',
  INSURANCE = 'insurance',
  RENT = 'rent',
  CREDIT_CARD = 'credit_card',
  UNKNOWN = 'unknown'
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  TRY = 'TRY',
  CAD = 'CAD',
  AUD = 'AUD',
  JPY = 'JPY',
  CHF = 'CHF',
  SEK = 'SEK',
  NOK = 'NOK'
}

export enum Country {
  US = 'US',
  UK = 'UK',
  DE = 'DE',
  FR = 'FR',
  ES = 'ES',
  IT = 'IT',
  TR = 'TR',
  CA = 'CA',
  AU = 'AU',
  JP = 'JP',
  CH = 'CH',
  SE = 'SE',
  NO = 'NO'
}

export interface Amount {
  value: number;
  currency: Currency;
  raw: string;
}

export interface DateInfo {
  date?: Date;
  raw: string;
  format?: string;
}

export interface BillData {
  id: string;
  type: InvoiceType;
  amount?: Amount;
  dueDate?: DateInfo;
  company?: string;
  accountNumber?: string;
  confidence: number;
  ocrText: string;
  imageUri: string;
  createdAt: Date;
}

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: TextBlock[];
}

export interface TextBlock {
  text: string;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface AnalysisResult {
  type: InvoiceType;
  amount?: Amount;
  dueDate?: DateInfo;
  company?: string;
  confidence: number;
} 