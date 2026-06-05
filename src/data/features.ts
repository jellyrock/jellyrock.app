export interface Feature {
  title: string;
  description: string;
  icon: string;
}

export const features: Feature[] = [
  {
    title: 'Blazing Fast & Silky Smooth',
    description:
      'Heavily optimized to outpace the original Roku client. Every API request runs off the render thread, so menus stay fluid and the interface never stutters while data loads.',
    icon: 'tabler:rocket',
  },
  {
    title: 'Works With Your Server',
    description:
      'Connect to any Jellyfin server from 10.7 to the latest release. JellyRock finds servers across your network and remembers each one, so switching is effortless.',
    icon: 'tabler:server-cog',
  },
  {
    title: 'Direct Play Priority',
    description:
      'Plays your media in its original quality whenever your device supports it, skipping needless transcoding. The result is pristine playback and a lighter load on your server.',
    icon: 'tabler:player-play',
  },
  {
    title: 'Surround Sound Preservation',
    description:
      'Keeps your multichannel surround intact. When a track must be converted, JellyRock steers the server toward surround-capable codecs instead of flattening it to stereo.',
    icon: 'tabler:speakerphone',
  },
  {
    title: 'Improved OSD',
    description:
      'A ground-up redesign of the playback overlay. Navigate chapters, switch video, audio, and subtitle tracks on the fly, and check ratings and playback details all in one clean view.',
    icon: 'tabler:layout-dashboard',
  },
  {
    title: 'Unified Item Details',
    description:
      'One beautifully designed details page for everything: movies, shows, seasons, episodes, music, people, and collections.',
    icon: 'tabler:info-circle',
  },
  {
    title: 'Full Dolby Vision Support',
    description:
      'Enjoy Dolby Vision on supported Roku devices. JellyRock repackages Dolby Vision MKVs on the fly so they keep playing, with no re-encoding required.',
    icon: 'tabler:video',
  },
  {
    title: '99 Language Translations',
    description:
      "JellyRock's own translation system delivers built-in support for 99 languages, far beyond the dozen or so offered by Roku OS and the official Jellyfin client.",
    icon: 'tabler:language',
  },
  {
    title: 'Media Segments (Intro Skipper)',
    description:
      'Automatically skip intros, outros, recaps, previews, and commercials your Jellyfin server detects. Configure each segment type to skip, prompt, or do nothing.',
    icon: 'tabler:player-skip-forward',
  },
  {
    title: 'Live TV & DVR',
    description:
      'Browse the channel guide, tune in to live broadcasts, and schedule DVR recordings of upcoming shows, all without leaving JellyRock.',
    icon: 'tabler:device-tv',
  },
  {
    title: 'Trickplay Thumbnails',
    description:
      'Preview thumbnails as you scrub, so you can land on the exact moment you want. It works even on lower-memory Roku devices.',
    icon: 'tabler:photo-scan',
  },
  {
    title: 'Quick Connect',
    description:
      "Skip the on-screen keyboard. Approve JellyRock from the Jellyfin app on your phone and you're signed in instantly, on every supported server version.",
    icon: 'tabler:device-mobile-message',
  },
  {
    title: 'Roku Voice Control',
    description:
      'Search your whole library by voice, then play, pause, and seek with Roku voice commands. Completely hands-free.',
    icon: 'tabler:microphone',
  },
  {
    title: 'Music & Audio',
    description:
      'More than a video app. Browse artists, albums, and playlists, spin up an instant mix, and enjoy a full-screen now-playing view with album art.',
    icon: 'tabler:music',
  },
  {
    title: 'Photos & Albums',
    description:
      'Relive your memories on the big screen. Browse and view your Jellyfin photo libraries and albums right alongside your movies and shows.',
    icon: 'tabler:photo',
  },
  {
    title: 'Favorites Tab',
    description:
      "Jump straight to everything you've favorited from a dedicated tab on the home screen, across every media type JellyRock supports.",
    icon: 'tabler:star',
  },
  {
    title: 'Themes for Every Taste',
    description:
      'Pick from nine handcrafted themes: JellyRock, Black, Emerald, Ember, Rose, Ocean, Dusk, Midnight, and High Contrast. Or design your own with any hex colors.',
    icon: 'tabler:palette',
  },
  {
    title: 'Self-Hosted Weblate',
    description:
      'Translations live on our own Weblate instance at translate.jellyrock.app. Jump in and help bring JellyRock to your language.',
    icon: 'tabler:world',
  },
  {
    title: 'Free & Open Source',
    description:
      'No ads, no tracking, no subscriptions, ever. JellyRock is built in the open by the community under the GPL-2.0 license.',
    icon: 'tabler:heart-handshake',
  },
];

/** Number of features to show on the homepage */
export const HOMEPAGE_FEATURE_COUNT = 8;
