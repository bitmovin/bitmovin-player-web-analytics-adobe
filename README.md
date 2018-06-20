# bitmovin-player-analytics-adobe
----
This package allows for the integration of your Abode Video Heartbeat Analytics system with your Bitmovin Player.

## Requirements
-----------------
1. Adobe Experience Cloud account
1. Bitmovin account
1. Node version >= v6.11.5
1. Yarn version >= v1.0.0
1. Video Heartbeat library = v2.0.2
1. AppMeasurement.js from Adobe Experience Cloud
1. VisitorAPI.js from Adobe Experience Cloud

## Getting started
----------------
1. Clone this git repository.
2. Visit [Video Heartbeat Library](https://github.com/Adobe-Marketing-Cloud/video-heartbeat-v2/releases/tag/js-v2.0.2) to download `VideoHeartbeatLibrary-js-v2.0.2.zip`.
3. Copy `VideoHeartbeat.min.js` from the libs directory in the Video Heartbeat Library to your project.
4. Download `AppMeasurement.js` and `VisitorAPI.js` from your Adobe Experience Cloud account and place them in your project.
5. Install required packages with `yarn install`.
6. Build project with `yarn run build`.
7. Compiled file can be found at `public\js\bitmovin-heartbeat.js`.
8. Include the built file and the 3 Adobe Heartbeat JavaScript files in the body tag your root html file.

## Usage
----------------
bitmovin-player-analytics-adobe provides information for each video uniquely. To handle this each instance of the Bitmovin player needs to be passed to the analytics function. This function is exposed on the window at `window.bitmovin.player.analytics.HeartbeatAnalytics`

### Configuration

#### Heartbeat Config
Once initializing a player instance, you need to pass it to the HeartbeatAnalytics function to register it with your heartbeat account providing a configuration object as the first argument. All fields in the heartbeatConfig are required.

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
The Heartbeat Analytics Function also takes a Data Projection Object which is comprised of functions that will provide additional data Heartbeat may need. Not all values in this Object are required, however if your source has ads or chapters, you will need to implement the functions described under their headers.

##### Required

| Key               | Signature     | Required    | Description |
| ----------------- |:-------------:|:-----------:|-----------:|
| toVideoUID        | (player:PlayerAPI) => string | 	YES | Returns the UID for the Player|

##### Ads

| Key               | Signature     | Required    | Description |
| ----------------- |:-------------:|:-----------:|-----------:|
| toAdName          | (player:PlayerAPI, adEvent:AdEvent) => string | YES | Returns the Name of the current Ad|
| toAdId            | (player:PlayerAPI, adEvent:AdEvent) => string | YES | Returns the ID for the current Ad|
| toAdBreakName     | (player:PlayerAPI, adEvent:AdEvent) => string | 	NO |Returns a name for the current AdBreak|
| toAdBreakPosition | (player:PlayerAPI, adEvent:AdEvent) => number | YES |Returns the number of the current AdBreak|

##### Chapters

| Key               | Signature     | Required    | Description |
| ----------------- |:-------------:|:-----------:|-----------:|
| toChapterName     | (player:PlayerAPI, chapterEvent:ChapterEvent) => string | 	NO | Returns the name of the current Chapter |
| toChapterPosition | (player:PlayerAPI, chapterEvent:ChapterEvent) => number | 	NO |Returns the number of the current Chapter|
| toChapterLength   | (player:PlayerAPI, chapterEvent:ChapterEvent) => number | 	NO |Returns the length of the chapter in seconds|
| toChapterStartTime| (player:PlayerAPI, chapterEvent:ChapterEvent) => number | 	NO |Returns the start time in seconds of the current chapter|

Example can be viewed in `public/js/index.js`

### Registration
To register a player to your Heartbeat server and begin tracking, invoke the HeartbeatAnalytics function found in the player analytics

```
const cleanup = window.bitmovin.player.analytics.HeartbeatAnalytics(
  heartbeatConfig,
  player,
  dataProjectionOverrides = {}
);
```

### Cleanup
`window.bitmovin.player.analytics.HeartbeatAnalytics` returns a teardown method that tells the system that you are done tracking and it should begin garbage collection. When you have finished with a player just invoke the related Teardown to stop tracking
```
cleanup();
```

Note it is up to you to call teardown whenever you would destroy the player. Not doing so will cause errors.

## Dev Environment Setup
-----------------

### Installation

1. Follow the getting started instructions
2. Edit the current example project to include your heartbeat settings

### Running the project

To run the project during development you can run
```
yarn run start
```
this will start a webpack-dev-server that will serve the /public folder on ``localhost:8080/``

If you would prefer to just build and serve the project without the live reload you can achive this by running
```
yarn run build
```
which will compile the Typescript files located in the `src/` folder into Javascript files in `/public/js` folder.
you can then start a normal http-server with
```
yarn run server
```

### Generating docs
This project uses TypeDoc to generate docs. After Installation you can create your own copy of the documentation by running
```
yarn run doc
```
this will generated a `doc\` folder in the root directory containing the documentation

### Prettier
This project used Prettier for style consistency. This is built into the commit hook, however it may also be run manually through
```
yarn run format
```

### adobeStub

To help with development, an additional file, `adobeStub.ts`, is included in this repository. This file can replace the Adobe Heartbeat library in `bitmovin-heartbeat.ts`. This will allow you to view event calls to Heartbeat without the need of a Adobe Heartbeat Account.
