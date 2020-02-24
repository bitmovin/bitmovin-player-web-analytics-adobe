
export default interface HeartbeatDataProjections {
  toVideoUID: (player: bitmovin.PlayerAPI) => string;
  toAdName: (player: bitmovin.PlayerAPI) => string;
  toAdId: (player: bitmovin.PlayerAPI) => string;
  toAdBreakPosition: (player: bitmovin.PlayerAPI) => number | null;
  toAdBreakName: (player: bitmovin.PlayerAPI) => string;
  toChapterName: (player: bitmovin.PlayerAPI) => string;
  toChapterPosition: (player: bitmovin.PlayerAPI) => number | null;
  toChapterLength: (player: bitmovin.PlayerAPI) => number | null;
  toChapterStartTime: (player: bitmovin.PlayerAPI) => number | null;
};
