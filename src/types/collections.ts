import { Rarity, BaseAsset } from './assets';

export type CardStatus = 'FREE' | 'ACTIVE' | 'EXHAUSTED' | 'SYNTHESIZING';

export type CardElement =
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'abyss'
  | 'nature'
  | 'dark'
  | 'light'
  | 'astral'
  | 'celestial'
  | 'arcane'
  | 'water'
  | 'earth'
  | 'wind'
  | 'lunar'
  | 'solar'
  | 'void'
  | 'cosmic';

export interface CardTemplate {
  templateId: string;
  name: string;
  element: CardElement;
  elementIcon: string;
  description: string;
  image: string;
  rarity: Rarity;
  collectionId: string;
  synthesisRate: number; // NEX/hour
  synthesisCap: number;  // Max NEX generated
  marketValue: number;   // Suggested market value in NXA
}

export interface Card extends BaseAsset {
  type: 'Card';
  templateId: string;
  collectionId: string;
  collectionName: string;
  element: CardElement;
  elementIcon: string;
  cardStatus: CardStatus; // FREE | ACTIVE | EXHAUSTED
  synthesisRate: number;  // NEX/h
  synthesisCap: number;   // Max NEX it can generate
  totalGenerated: number; // Total NEX collected so far
  marketValue: number;    // Estimated value
  tradeable: boolean;     // Only true if cardStatus === 'FREE' and status === 'IDLE'
  synthesizable: boolean; // Only true if cardStatus === 'FREE'
  synthesizedAt?: string;
  synthesisStartedAt?: string;
  lastClaimedAt?: string;
  simulatedTimeOffsetMs?: number; // Optional offset for fast-forward testing
}

export interface CardCollection {
  id: string;
  name: string;
  tagline: string;
  description: string;
  bannerImage: string;
  themeIcon?: string;
  cardTemplates: CardTemplate[];
  rewardBoxName: string;
  rewardDescription: string;
  rewardDetails?: string;
}

export interface CardFragment {
  id: string;
  templateId: string;
  cardName: string;
  cardRarity: Rarity;
  cardImage: string;
  collectionId: string;
  amount: number;
  ownerId: string;
  maxRequired: number; // Default 100
  updatedAt: string;
}

export interface SynthesisProductionStatus {
  cardId: string;
  cardStatus: CardStatus;
  ratePerHour: number;
  totalGenerated: number;
  synthesisCap: number;
  unclaimedAmount: number;
  projectedTotal: number;
  isExhausted: boolean;
  hoursElapsed: number;
  estimatedHoursToCap: number;
  progressPercentage: number;
}

export interface CollectionBoxOpenResult {
  boxName: string;
  isDuplicate: boolean;
  cardTemplate: CardTemplate;
  awardedCard?: Card;
  awardedFragments?: number;
  nexBonus: number;
}
