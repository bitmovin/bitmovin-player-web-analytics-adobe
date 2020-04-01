import { PlayerAPI, AdBreakEvent, AdEvent } from 'bitmovin-player';

import { ChapterEvent } from '../types/analytics';

import { StreamType as HeartbeatStreamType } from '../types/Heartbeat';

import { hasVideoPlaybackQuality, isSafari } from './helpers';

const fromVideoPlaybackQualityWhenValid = (player: PlayerAPI) => {
  // NOTE: Although Safari implements the VideoPlaybackQuality object,
  // it only reports real data when using MSE (i.e. not for 'progressive'
  // or 'hls', which are passed directly as video source) (CJP)
  if (
    // Bitmovin player defaults to using the native Safari player but can be configured
    // to use a different tech (like HTML5). We only want to defer to the player API
    // for dropped frames when using native to play content in Safari.
    player.getPlayerType() === 'native' &&
    isSafari
  )
    return player.getDroppedVideoFrames();
  const figureEl: HTMLElement = player.getContainer();
  if (!figureEl) return player.getDroppedVideoFrames();
  // TODO: Verify that
  // a) querySelector will be available in all target browser &
  // b) we can assume that, if getFigure() is available, so is the video tag. (CJP)
  const videoEl: HTMLVideoElement = player
    .getContainer()
    .querySelector('video#bitmovinplayer-video-player');
  if (!videoEl) return player.getDroppedVideoFrames();
  return videoEl.getVideoPlaybackQuality().droppedVideoFrames;
};

export const toDroppedFrames = (player: PlayerAPI) => {
  if (hasVideoPlaybackQuality) return fromVideoPlaybackQualityWhenValid(player);
  return player.getDroppedVideoFrames();
};

export const toVideoTitle = (player: PlayerAPI) => player.getSource().title;

export const toVideoDuration = (player: PlayerAPI) => player.getDuration();

export const toVideoStreamType = (player: PlayerAPI) =>
  player.isLive() ? HeartbeatStreamType.LIVE : HeartbeatStreamType.VOD;

export const toAdBreakName = (player: PlayerAPI, adBreakEvent: AdBreakEvent) =>
  adBreakEvent.adBreak.id;

export const toAdBreakStartTime = (
  player: PlayerAPI,
  adBreakEvent: AdBreakEvent
) => adBreakEvent.adBreak.scheduleTime;

export const toAdPosition = (player: PlayerAPI, adStartedEvent: AdEvent) => '1';

export const toAdLength = (player: PlayerAPI, adStartedEvent: AdEvent) => '5';

export const toChapterNameDefault = (player: PlayerAPI, e: ChapterEvent) =>
  e.title;

export const toChapterLengthDefault = (player: PlayerAPI, e: ChapterEvent) =>
  e.interval[1] === Number.POSITIVE_INFINITY
    ? player.getDuration() - e.interval[0]
    : e.interval[1] - e.interval[0];

export const toChapterPositionDefault = (player: PlayerAPI, e: ChapterEvent) =>
  e.position;

export const toChapterStartTimeDefault = (player: PlayerAPI, e: ChapterEvent) =>
  e.time;

export const toAdBreakNameDefault = (player: PlayerAPI) => {
  const duration = player.getDuration();
  const playhead = player.getCurrentTime();
  //TODO: playhead === duration is not confirmed for live streams. Need to verify that and potentially refactor.
  if (playhead === duration) return 'post';
  if (playhead === 0) return 'pre';
  return 'mid';
};
