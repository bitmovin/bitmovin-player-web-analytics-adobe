/// <reference path='../../node_modules/bitmovin-player-ui/src/ts/player-config.d.ts' />
/// <reference path='../../node_modules/bitmovin-player-ui/src/ts/player-events.d.ts' />
/// <reference path='../../node_modules/bitmovin-player-ui/src/ts/player.d.ts' />
/// <reference path='./bitmovin-patches.d.ts' />

export type PlayerAPI = bitmovin.PlayerAPI;
export type PlayerEvent = bitmovin.PlayerAPI.PlayerEvent;
export type PlaybackEvent = bitmovin.PlayerAPI.PlaybackEvent;
export type AdStartedEvent = bitmovin.PlayerAPI.AdStartedEvent;
export type VideoPlaybackQualityChangedEvent = bitmovin.PlayerAPI.VideoPlaybackQualityChangedEvent;
export type PlayerEventCallback = bitmovin.PlayerAPI.PlayerEventCallback;
export type StreamType = bitmovin.PlayerAPI.StreamType;
export type EVENT = bitmovin.PlayerAPI.EVENT;
export default bitmovin;
