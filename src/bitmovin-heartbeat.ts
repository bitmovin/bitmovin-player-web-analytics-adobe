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

import { MediaHeartbeatStub } from './dev/adobeStub';

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
  const mediaHeartbeat = new MediaHeartbeatStub(
    mediaDelegate,
    mediaConfigObj,
    appMeasurement
  );

  const finished = () => {
    mediaHeartbeat.trackComplete();
    const currentPlay = allTeardowns.find(
      ([, { eventType = '' } = {}]) => eventType === PlayerEvent.Playing
    );
    const [oldPlayTeardown, { callback: oldPlayCallback }] = currentPlay;
    const teardown = addPlayerEventHandler(player, PlayerEvent.Play, () => {
      mediaHeartbeat.trackSessionEnd();
      oldPlayTeardown();
      mediaHeartbeat.trackSessionStart(toCreateMediaObject(player), {});
      teardown();
      oldPlayCallback();
      allTeardowns = [
        ...allTeardowns,
        addPlayerEventHandler(player, PlayerEvent.Playing, oldPlayCallback)
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
    toCreateAdBreakObject: PlayerWithItemProjection<AdBreakObject, AdBreakEvent>,
    toCreateAdObject: PlayerWithItemProjection<AdObject, AdBreakEvent>,
    toCreateChapterObject: PlayerWithItemProjection<ChapterObject, ChapterEvent>,
    player: PlayerAPI
  ) => () => {
    const mediaObject = toCreateMediaObject(player);
    // TODO: player.getManifest()
    mediaHeartbeat.trackSessionStart(mediaObject, {});
    const teardowns = toTeardownTuples([
      // Core Playback
      toEventDataObj(PlayerEvent.Playing, onVideoPlay(mediaHeartbeat)),
      toEventDataObj(
        PlayerEvent.PlaybackFinished,
        toOnVideoComplete(mediaHeartbeat, player, toCreateMediaObject, finished)
      ),
      toEventDataObj(PlayerEvent.Paused, onVideoPause(mediaHeartbeat)),
      // Buffering
      toEventDataObj(PlayerEvent.StallStarted, toOnBufferStart(mediaHeartbeat)),
      toEventDataObj(PlayerEvent.StallEnded, toOnBufferEnd(mediaHeartbeat)),
      // Seeking
      toEventDataObj(PlayerEvent.Seek, toOnSeekStart(mediaHeartbeat)),
      toEventDataObj(PlayerEvent.Seeked, toOnSeekEnd(mediaHeartbeat)),
      // Ad related events
      toEventDataObj(
        PlayerEvent.AdBreakStarted,
        toOnAdBreakStart(mediaHeartbeat, player, toCreateAdBreakObject)
      ),
      toEventDataObj(
        PlayerEvent.AdStarted,
        toOnAdStart(mediaHeartbeat, player, toCreateAdObject)
      ),
      toEventDataObj(PlayerEvent.AdFinished, toOnAdComplete(mediaHeartbeat)),
      toEventDataObj(PlayerEvent.AdSkipped, toOnAdSkip(mediaHeartbeat)),
      toEventDataObj(
        PlayerEvent.AdBreakFinished,
        toOnAdBreakComplete(mediaHeartbeat, player, finished)
      ),
      // Chapter and segment related events
      toEventDataObj(
        PlayerEvent.TimeChanged,
        checkChapter(mediaHeartbeat, player, toCreateChapterObject)
      ),
      // Quality of service (QoS) related events
      toEventDataObj(
        PlayerEvent.VideoPlaybackQualityChanged,
        toOnVideoQualityChanged(mediaHeartbeat, mediaDelegate)
      ),
      // Errors
      toEventDataObj(PlayerEvent.Error, toOnError(mediaHeartbeat)),
      toEventDataObj(PlayerEvent.AdError, toOnAdError(mediaHeartbeat)),
      // Session End
      toEventDataObj(PlayerEvent.SourceUnloaded, toOnVideoDestroy(mediaHeartbeat))
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
        PlayerEvent.Ready,
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
      toEventDataObj(PlayerEvent.Destroy, toOnVideoDestroy(mediaHeartbeat)),
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
