import { PlayerAPI } from 'bitmovin-player';

export default interface HeartbeatDataProjections {
  toVideoUID: (player: PlayerAPI) => string;
  toAdName: (player: PlayerAPI) => string;
  toAdId: (player: PlayerAPI) => string;
  toAdBreakPosition: (player: PlayerAPI) => number | null;
  toChapterName: (player: PlayerAPI) => string;
  toChapterPosition: (player: PlayerAPI) => number | null;
  toChapterLength: (player: PlayerAPI) => number | null;
  toChapterStartTime: (player: PlayerAPI) => number | null;
}
