import { useEffect, useState } from 'react';
import { Github, Mail, MessageSquare, Twitter, Zap } from 'lucide-react';

import { api } from '../api/client';
import { styleTokens } from '../lib/design-tokens';
import { useHomeLocale } from '../lib/home-i18n';

export default function Footer() {
  const { copy } = useHomeLocale();
  const [settings, setSettings] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    api.get('/settings').then(res => setSettings(res.data)).catch(console.error);
    api.get('/friends').then(res => setFriends(res.data)).catch(() => setFriends([]));
  }, []);

  if (!settings) return null;

  return (
    <footer className="mt-20 border-t-2 border-neutral-200/50 bg-white/30 backdrop-blur-md transition-colors duration-500 dark:border-neutral-800/50 dark:bg-neutral-950/30">
      <div className="mx-auto max-w-5xl px-6 pb-8 pt-16">
        <div className="mb-16 flex flex-col justify-between gap-12 md:flex-row md:gap-8">
          <div className="max-w-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-lime-500 p-1.5 text-white drop-shadow-sm">
                <Zap size={18} strokeWidth={2.5} />
              </div>
              <span className={`text-xl font-black tracking-tight ${styleTokens.textPrimary}`}>
                {settings.siteName}
              </span>
            </div>

            <p className={`text-sm leading-relaxed ${styleTokens.textSecondary}`}>
              {settings.seoDescription}
            </p>

            <div className="flex items-center gap-4 pt-2">
              {settings.githubUrl ? (
                <a
                  href={settings.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-full text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white ${styleTokens.focusRing}`}
                  aria-label="GitHub"
                >
                  <Github size={20} />
                </a>
              ) : null}
              {settings.twitterUrl ? (
                <a
                  href={settings.twitterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-full text-neutral-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-300 ${styleTokens.focusRing}`}
                  aria-label="Twitter"
                >
                  <Twitter size={20} />
                </a>
              ) : null}
              {settings.discordUrl ? (
                <a
                  href={settings.discordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-full text-neutral-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-300 ${styleTokens.focusRing}`}
                  aria-label="Discord"
                >
                  <MessageSquare size={20} />
                </a>
              ) : null}
              {settings.contactEmail ? (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className={`rounded-full text-neutral-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-300 ${styleTokens.focusRing}`}
                  aria-label="Email"
                >
                  <Mail size={20} />
                </a>
              ) : null}
            </div>
          </div>

          <div className="md:min-w-[150px]">
            <h4 className={`mb-4 font-semibold tracking-wider ${styleTokens.textPrimary}`}>
              {copy.footer.friendLinks}
            </h4>
            <ul className="space-y-3">
              {friends.length === 0 ? (
                <li className={`text-sm ${styleTokens.textSecondary}`}>{copy.footer.noFriends}</li>
              ) : (
                friends.map(link => (
                  <li key={link.id || link.name}>
                    <a
                      href={link.url || link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`rounded-sm text-sm font-medium ${styleTokens.textSecondary} transition-colors hover:text-emerald-600 dark:hover:text-emerald-300 ${styleTokens.focusRing}`}
                    >
                      {link.name}
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div
          className={`flex flex-col items-center justify-between gap-4 border-t border-neutral-200/50 pt-8 text-xs font-mono ${styleTokens.textSecondary} dark:border-neutral-800/50 md:flex-row`}
        >
          <p>{settings.copyright}</p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className={`rounded-sm transition-colors hover:text-neutral-800 dark:hover:text-neutral-200 ${styleTokens.focusRing}`}
            >
              {copy.footer.privacyPolicy}
            </a>
            <a
              href="#"
              className={`rounded-sm transition-colors hover:text-neutral-800 dark:hover:text-neutral-200 ${styleTokens.focusRing}`}
            >
              {copy.footer.termsOfService}
            </a>
            <span className="ml-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {copy.footer.allSystemsNormal}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
