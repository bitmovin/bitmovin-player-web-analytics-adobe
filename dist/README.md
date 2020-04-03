## Requirements
-----------------
1. Adobe Experience Cloud account
1. Bitmovin account
1. Video Heartbeat library = v2.0.2
1. AppMeasurement.js from Adobe Experience Cloud
1. VisitorAPI.js from Adobe Experience Cloud

## Usage
----------------
`bitmovinplayer-adobeanalytics.js` provides information for each video uniquely. To handle this each instance of the Bitmovin player needs to be passed to the analytics function. This function is exposed on the window at `window.bitmovin.player.analytics.BitmovinPlayerAdobeVhl`

### Configuration

#### Heartbeat Config
Once initializing a player instance, you need to pass it to the `BitmovinPlayerAdobeVhl` function to register it with your heartbeat account providing a configuration object as the first argument. All fields in the heartbeatConfig are required.

```
const heartbeatConfig = ({
  trackingServer: "",
  ovp: "",
  playerName: "Test Player",
  channel: "",
  appVersion: "",
  debugLogging: true,
  ssl: false
})
```

`trackingServer` : Defines the server for tracking media heartbeats. This is different from your analytics tracking server.

`ovp` : 	Name of the online video platform through which content gets distributed.

`playerName`: Name of the video player in use. E.g.: "AVPlayer", "HTML5 Player", "My Custom VideoPlayer".

`channel`: Channel name property

`appVersion`: Version of the video player app/SDK.

`debugLogging`: Flag that indicates if you would like debug log output from Heartbeat

`ssl`: Boolean flag that indicates whether the heartbeat calls should be made over HTTPS.

#### Data Projection Overrides
The B`itmovinPlayerAdobeVhl` function also takes a Data Projection Object which is comprised of functions that will provide additional data Heartbeat may need. Not all values in this Object are required, however if your source has ads or chapters, you will need to implement the functions described under their headers.

##### Required

| Key               | Signature     | Required    | Description |
| ----------------- |:-------------:|:-----------:|-----------:|
| toVideoUID        | (player:PlayerAPI) => string | 	YES | Returns the UID for the Player|

##### Ads

| Key               | Signature     | Required    | Description |
| ----------------- |:-------------:|:-----------:|-----------:|
| toAdName          | (player:PlayerAPI, adEvent:AdEvent) => string | YES | Returns the Name of the current Ad|
| toAdId            | (player:PlayerAPI, adEvent:AdEvent) => string | YES | Returns the ID for the current Ad|
| toAdBreakPosition | (player:PlayerAPI, adBreakEvent:AdBreakEvent) => number | YES |Returns the number of the current AdBreak|

##### Chapters

| Key               | Signature     | Required    | Description |
| ----------------- |:-------------:|:-----------:|-----------:|
| toChapterName     | (player:PlayerAPI, chapterEvent:ChapterEvent) => string | 	NO | Returns the name of the current Chapter |
| toChapterPosition | (player:PlayerAPI, chapterEvent:ChapterEvent) => number | 	NO |Returns the number of the current Chapter|
| toChapterLength   | (player:PlayerAPI, chapterEvent:ChapterEvent) => number | 	NO |Returns the length of the chapter in seconds|
| toChapterStartTime| (player:PlayerAPI, chapterEvent:ChapterEvent) => number | 	NO |Returns the start time in seconds of the current chapter|

Example can be viewed in `public/js/index.js`

### Registration
To register a player to your Heartbeat server and begin tracking, invoke the `BitmovinPlayerAdobeVhl` function found in the player analytics

```
const cleanup = window.bitmovin.player.analytics.BitmovinPlayerAdobeVhl(
  heartbeatConfig,
  player,
  dataProjectionOverrides = {}
);
```

### Cleanup
`window.bitmovin.player.analytics.BitmovinPlayerAdobeVhl` returns a teardown method that tells the system that you are done tracking and it should begin garbage collection. When you have finished with a player just invoke the related Teardown to stop tracking
```
cleanup();
```

Note it is up to you to call teardown whenever you would destroy the player. Not doing so will cause errors.
