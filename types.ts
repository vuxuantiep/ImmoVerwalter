
export enum SubscriptionTier {
  FREE = 'Free',
  STANDARD = 'Standard',
  ENTERPRISE = 'Enterprise'
}

export interface User {
  id: string;
  name: string;
  email: string;
  tier: SubscriptionTier;
  avatarUrl?: string;
}

export enum HouseType {
  DETACHED = 'Einfamilienhaus',
  SEMI_DETACHED = 'Doppelhaushälfte',
  APARTMENT_BLOCK = 'Mehrfamilienhaus',
  CONDO = 'Eigentumswohnung'
}

export enum UnitType {
  RESIDENTIAL = 'Wohnung',
  COMMERCIAL = 'Gewerbe'
}

export enum MeterType {
  ELECTRICITY = 'Strom',
  GAS = 'Gas',
  WATER = 'Wasser'
}

export enum ReminderCategory {
  METER = 'Zählerablesung',
  HANDYMAN = 'Handwerker-Termin',
  TAX = 'Steuererklärung',
  LOAN_EXPIRY = 'Darlehensauslauf',
  OTHER = 'Sonstiges'
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  content: string; 
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  category: ReminderCategory;
  isDone: boolean;
  propertyId?: string;
  recipientEmail?: string;
}

export interface MarketData {
  averageRentPerM2: number;
  averageSalePerM2: number;
  marketTrend: 'rising' | 'stable' | 'falling';
  summary: string;
  sources: { title: string; uri: string }[];
}

export interface MeterReading {
  id: string;
  type: MeterType;
  value: number;
  unit: string;
  serialNumber?: string;
  date: string;
  imageUrl?: string;
}

export interface ContractAnalysis {
  leaseStart?: string;
  leaseEnd?: string;
  rentAmount?: string;
  noticePeriod?: string;
  unusualClauses: string[];
  risks: string[];
  summary: string;
}

export interface PropertyDocument {
  id: string;
  name: string;
  category: string; 
  uploadDate: string;
  fileSize: string;
  fileData: string; 
  mimeType: string;
  analysis?: ContractAnalysis;
}

export interface Unit {
  id: string;
  number: string;
  type: UnitType;
  size: number;
  rooms?: number;
  floor?: string;
  baseRent: number;
  utilityPrepayment: number;
  tenantId?: string;
  imageUrl?: string;
  documents?: PropertyDocument[];
  meterReadings?: MeterReading[];
  isVatSubject?: boolean; 
}

export interface Loan {
  id: string;
  bankName: string;
  totalAmount: number;
  currentBalance: number;
  interestRate: number;
  repaymentRate: number;
  fixedUntil: string;
  monthlyInstallment: number;
}

export interface Property {
  id: string;
  name: string;
  type: HouseType;
  address: string;
  ownerId?: string; 
  
  yearBuilt?: number;
  plotSize?: number;
  livingSpace?: number;
  heatingType?: string;
  energyClass?: string;
  
  purchasePrice?: number;
  purchaseDate?: string;
  ancillaryCosts?: number; 
  
  units: Unit[];
  loans?: Loan[];
  documents?: PropertyDocument[];
  meterReadings?: MeterReading[];
  marketAnalysis?: MarketData;
}

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  startDate: string;
}

export enum TransactionType {
  INCOME = 'Einnahme',
  EXPENSE = 'Ausgabe'
}

export interface Transaction {
  id: string;
  propertyId: string;
  unitId?: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  description: string;
  isUtilityRelevant?: boolean; 
}

export interface Handyman {
  id: string;
  name: string;
  company?: string;
  trade: string;
  phone: string;
  email: string;
  address?: string;
  zip?: string;
  city?: string;
}

export interface Owner {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  address: string;
  zip: string;
  city: string;
  taxId?: string;
  vatId?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string; 
  email: string;
  phone: string;
  address?: string;
  note?: string;
}

export type View = 'dashboard' | 'properties' | 'tenants' | 'finances' | 'contacts' | 'tools' | 'investor';
