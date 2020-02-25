import {
    MediaHeartbeat,
    MediaHeartbeatDelegate,
    Event,
    MediaObject,
    AdBreakObject,
    AdObject,
    ChapterObject
} from './types/Heartbeat';

import {Teardown, TeardownPlayerProjectionTuple, PlayerWithItemProjection, ChapterEvent} from './types/analytics';

import {
    hasPostAd,
    teardownAndRemove,
    framerateMap,
    toGetStreamType,
    toGetManifest
} from './utils/helpers';

import {toAdBreakNameDefault} from './utils/dataProjections';

/*import bitmovin, {
  PlayerAPI,
  PlaybackEvent,
  PlayerEventCallback,
  VideoPlaybackQualityChangedEvent,
  PlayerEvent,
  AdStartedEvent
} from './types/bitmovin';*/

import {
    PlayerAPI,
    PlayerEventCallback,
    PlaybackEvent,
    PlayerEvent,
    VideoPlaybackQualityChangedEvent,
    AdBreakEvent
} from 'bitmovin-player';

import{
    UIConfig, TimelineMarker
}from 'bitmovin-player-ui/src/ts/uiconfig';


/**
 * creates a Teardown function
 * @return The return function when invoked will remove the event handler
 */
const toRemovePlayerEventHandler = (player : PlayerAPI, eventType : PlayerEvent, callback : PlayerEventCallback) : Teardown => () => player.off(eventType, callback);

/**
 * Adds a Event handler to the player and returns the teardown function
 * @return
 */
export const addPlayerEventHandler = (player : PlayerAPI, eventType : PlayerEvent, callback : PlayerEventCallback) : Teardown => {
    player.on(eventType, callback);
    return toRemovePlayerEventHandler(player, eventType, callback);
};

/**
 * Startup Time is defined as the delta between the ON_SOURCE_LOADED and the next ON_PLAY event.
 *
 * @return The Second value of this tuple will be undefined until both events have fired
 * once fired it will be the delta between the two events. This value should not change once defined
 */
export const toStartUpTime = (player : PlayerAPI) : TeardownPlayerProjectionTuple < number > => {
    let deltaT;
    let teardowns = [];
    const playCallback = (loadedTime : number) => () => console.log('playCallback: ', Date.now(), loadedTime) || (deltaT = Date.now() - loadedTime);

    const doThenTeardown = (callback : () => void, teardownArr : Teardown[], index : number) => () => {
        callback();
        teardowns = teardownAndRemove(teardownArr, index);
    };

    // this unfortunately needs to be done this way since we cant get anything out of play callback
    const sourceLoadedCallback = () : void => {
        teardowns[1] = addPlayerEventHandler(player, PlayerEvent.Play, doThenTeardown(playCallback(Date.now()), teardowns, 1));
    };
    // TODO: Consider ON_READY instead of ON_SOURCE_LOADED
    teardowns[0] = addPlayerEventHandler(player, PlayerEvent.SourceLoaded, sourceLoadedCallback);

    const teardownAndRemoveAll = () => {
        while (teardowns.length) {
            teardowns = teardownAndRemove(teardowns, 0);
        }
    };

    return [
        teardownAndRemoveAll,
        () => deltaT
    ];
};

/**
 * Creates a Tuple that stores the current bitrate of playback. This is initialized to
 * the players bitrate defined in player.getVideoQuality().bitrate, and changed when
 * ON_VIDEO_PLAYBACK_QUALITY_CHANGED events occur. Note this may be delayed from a manual change of bitrate
 * due to buffering or frame times
 * the returning teardown stops tracking bitrate updates
 */
export const toGetBitrate = (player : PlayerAPI) : TeardownPlayerProjectionTuple < number > => {
    let bitrate = player.getVideoQuality().bitrate;
    const videoPlaybackQualityChangedCallback = (evt : VideoPlaybackQualityChangedEvent) => (bitrate = evt.targetQuality.bitrate);
    const removeVideoPlaybackQualityChangedCallback = addPlayerEventHandler(player, PlayerEvent.VideoPlaybackQualityChanged, videoPlaybackQualityChangedCallback);
    return [
        removeVideoPlaybackQualityChangedCallback,
        () => bitrate
    ];
};

/**
 * Takes an instance of a Bitmovin player and provides the framerate of the current source, or undefined if
 * no framerate is provided.
 * @param player Instance of the Bitmovin player
 */
export const toSourceFramerate = (player : PlayerAPI) : number | undefined => {
    const streamType = toGetStreamType(player);
    const manifest = toGetManifest(player);
    const framerate = framerateMap[streamType](manifest);
    return framerate;
};

