import { AdBreakEvent, PlayerAPI } from 'bitmovin-player';

export default interface HeartbeatDataProjections {
  toVideoUID: (player: PlayerAPI) => string;
  toCustomMetadata: (player: PlayerAPI) => string;
  toAdBreakName: (
    player: PlayerAPI,
    adBreakEvent: AdBreakEvent
  ) => string | null;
  toAdBreakPosition: (
    player: PlayerAPI,
    adBreakEvent: AdBreakEvent
  ) => number | null;
  toAdName: (player: PlayerAPI) => string;
  toAdId: (player: PlayerAPI) => string;
  toAdPosition: (player: PlayerAPI) => number | null;
  toChapterName: (player: PlayerAPI) => string;
  toChapterPosition: (player: PlayerAPI) => number | null;
  toChapterLength: (player: PlayerAPI) => number | null;
  toChapterStartTime: (player: PlayerAPI) => number | null;
}
