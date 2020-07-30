import {
  MediaHeartbeat,
  MediaObject,
  QoSObject,
  AdObject,
  AdBreakObject,
  ChapterObject,
  MediaHeartbeatDelegate,
  MediaHeartbeatConfig,
  Event
} from '../types/Heartbeat';

interface AdState extends AdObject {
  play: boolean;
  metaData: object;
}

interface AdBreakState extends AdBreakObject {
  skipCount: number;
  ad?: AdState;
}

interface session {
  play: boolean;
  complete: boolean;
  seeking: boolean;
  buffering: boolean;
  adBreak?: AdBreakState;
  mediaObject?: MediaObject;
  metadata?: object;
  startTime?: number;
  QoS?: QoSObject;
  chapter?: object;
  currentTime: number;
}

const sessionDefault: session = {
  play: false,
  complete: false,
  seeking: false,
  buffering: false,
  currentTime: 0
};

interface FunctionMap {
  [key: string]: (...args: any[]) => any;
}

const error = (er: string): void => {
  console.error(er);
};

const toEventMap = (heartbeat: MediaHeartbeatPass): FunctionMap => ({
  seekStart: () => {
    heartbeat.logUpdate('SeekStart');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.SeekStart);
  },
  seekComplete: () => {
    heartbeat.logUpdate('SeekComplete');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.SeekComplete);
  },
  bufferStart: () => {
    heartbeat.logUpdate('BufferStart');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.BufferStart);
  },
  bufferComplete: () => {
    heartbeat.logUpdate('BufferComplete');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.BufferComplete);
  },
  adBreakStart: (adBreakObj: AdBreakObject) => {
    heartbeat.logUpdate('adBreakStart');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.AdBreakStart, adBreakObj);
  },
  adStart: (adObj: AdObject, metadata: object) => {
    heartbeat.logUpdate('adStart');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.AdStart, adObj, metadata);
  },
  adComplete: () => {
    heartbeat.logUpdate('adComplete');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.AdComplete);
  },
  //TODO: There is a race case here right now if you skip the last ad sometimes adBreakComplete sets the adBreak to undefined before adSkip logs
  adSkip: () => {
    heartbeat.logUpdate('adSkip');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.AdSkip);
  },
  adBreakComplete: () => {
    heartbeat.logUpdate('adBreakComplete');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.AdBreakComplete);
  },
  bitrateChange: (qosObject: QoSObject) => {
    heartbeat.logUpdate('bitrateChange');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.BitrateChange, qosObject);
  },
  chapterStart: (chapterObj: ChapterObject) => {
    heartbeat.logUpdate('chapterStart');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.ChapterStart, chapterObj);
  },
  chapterComplete: () => {
    heartbeat.logUpdate('chapterComplete');
    heartbeat.mediaHeartbeatReal.trackEvent(Event.ChapterComplete);
  }
});

export interface MediaHeartbeatPass extends MediaHeartbeat {
  mediaHeartbeatReal: MediaHeartbeat;
}
export class MediaHeartbeatPass implements MediaHeartbeatPass {
  isDebugLoggingEnabled: boolean;
  constructor(
    public mediaDelegate: MediaHeartbeatDelegate,
    public config: MediaHeartbeatConfig,
    public appMeasurement: Object = {},
    enableDebugLogs=false
  ) {
    this.mediaHeartbeatReal = new MediaHeartbeat(
      mediaDelegate,
      config,
      appMeasurement
    );
    this.isDebugLoggingEnabled = enableDebugLogs;
  }

  logUpdate = (event: string) => {
    if (this.isDebugLoggingEnabled == true) {
      console.log({
        event
      });
    }
  };

  trackSessionStart = (mediaObject: MediaObject, customVideoMeta: Object) => {
    this.logUpdate('Session Start');
    this.mediaHeartbeatReal.trackSessionStart(mediaObject, customVideoMeta);
  };

  trackPlay = () => {
    this.logUpdate('play');
    this.mediaHeartbeatReal.trackPlay();
  };

  trackComplete = () => {
    this.logUpdate('Complete');
    this.mediaHeartbeatReal.trackComplete();
  };

  trackSessionEnd = () => {
    this.logUpdate('Session End');
    this.mediaHeartbeatReal.trackSessionEnd();
  };

  trackPause = () => {
    this.logUpdate('Paused');
    this.mediaHeartbeatReal.trackPause();
  };

  trackError = (evt: any) => {
    error(evt);
    this.mediaHeartbeatReal.trackError(evt);
  };

  trackEvent = (eventName: string, ...rest: any[]) => {
    const eventMap = toEventMap(this);
    eventMap[eventName]
      ? eventMap[eventName](...rest)
      : error('Event Map Error: ' + eventName);
  };
}
