export interface MediaObject {
  name: string;
  mediaId: string;
  length: number;
  streamType: string;
}

export interface QoSObject {
  data: {
    bitrate: number;
    startUpTime: number;
    fps: number;
    droppedFrames: number;
  };
}

export interface AdBreakObject {
  name: string;
  position: number;
  startTime: number;
}

export interface AdObject {
  name: string;
  adId: string;
  position: number;
  length: number;
}

export interface ChapterObject {
  name: string;
  position: number;
  length: number;
  startTime: number;
}

export enum Event {
  AdBreakStart = 'adBreakStart',
  AdStart = 'adStart',
  AdComplete = 'adComplete',
  AdSkip = 'adSkip',
  AdBreakComplete = 'adBreakComplete',
  SeekStart = 'seekStart',
  SeekComplete = 'seekComplete',
  BufferStart = 'bufferStart',
  BufferComplete = 'bufferComplete',
  BitrateChange = 'bitrateChange',
  ChapterStart = 'chapterStart',
  ChapterComplete = 'chapterComplete',
  ChapterSkip = 'chapterSkip'
}

export enum StreamType {
  VOD = 'VOD',
  LIVE = 'LIVE',
  LINEAR = 'LINEAR'
}

export interface CreateQoSObject {
  (
    bitrate: number,
    startUpTime: number,
    fps: number,
    droppedFrames: number
  ): QoSObject;
}

export interface CreateMediaObject {
  (
    name: string,
    mediaId: string,
    length: number,
    streamType: string
  ): MediaObject;
}

export interface CreateAdBreakObject {
  (name: string, position: number, startTime: number): AdBreakObject;
}

export interface CreateAdObject {
  (name: string, adId: string, position: number, duration: number): AdObject;
}

export interface CreateChapterObject {
  (
    name: string,
    position: number,
    length: number,
    startTime: number
  ): ChapterObject;
}

export interface MediaHeartbeatCtor {
  new (
    delegate: MediaHeartbeatDelegate,
    config: MediaHeartbeatConfig,
    appMeasurement: Object
  ): MediaHeartbeat;
  createQoSObject: CreateQoSObject;
  createMediaObject: CreateMediaObject;
  createAdBreakObject: CreateAdBreakObject;
  createAdObject: CreateAdObject;
  createChapterObject: CreateChapterObject;
}

export interface MediaHeartbeat {
  trackPause: () => void;
  trackPlay: () => void;
  trackComplete: () => void;
  trackSessionStart: (
    mediaObj: MediaObject,
    customVideoMetadata: Object
  ) => void;
  trackSessionEnd: () => void;
  trackEvent: (
    eventName: Event,
    mediaObj?:
      | MediaObject
      | QoSObject
      | AdObject
      | AdBreakObject
      | ChapterObject,
    context?: Object
  ) => void;
  trackError: (errorId: string) => void;
  // TODO: Revisit me on whether we should add this to the interface, given that we don't use it from
  // the interface, but it is, in fact, part of the implicit interface of the Adobe MediaHeartbeat object
  // Event:               Event,
  // StreamType:          StreamType
}

interface MediaHeartbeatDelegateCtor {
  new (): MediaHeartbeatDelegate;
}

export interface MediaHeartbeatDelegate {
  getCurrentPlaybackTime: () => number;
  getQoSObject: () => QoSObject;
}

interface MediaHeartbeatConfigCtor {
  new (): MediaHeartbeatConfig;
}

export interface MediaHeartbeatConfig {
  trackingServer: string;
  channel: string;
  ovp: string;
  appVersion: string;
  playerName: string;
  ssl: boolean;
  debugLogging: boolean;
}

interface ADB {
  va: {
    MediaHeartbeat: MediaHeartbeatCtor;
    MediaHeartbeatConfig: MediaHeartbeatConfigCtor;
    MediaHeartbeatDelegate: MediaHeartbeatDelegateCtor;
  };
}

declare const ADB: ADB;
export const MediaHeartbeat = ADB.va.MediaHeartbeat;
export const MediaHeartbeatConfig = ADB.va.MediaHeartbeatConfig;
export const MediaHeartbeatDelegate = ADB.va.MediaHeartbeatDelegate;
