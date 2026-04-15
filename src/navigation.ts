import { getPermalink } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Install',
      href: getPermalink('/install'),
    },
    {
      text: 'Features',
      href: getPermalink('/features'),
    },
    {
      text: 'Screenshots',
      href: getPermalink('/screenshots'),
    },
    {
      text: 'Documentation',
      href: 'https://docs.jellyrock.app',
    },
  ],
  actions: [
    {
      variant: 'donate',
      text: 'Donate',
      href: getPermalink('/donate'),
      icon: 'tabler:heart',
    },
  ],
};

export const footerData = {
  links: [
    {
      title: 'Project',
      links: [
        { text: 'Install', href: getPermalink('/install') },
        { text: 'Features', href: getPermalink('/features') },
        { text: 'Screenshots', href: getPermalink('/screenshots') },
        { text: 'Status', href: 'https://uptime.jellyrock.app' },
      ],
    },
    {
      title: 'Documentation',
      links: [
        { text: 'User Docs', href: 'https://docs.jellyrock.app' },
        { text: 'Dev Guide', href: 'https://dev.jellyrock.app' },
        { text: 'API Reference', href: 'https://api.jellyrock.app' },
      ],
    },
    {
      title: 'Community',
      links: [
        { text: 'Contact', href: getPermalink('/contact') },
        { text: 'GitHub', href: 'https://github.com/jellyrock/jellyrock' },
        { text: 'Matrix Chat', href: 'https://matrix.to/#/#jellyrock-app:matrix.org' },
        { text: 'Translate', href: 'https://translate.jellyrock.app' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { text: 'Privacy Policy', href: getPermalink('/privacy') },
        { text: 'Terms of Use', href: getPermalink('/terms') },
      ],
    },
  ],
  secondaryLinks: [],
  socialLinks: [{ ariaLabel: 'GitHub', icon: 'tabler:brand-github', href: 'https://github.com/jellyrock/jellyrock' }],
  footNote: `
    The <a class="dark:text-muted underline" href="https://github.com/jellyrock/jellyrock">JellyRock Roku app</a>
    is free and open source, licensed under GPL-2.0.
  `,
};
