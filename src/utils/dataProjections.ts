import { PlayerAPI, AdBreakEvent, AdEvent, LinearAd } from 'bitmovin-player';

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
  const videoEl: HTMLVideoElement = player.getContainer().querySelector('video#bitmovinplayer-video-player');
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

export const toAdBreakNameDefault = (player: PlayerAPI, adBreakEvent: AdBreakEvent) => {
  const duration = player.getDuration();
  const scheduleTime = adBreakEvent.adBreak.scheduleTime;
  if (scheduleTime === 0) return 'preroll';
  if (scheduleTime >= duration) return 'postroll';
  return 'midroll';
};

export const toAdBreakPositionDefault = (player: PlayerAPI, adBreakEvent: AdBreakEvent) => {
  const duration = player.getDuration();
  const scheduleTime = adBreakEvent.adBreak.scheduleTime;
  if (scheduleTime === 0) return 1;
  if (scheduleTime >= duration) return 3;
  return 2;
};

export const toAdBreakStartTime = (player: PlayerAPI, adBreakEvent: AdBreakEvent) => adBreakEvent.adBreak.scheduleTime;

export const toAdPositionDefault = (player: PlayerAPI, adStartedEvent: AdEvent) => {
  const activeAdsArray = player.ads.getActiveAdBreak().ads;
  const index = activeAdsArray.findIndex(ad => ad.id === adStartedEvent.ad.id);
  return index;
};

export const toAdLength = (player: PlayerAPI, adStartedEvent: AdEvent) => {
  var adDuration = 0;
  if (adStartedEvent.ad.isLinear) {
    adDuration = (<LinearAd>adStartedEvent.ad).duration;
  }
  return adDuration;
};

export const toChapterNameDefault = (player: PlayerAPI, e: ChapterEvent) => e.title;

export const toChapterLengthDefault = (player: PlayerAPI, e: ChapterEvent) =>
  e.interval[1] === Number.POSITIVE_INFINITY ? player.getDuration() - e.interval[0] : e.interval[1] - e.interval[0];

export const toChapterPositionDefault = (player: PlayerAPI, e: ChapterEvent) => e.position;

export const toChapterStartTimeDefault = (player: PlayerAPI, e: ChapterEvent) => e.time;
