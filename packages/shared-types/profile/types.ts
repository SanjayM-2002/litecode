import type { Gender } from './gender';

export interface IParticipantProfile {
  id: string;
  gender: Gender | null;
  birthday: Date | null;
  bio: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  skills: string[];
  coins: number;
  rating: number;
  isPremium: boolean;
  premiumUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
