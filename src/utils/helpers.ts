import {
  Teardown,
  TeardownPlayerProjectionTuple,
  EventDataObj,
  PlayerWithItemProjection
} from '../types/analytics';

import {
  FramerateProjection,
  FramerateProjectionHLS,
  FramerateProjectionDash,
  FramerateProjectionDefault
} from '../utils/framerate';

import {
  PlayerAPI,
  PlayerEventCallback,
  StreamType,
  PlayerEvent
} from 'bitmovin-player';

export const noop = () => {};

// RegEx solution found here: https://stackoverflow.com/questions/7944460/detect-safari-browser
// Need to make the check more robust than just searching for "Safari" since Chrome's User
// Agent also includes the string Safari. (KJB)
export const isSafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent
);

// NOTE: Because Safari doesn't expose the VideoPlaybackElement definition directly on the global context (i.e. "window"),
// we need to instead check the existence of the getVideoPlaybackQuality function on an actual video element.
// To do this, we're immediately creating and throwing away an element to only check once on initial load
// (as this shouldn't change for a given global execution context) (CJP)
export const hasVideoPlaybackQuality =
  typeof document.createElement('video').getVideoPlaybackQuality === 'function';

const removeAtIndex = (arr: any[], i: number): any[] => [
  ...arr.slice(0, i),
  ...arr.slice(i + 1, arr.length)
];

export const hasPostAd = (player: PlayerAPI): Boolean => {
  const advertising = player.ads;
  const schedule = (advertising && advertising.schedule) || {};
  const offsets = Object.keys(schedule).map(ad => schedule[ad].offset);
  return !!offsets.filter(x => x === 'post').length;
};

export const toGetStreamType = (player: PlayerAPI): string =>
  player.getStreamType();

export const toGetManifest = (player: PlayerAPI): string | undefined => {
  const streamType = toGetStreamType(player);
  // TODO: Need to check streamType before accessing the manifest due to a bug in the player.
  if (!['hls', 'dash'].some(type => type === streamType)) return undefined;
  if (streamType === 'hls' && isSafari) return undefined;
  const manifest = player.getManifest();
  return manifest;
};

/**
 * Invokes a Teardown Function in an array of Teardowns and returns a new array without the element
 */
export const teardownAndRemove = (
  teardownArr: Teardown[],
  index: number
): Teardown[] => {
  teardownArr[index]();
  return removeAtIndex(teardownArr, index);
};

export const framerateMap: Record<StreamType, FramerateProjection> = {
  hls: !isSafari ? FramerateProjectionHLS : FramerateProjectionDefault,
  dash: !!DOMParser ? FramerateProjectionDash : FramerateProjectionDefault,
  progressive: FramerateProjectionDefault,
  smooth: FramerateProjectionDefault,
  unknown: FramerateProjectionDefault
};

export const toEventDataObj = (
  eventType: PlayerEvent,
  callback: PlayerEventCallback
): EventDataObj => ({
  eventType,
  callback
});

/**
 * Accesses the function that returns the value from a TeardownPlayerProjectionTuple
 */
export const toGetValue = <T>(evtTpl: TeardownPlayerProjectionTuple<T>) =>
  evtTpl[1];
/**
 * Accesses the teardown function from a TeardownPlayerProjectionTuple
 */
export const toTeardown = <T>(
  evtTpl: TeardownPlayerProjectionTuple<T>
): Teardown => evtTpl[0];

export function toCreateHeartbeatObject<W, X, Y, Z, T, E>(
  f: (w: W, x: X, y: Y, z: Z) => T,
  h: PlayerWithItemProjection<W, E>,
  i: PlayerWithItemProjection<X, E>,
  j: PlayerWithItemProjection<Y, E>,
  k: PlayerWithItemProjection<Z, E>
): PlayerWithItemProjection<T, E>;
export function toCreateHeartbeatObject<W, X, Y, Z, T, E extends PlayerEvent>(
  f: (w: W, x: X, y: Y, z: Z) => T,
  h: PlayerWithItemProjection<W, E>,
  i: PlayerWithItemProjection<X, E>,
  j: PlayerWithItemProjection<Y, E>,
  k: PlayerWithItemProjection<Z, E>
): PlayerWithItemProjection<T, E> {
  return (p, e) => f(h(p, e), i(p, e), j(p, e), k(p, e));
}
