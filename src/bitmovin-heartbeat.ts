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

import { PlayerAPI, PlayerEvent, AdStartedEvent } from './types/bitmovin';

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
  toAdBreakNameDefault,
  toChapterNameDefault,
  toChapterPositionDefault,
  toChapterLengthDefault,
  toChapterStartTimeDefault,
  toVideoTitle,
  toVideoDuration,
  toVideoStreamType,
  toAdBreakStartTime,
  toAdPosition,
  toAdLength,
  toDroppedFrames
} from './utils/dataProjections';

const EVENT = bitmovin.player.EVENT;

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
    toAdBreakName = toAdBreakNameDefault,
    toChapterName = toChapterNameDefault,
    toChapterPosition = toChapterPositionDefault,
    toChapterLength = toChapterLengthDefault,
    toChapterStartTime = toChapterStartTimeDefault
  } =
    heartbeatDataProjections || {};

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
      ([, { eventType = '' } = {}]) => eventType === EVENT.ON_PLAYING
    );
    const [oldPlayTeardown, { callback: oldPlayCallback }] = currentPlay;
    const teardown = addPlayerEventHandler(player, EVENT.ON_PLAY, () => {
      mediaHeartbeat.trackSessionEnd();
      oldPlayTeardown();
      mediaHeartbeat.trackSessionStart(toCreateMediaObject(player), {});
      teardown();
      oldPlayCallback();
      allTeardowns = [
        ...allTeardowns,
        addPlayerEventHandler(player, EVENT.ON_PLAYING, oldPlayCallback)
      ];
    });
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
    toCreateAdBreakObject: PlayerWithItemProjection<AdBreakObject, PlayerEvent>,
    toCreateAdObject: PlayerWithItemProjection<AdObject, AdStartedEvent>,
    toCreateChapterObject: PlayerWithItemProjection<
      ChapterObject,
      ChapterEvent
    >,
    player: PlayerAPI
  ) => () => {
    const ON_SEEK = player.isLive ? EVENT.ON_TIME_SHIFT : EVENT.ON_SEEK;
    const ON_SEEKED = player.isLive ? EVENT.ON_TIME_SHIFTED : EVENT.ON_SEEKED;
    const mediaObject = toCreateMediaObject(p);
    // TODO: player.getManifest()
    mediaHeartbeat.trackSessionStart(mediaObject, {});
    const teardowns = toTeardownTuples([
      // Core Playback
      toEventDataObj(EVENT.ON_PLAYING, onVideoPlay(mediaHeartbeat)),
      toEventDataObj(
        EVENT.ON_PLAYBACK_FINISHED,
        toOnVideoComplete(mediaHeartbeat, p, toCreateMediaObject, finished)
      ),
      toEventDataObj(EVENT.ON_PAUSED, onVideoPause(mediaHeartbeat)),
      // Buffering
      toEventDataObj(EVENT.ON_STALL_STARTED, toOnBufferStart(mediaHeartbeat)),
      toEventDataObj(EVENT.ON_STALL_ENDED, toOnBufferEnd(mediaHeartbeat)),
      // Seeking
      toEventDataObj(ON_SEEK, toOnSeekStart(mediaHeartbeat)),
      toEventDataObj(ON_SEEKED, toOnSeekEnd(mediaHeartbeat)),
      // Ad related events
      toEventDataObj(
        EVENT.ON_AD_BREAK_STARTED,
        toOnAdBreakStart(mediaHeartbeat, p, toCreateAdBreakObject)
      ),
      toEventDataObj(
        EVENT.ON_AD_STARTED,
        toOnAdStart(mediaHeartbeat, p, toCreateAdObject)
      ),
      toEventDataObj(EVENT.ON_AD_FINISHED, toOnAdComplete(mediaHeartbeat)),
      toEventDataObj(EVENT.ON_AD_SKIPPED, toOnAdSkip(mediaHeartbeat)),
      toEventDataObj(
        EVENT.ON_AD_BREAK_FINISHED,
        toOnAdBreakComplete(mediaHeartbeat, p, finished)
      ),
      // Chapter and segment related events
      toEventDataObj(
        EVENT.ON_TIME_CHANGED,
        checkChapter(mediaHeartbeat, p, toCreateChapterObject)
      ),
      // Quality of service (QoS) related events
      toEventDataObj(
        EVENT.ON_VIDEO_PLAYBACK_QUALITY_CHANGED,
        toOnVideoQualityChanged(mediaHeartbeat, mediaDelegate)
      ),
      // Errors
      toEventDataObj(EVENT.ON_ERROR, toOnError(mediaHeartbeat)),
      toEventDataObj(EVENT.ON_AD_ERROR, toOnAdError(mediaHeartbeat)),
      // Session End
      toEventDataObj(EVENT.ON_SOURCE_UNLOADED, toOnVideoDestroy(mediaHeartbeat))
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
        EVENT.ON_READY,
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
      toEventDataObj(EVENT.ON_DESTROY, toOnVideoDestroy(mediaHeartbeat))
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
