export type PlatformKey = 'darwin' | 'windows' | 'linux';
export type ReleaseChannel = 'stable' | 'preview' | 'beta';
export type RolloutType = 'all' | 'grayscale' | 'targeted';

export type PlatformAsset = {
  url: string;
  signature: string;
};

export type ChangeDraft = {
  iconSvg: string;
  iconColor: string;
  text: string;
};

export type PublishForm = {
  versionId: string;
  displayVersion: string;
  date: string;
  channel: ReleaseChannel;
  rolloutType: RolloutType;
  rolloutValue: string;
  allowedRegions: string;
  platforms: Record<PlatformKey, PlatformAsset>;
  changes: ChangeDraft[];
};

export type ReleaseLog = {
  id: string;
  version: string;
  versionId?: string;
  displayVersion?: string;
  date: string;
  channel: string;
  rolloutType: string;
  rolloutValue: string;
  allowedRegions?: string;
  status: string;
  changes: ChangeDraft[];
  platforms?: Partial<Record<PlatformKey, Partial<PlatformAsset>>>;
};

export type PackageAsset = {
  date: string;
  fileName: string;
  sizeBytes: number;
  url: string;
  downloadUrl: string;
  uploadedAt?: number | null;
};

export type UploadProgressState = {
  title: string;
  fileName: string;
  loaded: number;
  total: number;
  percent: number;
};