// Core playback
export const onVideoPlay = (mediaHeartbeat : MediaHeartbeat) => mediaHeartbeat.trackPlay;
export const onVideoPause = (mediaHeartbeat : MediaHeartbeat) => mediaHeartbeat.trackPause;

export const toOnVideoComplete = (mediaHeartbeat : MediaHeartbeat, player : PlayerAPI, toCreateMediaObject : PlayerWithItemProjection < MediaObject, {} >, finished : () => void) => () => {
    mediaHeartbeat.trackEvent(Event.ChapterComplete);
    if (!hasPostAd(player)) {
        finished();
    }
};

// Chapters and segments
// TODO: Does PlaybackEvent provide actual seconds?
export const checkChapter = (mediaHeartbeat : MediaHeartbeat, p : PlayerAPI, toCreateChapterObject : PlayerWithItemProjection < ChapterObject, TimelineMarker >) => {
  
    let currentChapter;
    let uiConfig: UIConfig;
    uiConfig= p.getConfig().ui;
    const markers =  uiConfig.metadata.markers|| [];
    const markersWithInterval = markers.map((m, position, a) => Object.assign({}, m, {
        position,
        interval: position === a.length - 1 ? [m.time, Number.POSITIVE_INFINITY] : [
            m.time,
            a[position + 1].time
        ]
      }));

    return({time} : PlaybackEvent) => {
        const newChapter = markersWithInterval.find(({
            interval: [start, end]
        }) => start<= Math.floor(time) && Math.floor(time) < end
    );
    if (!newChapter || newChapter === currentChapter) return;
    if (currentChapter && newChapter !== markersWithInterval[0])
      mediaHeartbeat.trackEvent(Event.ChapterComplete);
    //TODO: Deal with Event.ChapterSkip
    currentChapter = newChapter;
    mediaHeartbeat.trackEvent(
      Event.ChapterStart, toCreateChapterObject(p, newChapter)
    );
  };
};

// Buffering
export const toOnBufferStart = (mediaHeartbeat: MediaHeartbeat) => () => mediaHeartbeat.trackEvent(Event.BufferStart);
        export const toOnBufferEnd = (mediaHeartbeat : MediaHeartbeat) => () => mediaHeartbeat.trackEvent(Event.BufferComplete);

        // Seeking
            export const toOnSeekStart = (mediaHeartbeat : MediaHeartbeat) => () => mediaHeartbeat.trackEvent(Event.SeekStart);
        export const toOnSeekEnd = (mediaHeartbeat : MediaHeartbeat) => () => mediaHeartbeat.trackEvent(Event.SeekComplete);

        // Ads
        export const toOnAdBreakStart = (mediaHeartbeat : MediaHeartbeat, p : PlayerAPI, toCreateAdBreakObject : PlayerWithItemProjection < AdBreakObject, PlayerEvent >) => (evt : PlayerEvent) => mediaHeartbeat.trackEvent(Event.AdBreakStart, toCreateAdBreakObject(p, evt));

        export const toOnAdStart = (mediaHeartbeat : MediaHeartbeat, p : PlayerAPI, toCreateAdObject : PlayerWithItemProjection < AdObject, AdBreakEvent >) => (evt : AdBreakEvent) => mediaHeartbeat.trackEvent(Event.AdStart, toCreateAdObject(p, evt));

        export const toOnAdComplete = (mediaHeartbeat : MediaHeartbeat) => () => mediaHeartbeat.trackEvent(Event.AdComplete);

        export const toOnAdSkip = (mediaHeartbeat : MediaHeartbeat) => () => mediaHeartbeat.trackEvent(Event.AdSkip);

        export const toOnAdBreakComplete = (mediaHeartbeat : MediaHeartbeat, player : PlayerAPI, finished : () => void) => () => {
            mediaHeartbeat.trackEvent(Event.AdBreakComplete);
            if (toAdBreakNameDefault(player) === 'post') {
                finished();
            }
        };

        // QoS
            export const toOnVideoQualityChanged = (mediaHeartbeat : MediaHeartbeat, mediaDelegate : MediaHeartbeatDelegate) => () => mediaHeartbeat.trackEvent(Event.BitrateChange, mediaDelegate.getQoSObject());
        export const toOnError = (mediaHeartbeat : MediaHeartbeat) => evt => mediaHeartbeat.trackError(evt);
        export const toOnAdError = (mediaHeartbeat : MediaHeartbeat) => evt => mediaHeartbeat.trackError(evt);

        // Session end
            export const toOnVideoDestroy = (mediaHeartbeat : MediaHeartbeat) => () => mediaHeartbeat.trackSessionEnd;
