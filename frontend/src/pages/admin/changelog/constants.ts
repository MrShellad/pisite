import type { ChangeDraft, PlatformKey, PublishForm } from './types';

export const PRESET_ICONS = [
  {
    name: 'Feature',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    color: '#3b82f6',
  },
  {
    name: 'Bugfix',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/></svg>',
    color: '#ef4444',
  },
  {
    name: 'Performance',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    color: '#eab308',
  },
  {
    name: 'Security',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    color: '#10b981',
  },
  {
    name: 'UI/UX',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    color: '#8b5cf6',
  },
];

export const platformLabels: Record<PlatformKey, string> = {
  darwin: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

export const emptyChange: ChangeDraft = {
  iconSvg: PRESET_ICONS[0].svg,
  iconColor: PRESET_ICONS[0].color,
  text: '',
};

export const createInitialForm = (): PublishForm => ({
  versionId: '',
  displayVersion: '',
  date: new Date().toISOString().slice(0, 10),
  channel: 'stable',
  rolloutType: 'all',
  rolloutValue: '',
  allowedRegions: 'ALL',
  platforms: {
    darwin: { url: '', signature: '' },
    windows: { url: '', signature: '' },
    linux: { url: '', signature: '' },
  },
  changes: [{ ...emptyChange }],
});
