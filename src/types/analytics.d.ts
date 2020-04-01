import { PlayerAPI, PlayerEvent, PlayerEventCallback } from 'bitmovin-player';
/**
 * When invoked a Teardown function will remove an Event Handler
 */
export type Teardown = () => void;
export type TeardownTuple<T> = [Teardown, T];
/**
 * A TearDownTuple with the second argument that can access a stored value which updates
 * on an event. The teardown will remove this update.
 */
export type TeardownPlayerProjectionTuple<T> = TeardownTuple<
  (player: PlayerAPI) => T
>;

export type PlayerWithItemProjection<T, E> = (p: PlayerAPI, e?: E) => T;

export type ChapterEvent = {
  time: number;
  position: number;
  title: string;
  interval: [number, number];
};

/**
 * Stores Event -> Function Bindings
 */
export type EventDataObj = {
  eventType: PlayerEvent;
  callback: PlayerEventCallback;
};
