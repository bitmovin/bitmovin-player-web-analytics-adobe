import {
  MediaHeartbeat,
  MediaObject,
  QoSObject,
  AdObject,
  AdBreakObject,
  ChapterObject,
  MediaHeartbeatDelegate,
  MediaHeartbeatConfig
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

const toEventMap = (heartbeat: MediaHeartbeatStub): FunctionMap => ({
  seekStart: () => {
    heartbeat.session.seeking = true;
    heartbeat.logUpdate('SeekStart');
  },
  seekComplete: () => {
    heartbeat.session.seeking = false;
    heartbeat.logUpdate('SeekComplete');
  },
  bufferStart: () => {
    heartbeat.session.buffering = true;
    heartbeat.logUpdate('BufferStart');
  },
  bufferComplete: () => {
    heartbeat.session.buffering = false;
    heartbeat.logUpdate('BufferComplete');
  },
  adBreakStart: (adBreakObj: AdBreakObject) => {
    heartbeat.session.adBreak = Object.assign(adBreakObj, { skipCount: 0 });
    heartbeat.logUpdate('adBreakStart');
  },
  adStart: (adObj: AdObject, metadata: object) => {
    if (heartbeat.session.adBreak) {
      heartbeat.session.adBreak.ad = Object.assign(adObj, {
        metaData: metadata,
        play: true
      });
    } else {
      heartbeat.logUpdate('Ad attempted to start before AdBreak');
    }
    heartbeat.logUpdate('adStart');
  },
  adComplete: () => {
    if (heartbeat.session.adBreak && heartbeat.session.adBreak.ad) {
      heartbeat.session.adBreak.ad.play = false;
    }
    heartbeat.logUpdate('adComplete');
  },
  //TODO: There is a race case here right now if you skip the last ad sometimes adBreakComplete sets the adBreak to undefined before adSkip logs
  adSkip: () => {
    if (heartbeat.session.adBreak && heartbeat.session.adBreak.ad) {
      heartbeat.session.adBreak.ad.play = false;
      heartbeat.session.adBreak.skipCount += 1;
      heartbeat.logUpdate('adSkip');
    }
  },
  adBreakComplete: () => {
    heartbeat.session.adBreak = undefined;
    heartbeat.logUpdate('adBreakComplete');
  },
  bitrateChange: (qosObject: object) => {
    const newQoSObj = qosObject;
    heartbeat.session.QoS = Object.assign({}, heartbeat.session.QoS, newQoSObj);
    heartbeat.logUpdate('bitrateChange');
  },
  chapterStart: (chapterObj: object) => {
    heartbeat.session.chapter = chapterObj;
    heartbeat.logUpdate('chapterStart');
  },
  chapterComplete: () => {
    heartbeat.logUpdate('chapterComplete');
  }
});

export class MediaHeartbeatStub implements MediaHeartbeat {
  private getTime: () => number;
  private getQoSObject: () => QoSObject;
  constructor(
    public mediaDelegate: MediaHeartbeatDelegate,
    public config: MediaHeartbeatConfig,
    public appMeasurement: Object = {},
    public session: session = sessionDefault,
    private interval = null
  ) {
    (this.getTime = mediaDelegate.getCurrentPlaybackTime),
      (this.getQoSObject = mediaDelegate.getQoSObject);
  }

  logUpdate = (event: string) => {
    console.log({
      event,
      session: this.session
    });
  };

  trackSessionStart = (mediaObject: MediaObject, customVideoMeta: Object) => {
    this.interval = setInterval(() => {
      this.session.QoS = this.getQoSObject();
      this.session.currentTime = this.getTime();
      this.logUpdate('Get QoS');
    }, 10000);
    this.session.mediaObject = mediaObject;
    this.session.metadata = customVideoMeta;
    this.session.startTime = this.getTime();
    this.session.QoS = this.getQoSObject();
    this.logUpdate('Session Start');
  };

  trackPlay = () => {
    this.session.play = true;
    this.logUpdate('play');
  };

  trackComplete = () => {
    this.session.play = false;
    this.session.complete = true;
    this.logUpdate('Complete');
  };

  trackSessionEnd = () => {
    this.session = sessionDefault;
    this.logUpdate('Session End');
    window.clearInterval(this.interval);
  };

  trackPause = () => {
    this.session.play = false;
    this.logUpdate('Paused');
  };

  trackError = (evt: any) => {
    error(evt);
  };

  trackEvent = (eventName: string, ...rest: any[]) => {
    const eventMap = toEventMap(this);
    eventMap[eventName]
      ? eventMap[eventName](...rest)
      : error('Event Map Error: ' + eventName);
  };

  static createQoSObject(
    bitrate: number,
    startUpTime: number,
    fps: number,
    droppedFrames: number
  ): QoSObject {
    return {
      data: {
        bitrate,
        startUpTime,
        fps,
        droppedFrames
      }
    };
  }

  static createAdObject(
    name: string,
    adId: string,
    position: number,
    duration: number
  ): AdObject {
    return {
      name,
      adId,
      position,
      length
    };
  }

  static createMediaObject(
    name: string,
    mediaId: string,
    length: number,
    streamType: string
  ): MediaObject {
    return { name, mediaId, length, streamType };
  }
  static createAdBreakObject(
    name: string,
    position: number,
    startTime: number
  ): AdBreakObject {
    return { name, position, startTime };
  }

  static createChapterObject(
    name: string,
    position: number,
    length: number,
    startTime: number
  ): ChapterObject {
    return { name, position, length, startTime };
  }
}
