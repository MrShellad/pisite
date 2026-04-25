export interface SiteSettings {
  id: string;
  siteName: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  githubUrl: string;
  twitterUrl: string;
  discordUrl: string;
  contactEmail: string;
  copyright: string;
}

export interface ManagedFriendLink {
  id: string;
  name: string;
  href: string;
  enabled: boolean;
  sortOrder?: number;
}

export interface SiteSettingsFormData extends SiteSettings {
  friendLinks: ManagedFriendLink[];
}
