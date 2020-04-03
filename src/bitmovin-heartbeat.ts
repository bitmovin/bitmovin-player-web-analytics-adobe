import {
  MediaHeartbeat,
  MediaHeartbeatConfig,
  MediaHeartbeatDelegate,
  QoSObject,
  MediaObject,
  AdBreakObject,
  AdObject,
  ChapterObject
} from './types/Heartbeat';

import {
  TeardownTuple,
  PlayerWithItemProjection,
  EventDataObj
} from './types/analytics';

import {
  addPlayerEventHandler,
  onVideoPlay,
  onVideoPause,
  toOnVideoComplete,
  toStartUpTime,
  toGetBitrate,
  toSourceFramerate,
  toOnAdBreakComplete,
  toOnVideoDestroy,
  toOnBufferStart,
  toOnBufferEnd,
  toOnSeekStart,
  toOnSeekEnd,
  toOnAdBreakStart,
  toOnAdStart,
  toOnAdComplete,
  toOnAdSkip,
  checkChapter,
  toOnVideoQualityChanged,
  toOnAdError,
  toOnError
} from './eventHandlers';

import HeartbeatDataProjections from './types/HeartbeatDataProjections';

import { PlayerAPI, PlayerEvent, AdBreakEvent, AdEvent } from 'bitmovin-player';

import { ChapterEvent } from './types/analytics';

import { MediaHeartbeatPass } from './dev/adobePassthrough';

import {
  noop,
  toEventDataObj,
  toCreateHeartbeatObject,
  toGetValue,
  hasPostAd
} from './utils/helpers';

import {
  toChapterNameDefault,
  toChapterPositionDefault,
  toChapterLengthDefault,
  toChapterStartTimeDefault,
  toVideoTitle,
  toVideoDuration,
  toVideoStreamType,
  toAdBreakName,
  toAdBreakStartTime,
  toAdPosition,
  toAdLength,
  toDroppedFrames
} from './utils/dataProjections';

/**
 * @return tearDown is a function that will remove all event handlers associated with heartbeat
 */
