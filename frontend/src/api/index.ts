// frontend/src/api/index.ts
import type { Sponsor, FriendLink, ChangelogEntry } from '../types';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL ?? '/api') as string;


export const getSponsors = async (): Promise<Sponsor[]> => {
  const response = await fetch(`${API_BASE_URL}/sponsors`);
  if (!response.ok) {
    throw new Error('网络请求失败');
  }
  return response.json();
};

export const getFriends = async (): Promise<FriendLink[]> => {
  const res = await fetch(`${API_BASE_URL}/friends`);
  if (!res.ok) throw new Error('网络请求失败');
  return res.json();
};

export const getChangelog = async (): Promise<ChangelogEntry[]> => {
  const res = await fetch(`${API_BASE_URL}/changelog`);
  if (!res.ok) throw new Error('网络请求失败');
  return res.json();
};