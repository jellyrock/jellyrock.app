export interface Feature {
  title: string;
  description: string;
  icon: string;
}

export const features: Feature[] = [
  {
    title: 'Direct Play Priority',
    description:
      'Plays your media directly whenever possible, avoiding unnecessary transcoding for the best quality and lowest server load.',
    icon: 'tabler:player-play',
  },
  {
    title: 'Blazing Fast & Silky Smooth',
    description:
      'Extensive optimizations make JellyRock noticeably faster than the original Roku client, and moving all API requests off the render thread means the interface never stutters while loading data.',
    icon: 'tabler:rocket',
  },
  {
    title: 'Full Dolby Vision Support',
    description:
      'Watch Dolby Vision content on compatible Roku devices. MKV files are automatically repackaged on the fly so Dolby Vision keeps working, no re-encoding required.',
    icon: 'tabler:video',
  },
  {
    title: 'New On-Screen Display',
    description:
      'A redesigned OSD with chapter navigation, video/audio/subtitle track switching, and playback info all in one place.',
    icon: 'tabler:layout-dashboard',
  },
  {
    title: 'Favorites Tab',
    description:
      'Quick access to all your favorited content — every media type JellyRock supports — directly from the home screen.',
    icon: 'tabler:star',
  },
  {
    title: 'Live TV & DVR',
    description:
      'Browse the channel guide, tune in live, and schedule recordings of upcoming programs without leaving JellyRock.',
    icon: 'tabler:device-tv',
  },
  {
    title: 'Surround Sound Preservation',
    description:
      'Intelligent audio transcoding keeps your multichannel surround sound intact when the original codec needs conversion.',
    icon: 'tabler:speakerphone',
  },

  {
    title: 'Unified Item Details',
    description:
      'One beautifully-designed details page for everything — movies, shows, seasons, episodes, music, and more.',
    icon: 'tabler:info-circle',
  },
  {
    title: 'Themes for Every Taste',
    description:
      'Pick from 9 built-in themes — JellyRock, JellyRock (Black), Emerald, Ember, Rose, Ocean, Dusk, Midnight, and High Contrast — or build your own with any 6-digit hex colors.',
    icon: 'tabler:palette',
  },
  {
    title: '99 Language Translations',
    description:
      'Custom translation system supports 99 languages, far beyond the ~12 languages supported by Roku OS and the official Jellyfin client.',
    icon: 'tabler:language',
  },
  {
    title: 'Media Segments (Intro Skipper)',
    description:
      'Automatically skip intros, outros, recaps, previews, and commercials detected by your Jellyfin server. Configurable per segment type.',
    icon: 'tabler:player-skip-forward',
  },
  {
    title: 'Trickplay Thumbnails',
    description: 'Preview thumbnails while scrubbing through video, making it easy to find the exact moment you want.',
    icon: 'tabler:photo-scan',
  },
  {
    title: 'Self-Hosted Weblate',
    description:
      'Translations are managed through our own Weblate instance at translate.jellyrock.app — contribute in your language!',
    icon: 'tabler:world',
  },
  {
    title: 'Free & Open Source',
    description:
      'No ads, no tracking, no subscriptions. Community-driven development with full transparency under GPL-2.0.',
    icon: 'tabler:heart-handshake',
  },
];

/** Number of features to show on the homepage */
export const HOMEPAGE_FEATURE_COUNT = 6;
