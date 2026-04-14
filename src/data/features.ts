export interface Feature {
  title: string;
  description: string;
  icon: string;
}

export const features: Feature[] = [
  // User-experience headliners
  {
    title: 'Direct Play Priority',
    description:
      'Plays your media directly whenever possible, avoiding unnecessary transcoding for the best quality and lowest server load.',
    icon: 'tabler:player-play',
  },
  {
    title: 'New On-Screen Display',
    description:
      'A redesigned OSD with chapter navigation, audio and subtitle track switching, and playback info all in one place.',
    icon: 'tabler:layout-dashboard',
  },
  {
    title: 'Media Segments (Intro Skipper)',
    description:
      'Automatically skip intros, outros, recaps, previews, and commercials detected by your Jellyfin server. Configurable per segment type.',
    icon: 'tabler:player-skip-forward',
  },
  {
    title: 'Trickplay Thumbnails',
    description:
      'Preview thumbnails while scrubbing through video, making it easy to find the exact moment you want.',
    icon: 'tabler:photo-scan',
  },
  {
    title: 'Cinema Mode',
    description:
      'Play custom intros before your movies and shows for an authentic theater experience at home.',
    icon: 'tabler:movie',
  },
  {
    title: 'Voice Search',
    description:
      'Use your Roku remote to search your library by voice, right from the home screen.',
    icon: 'tabler:microphone',
  },
  {
    title: 'Favorites Tab',
    description:
      'Quick access to your favorited movies, shows, and music directly from the home screen.',
    icon: 'tabler:star',
  },

  // Media support
  {
    title: 'Full Dolby Vision Support',
    description:
      'Enjoy Dolby Vision content on compatible Roku devices with full HDR metadata passthrough.',
    icon: 'tabler:video',
  },
  {
    title: 'Preserve Dolby Vision in MKV',
    description:
      'Keep Dolby Vision metadata intact when streaming MKV files, ensuring the best picture quality.',
    icon: 'tabler:file-check',
  },
  {
    title: 'Surround Sound Preservation',
    description:
      'Intelligent audio transcoding keeps your multichannel surround sound intact when the original codec needs conversion.',
    icon: 'tabler:speakerphone',
  },
  {
    title: 'Subtitle Support',
    description:
      'Full support for external and embedded subtitles including SRT, VTT, and ASS formats with custom rendering.',
    icon: 'tabler:text-caption',
  },
  {
    title: 'Music Playback',
    description:
      'Browse and play your music library with album art, artist info, and queue management.',
    icon: 'tabler:music',
  },
  {
    title: 'Chapter Navigation',
    description:
      'Jump between chapters during playback for quick navigation through movies and shows.',
    icon: 'tabler:list-numbers',
  },
  {
    title: 'Collections & Playlists',
    description:
      'Browse and play your curated collections and playlists organized in your Jellyfin library.',
    icon: 'tabler:playlist',
  },

  // Performance & architecture
  {
    title: 'Blazing Fast Performance',
    description:
      'Extensive under-the-hood optimizations make JellyRock noticeably faster than the original Roku client.',
    icon: 'tabler:rocket',
  },
  {
    title: 'Silky-Smooth UI',
    description:
      'All API requests moved off the render thread means the interface never stutters while loading data.',
    icon: 'tabler:device-desktop-analytics',
  },

  // Personalization
  {
    title: 'Unified Item Details',
    description:
      'One beautifully-designed details page for everything — movies, shows, seasons, episodes, music, and more.',
    icon: 'tabler:info-circle',
  },
  {
    title: '9 Built-in Themes',
    description:
      'Choose from JellyRock, Emerald, Ember, Rose, Ocean, Dusk, Midnight, High Contrast, and more.',
    icon: 'tabler:palette',
  },
  {
    title: 'Custom Themes',
    description:
      'Not feeling the built-ins? Build your own theme with any 6-digit hex colors for a fully personalized look.',
    icon: 'tabler:color-picker',
  },
  {
    title: 'Multi-User Support',
    description:
      'Switch between Jellyfin user profiles right from the home screen with avatar selection.',
    icon: 'tabler:users',
  },
  {
    title: 'Parental Controls',
    description:
      'Respect your Jellyfin server parental rating settings to keep content age-appropriate.',
    icon: 'tabler:shield-check',
  },

  // Internationalization
  {
    title: '99 Language Translations',
    description:
      'Custom translation system supports 99 languages, far beyond the ~12 languages supported by Roku OS and the official Jellyfin client.',
    icon: 'tabler:language',
  },
  {
    title: 'Self-Hosted Weblate',
    description:
      'Translations are managed through our own Weblate instance at translate.jellyrock.app — contribute in your language!',
    icon: 'tabler:world',
  },

  // Ethos
  {
    title: 'Free & Open Source',
    description:
      'No ads, no tracking, no subscriptions. Community-driven development with full transparency under GPL-2.0.',
    icon: 'tabler:heart-handshake',
  },
];

/** Number of features to show on the homepage */
export const HOMEPAGE_FEATURE_COUNT = 10;
