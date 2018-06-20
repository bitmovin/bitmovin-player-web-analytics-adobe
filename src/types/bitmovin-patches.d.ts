declare namespace bitmovin {
  namespace PlayerAPI {
    type StreamType = 'progressive' | 'dash' | 'hls' | 'smooth' | 'unknown';
  }

  interface PlayerAPI {
    getManifest(): string | undefined;
    getStreamType(): PlayerAPI.StreamType;
  }

  interface SupportedTech {
    streaming: PlayerAPI.StreamType;
  }
}