export const HeartbeatAnalytics = function(
  mediaConfigObj: MediaHeartbeatConfig,
  player: PlayerAPI,
  heartbeatDataProjections: HeartbeatDataProjections,
  appMeasurement
) {
  let allTeardowns = [];
  const {
    toVideoUID = (player: PlayerAPI) => '',
    toAdName = (player: PlayerAPI) => '',
    toAdId = (player: PlayerAPI) => '',
    toAdBreakPosition = (player: PlayerAPI) => null,
    toChapterName = toChapterNameDefault,
    toChapterPosition = toChapterPositionDefault,
    toChapterLength = toChapterLengthDefault,
    toChapterStartTime = toChapterStartTimeDefault
  } = heartbeatDataProjections || {};

  /**
   * Create functions to build various Heartbeat objects.
   */
  const toCreateMediaObject = toCreateHeartbeatObject(
    MediaHeartbeat.createMediaObject,
    toVideoTitle,
    toVideoUID,
    toVideoDuration,
    toVideoStreamType
  );

  const toCreateAdBreakObject = toCreateHeartbeatObject(
    MediaHeartbeat.createAdBreakObject,
    toAdBreakName,
    toAdBreakPosition,
    toAdBreakStartTime,
    noop
  );

  const toCreateAdObject = toCreateHeartbeatObject(
    MediaHeartbeat.createAdObject,
    toAdName,
    toAdId,
    toAdPosition,
    toAdLength
  );

  const toCreateChapterObject = toCreateHeartbeatObject(
    MediaHeartbeat.createChapterObject,
    toChapterName,
    toChapterPosition,
    toChapterLength,
    toChapterStartTime
  );

  /**
   * Create and configure Heartbeat MediaDelegate instance
   */
  const mediaDelegate = new MediaHeartbeatDelegate();
  //Bind is needed because getCurrent time relies on a this context that it expects to be the player (SG)
  mediaDelegate.getCurrentPlaybackTime = player.getCurrentTime.bind(player);
  const startupDeltaState = toStartUpTime(player);
  const bitrateState = toGetBitrate(player);
  const QoSObject = () =>
    toCreateHeartbeatObject(
      MediaHeartbeat.createQoSObject,
      toGetValue(bitrateState),
      toGetValue(startupDeltaState),
      toSourceFramerate,
      toDroppedFrames
    )(player);
  mediaDelegate.getQoSObject = () => QoSObject();

  /**
   * Create MediaHeartbeat instance
   */
  const mediaHeartbeat = new MediaHeartbeatPass(
    mediaDelegate,
    mediaConfigObj,
    appMeasurement
  );

  const finished = () => {
    mediaHeartbeat.trackComplete();
    const currentPlay = allTeardowns.find(
      ([, { eventType = '' } = {}]) =>
        eventType === player.exports.PlayerEvent.Playing
    );
    const [oldPlayTeardown, { callback: oldPlayCallback }] = currentPlay;
    const teardown = addPlayerEventHandler(
      player,
      player.exports.PlayerEvent.Play,
      () => {
        mediaHeartbeat.trackSessionEnd();
        oldPlayTeardown();
        mediaHeartbeat.trackSessionStart(toCreateMediaObject(player), {});
        teardown();
        oldPlayCallback();
        allTeardowns = [
          ...allTeardowns,
          addPlayerEventHandler(
            player,
            player.exports.PlayerEvent.Playing,
            oldPlayCallback
          )
        ];
      }
    );
  };

  /**
   * @param p Bitmovin player instance
   *
   * Function called when player is ready.  This callback subscribes to all of the events from the
   * Bitmovin player needed for Adobe Heartbeats.
   */
  const toOnVideoLoad = (
    mediaHeartbeat: MediaHeartbeat,
    mediaDelegate: MediaHeartbeatDelegate,
    toCreateMediaObject: PlayerWithItemProjection<MediaObject, {}>,
    toCreateAdBreakObject: PlayerWithItemProjection<
      AdBreakObject,
      AdBreakEvent
    >,
    toCreateAdObject: PlayerWithItemProjection<AdObject, AdEvent>,
    toCreateChapterObject: PlayerWithItemProjection<
      ChapterObject,
      ChapterEvent
    >,
    player: PlayerAPI
  ) => () => {
    const mediaObject = toCreateMediaObject(player);
    // TODO: player.getManifest()
    mediaHeartbeat.trackSessionStart(mediaObject, {});
    const teardowns = toTeardownTuples([
      // Core Playback
      toEventDataObj(
        player.exports.PlayerEvent.Playing,
        onVideoPlay(mediaHeartbeat)
      ),
      toEventDataObj(
        player.exports.PlayerEvent.PlaybackFinished,
        toOnVideoComplete(mediaHeartbeat, player, toCreateMediaObject, finished)
      ),
      toEventDataObj(
        player.exports.PlayerEvent.Paused,
        onVideoPause(mediaHeartbeat)
      ),
      // Buffering
      toEventDataObj(
        player.exports.PlayerEvent.StallStarted,
        toOnBufferStart(mediaHeartbeat)
      ),
      toEventDataObj(
        player.exports.PlayerEvent.StallEnded,
        toOnBufferEnd(mediaHeartbeat)
      ),
      // Seeking
      toEventDataObj(
        player.exports.PlayerEvent.Seek,
        toOnSeekStart(mediaHeartbeat)
      ),
      toEventDataObj(
        player.exports.PlayerEvent.Seeked,
        toOnSeekEnd(mediaHeartbeat)
      ),
      // Ad related events
      toEventDataObj(
        player.exports.PlayerEvent.AdBreakStarted,
        toOnAdBreakStart(mediaHeartbeat, player, toCreateAdBreakObject)
      ),
      toEventDataObj(
        player.exports.PlayerEvent.AdStarted,
        toOnAdStart(mediaHeartbeat, player, toCreateAdObject)
      ),
      toEventDataObj(
        player.exports.PlayerEvent.AdFinished,
        toOnAdComplete(mediaHeartbeat)
      ),
      toEventDataObj(
        player.exports.PlayerEvent.AdSkipped,
        toOnAdSkip(mediaHeartbeat)
      ),
      toEventDataObj(
        player.exports.PlayerEvent.AdBreakFinished,
        toOnAdBreakComplete(mediaHeartbeat, player, finished)
      ),
      // Chapter and segment related events
      toEventDataObj(
        player.exports.PlayerEvent.TimeChanged,
        checkChapter(mediaHeartbeat, player, toCreateChapterObject)
      ),
      // Quality of service (QoS) related events
      toEventDataObj(
        player.exports.PlayerEvent.VideoPlaybackQualityChanged,
        toOnVideoQualityChanged(mediaHeartbeat, mediaDelegate)
      ),
      // Errors
      toEventDataObj(
        player.exports.PlayerEvent.Error,
        toOnError(mediaHeartbeat)
      ),
      toEventDataObj(
        player.exports.PlayerEvent.AdError,
        toOnAdError(mediaHeartbeat)
      ),
      // Session End
      toEventDataObj(
        player.exports.PlayerEvent.SourceUnloaded,
        toOnVideoDestroy(mediaHeartbeat)
      )
    ]);
    allTeardowns = [...allTeardowns, ...teardowns];
  };

  const toTeardownTuples = (eventDataObjs: EventDataObj[]) =>
    eventDataObjs.map<TeardownTuple<EventDataObj>>(
      ({ eventType, callback }) => {
        // NOTE: addPlayerEventHandler will have a side effect that, although not "observed"
        // relative to this map, still makes this not "pure" in the strict sense (CJP)
        const boundCallback = callback.bind(mediaHeartbeat);
        return [
          addPlayerEventHandler(player, eventType, boundCallback),
          {
            eventType,
            callback: boundCallback
          }
        ];
      }
    );

  allTeardowns = [
    ...allTeardowns,
    ...toTeardownTuples([
      toEventDataObj(
        player.exports.PlayerEvent.SourceLoaded,
        toOnVideoLoad(
          mediaHeartbeat,
          mediaDelegate,
          toCreateMediaObject,
          toCreateAdBreakObject,
          toCreateAdObject,
          toCreateChapterObject,
          player
        )
      ),
      toEventDataObj(
        player.exports.PlayerEvent.Destroy,
        toOnVideoDestroy(mediaHeartbeat)
      )
    ]),
    bitrateState,
    startupDeltaState,
    [toOnVideoDestroy(mediaHeartbeat), {}]
  ];

  // TODO: Cleanup ADB refs if necessary (CJP)
  const tearDown = () => {
    while (allTeardowns.length) {
      const [teardown] = allTeardowns.shift();
      teardown();
    }
  };
  return tearDown;
};
