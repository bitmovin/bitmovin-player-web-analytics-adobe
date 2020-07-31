import {
  MediaHeartbeat,
  MediaHeartbeatConfig,
  MediaHeartbeatDelegate,
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
  onVideoPlaying,
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
  toGetValue
} from './utils/helpers';

import {
  toChapterNameDefault,
  toChapterPositionDefault,
  toChapterLengthDefault,
  toChapterStartTimeDefault,
  toVideoTitle,
  toVideoDuration,
  toVideoStreamType,
  toAdBreakNameDefault,
  toAdBreakPositionDefault,
  toAdBreakStartTime,
  toAdPositionDefault,
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
  appMeasurement,
  enableDebugLogs = false
) {
  let isDebugLoggingEnabled = enableDebugLogs;
  let allTeardowns = [];
  const {
    toVideoUID = (player: PlayerAPI) => '',
    toCustomMetadata = (player: PlayerAPI) => {},
    toAdBreakName = toAdBreakNameDefault,
    toAdBreakPosition = toAdBreakPositionDefault,
    toAdName = (player: PlayerAPI, adEvent: AdEvent) => '',
    toAdId = (player: PlayerAPI, adEvent: AdEvent) => '',
    toAdPosition = toAdPositionDefault,
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
  const currentPlaybackTime = () => {
    const time: number = player.getCurrentTime();
    if (isNaN(time)) return 0;
    return time;
  };
  mediaDelegate.getCurrentPlaybackTime = () => currentPlaybackTime();
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
    appMeasurement,
    isDebugLoggingEnabled
  );

  const finished = () => {
    // send 'complete' event
    mediaHeartbeat.trackComplete();

    // add 'Play' event handler to handle playback restart
    allTeardowns = [
      ...allTeardowns,
      ...toTeardownTuples([
        toEventDataObj(player.exports.PlayerEvent.Play, onVideoPlay(restarted))
      ])
    ];
    logDebug('finished');
  };

  const started = () => {
    // find, teardown and remove the 'Play' event handler
    // if event handler is not found, ignore this callback
    if (findAndTearDownEventHandler(player.exports.PlayerEvent.Play) == false)
      return;

    // send 'session start' event
    sendSessionStartEvent();

    logDebug('started');
  };

  const restarted = () => {
    // find, teardown and remove the 'Play' event handler
    // if event handler is not found, ignore this callback
    if (findAndTearDownEventHandler(player.exports.PlayerEvent.Play) == false)
      return;

    // send 'session end' event
    mediaHeartbeat.trackSessionEnd();

    // send 'session start' event
    sendSessionStartEvent();

    logDebug('re-started');
  };

  const sendSessionStartEvent = () => {
    const mediaObject = toCreateMediaObject(player);
    const contextData = toCustomMetadata(player);
    mediaHeartbeat.trackSessionStart(mediaObject, Object(contextData));
  };

  const findAndTearDownEventHandler = (playerEvent: PlayerEvent) => {
    // find and teardown the 'Play' event handler and also remove from 'allTearDowns'
    const eventIndex = allTeardowns.findIndex(
      ([, { eventType = '' } = {}]) => eventType === playerEvent
    );
    if (eventIndex != -1) {
      const [teardownEvent] = allTeardowns.splice(eventIndex, 1);
      teardownEvent[0]();
      return true;
    } else {
      logWarning('<' + playerEvent + '> Event not found in teardown array...');
      return false;
    }
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
    const teardowns = toTeardownTuples([
      toEventDataObj(player.exports.PlayerEvent.Play, onVideoPlay(started)),
      toEventDataObj(
        player.exports.PlayerEvent.Playing,
        onVideoPlaying(mediaHeartbeat)
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

    // for auto play case, player will not send 'Play' event,
    // so calling 'Play' event handler to simplify workflow
    // by forcing same flow as in case of user triggered play
    if (
      player.getConfig().playback &&
      player.getConfig().playback.autoplay == true
    ) {
      const playEvent = allTeardowns.find(
        ([, { eventType = '' } = {}]) =>
          eventType === player.exports.PlayerEvent.Play
      );
      const [playTeardown, { callback: playCallback }] = playEvent;
      playCallback();
    }
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
        player.exports.PlayerEvent.PlaybackFinished,
        toOnVideoComplete(finished)
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

  const logDebug = (msg: string) => {
    if (isDebugLoggingEnabled) {
      console.log('[DEBUG] [plugin::bitmovin-adobe-analytics] : ' + msg);
    }
  };

  const logWarning = (msg: string) => {
    console.log('[WARNING] [plugin::bitmovin-adobe-analytics] : ' + msg);
  };

  // TODO: Cleanup ADB refs if necessary (CJP)
  const tearDown = () => {
    while (allTeardowns.length) {
      const [teardown] = allTeardowns.shift();
      teardown();
    }
  };
  return tearDown;
};
