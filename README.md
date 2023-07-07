# Bitmovin Player Adobe Analytics Integration
This is an open-source project to enable the use of a third-party component (Abode Video Heartbeat) with the Bitmovin Player Web SDK.

## Maintenance and Update
This project is not part of a regular maintenance or update schedule. For any update requests, please take a look at the guidance further below.

## Contributions to this project
As an open-source project, we are pleased to accept any and all changes, updates and fixes from the community wishing to use this project. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for more details on how to contribute.

## Reporting player bugs
If you come across a bug related to the player, please raise this through your support ticketing system.

## Need more help?
Should you want some help updating this project (update, modify, fix or otherwise) and cant contribute for any reason, please raise your request to your bitmovin account team, who can discuss your request.

## Support and SLA Disclaimer
As an open-source project and not a core product offering, any request, issue or query related to this project is excluded from any SLA and Support terms that a customer might have with either Bitmovin or another third-party service provider or Company contributing to this project. Any and all updates are purely at the contributor's discretion.

Thank you for your contributions!

## Requirements
-----------------
1. Adobe Experience Cloud account
1. Bitmovin account
1. Video Heartbeat library = v2.0.2
1. AppMeasurement.js from Adobe Experience Cloud
1. VisitorAPI.js from Adobe Experience Cloud

## Usage
----------------
`dist/bitmovin-player-analytics-adobe.js` provides information for each video uniquely. To handle this each instance of the Bitmovin player needs to be passed to the analytics function. This function is exposed on the window at `window.bitmovin.player.analytics.AdobeAnalytics`.

### Configuration

#### Heartbeat Config
Once initializing a player instance, you need to pass it to the `AdobeAnalytics` function to register it with your heartbeat account providing a configuration object as the first argument. All fields in the heartbeatConfig are required.

```js
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

`trackingServer`: Defines the server for tracking media heartbeats. This is different from your analytics tracking server.

`ovp`: 	Name of the online video platform through which content gets distributed.

`playerName`: Name of the video player in use. E.g.: "AVPlayer", "HTML5 Player", "My Custom VideoPlayer".

`channel`: Channel name property

`appVersion`: Version of the video player app/SDK.

`debugLogging`: Flag that indicates if you would like debug log output from Heartbeat

`ssl`: Boolean flag that indicates whether the heartbeat calls should be made over HTTPS.

#### Data Projection Overrides
The `AdobeAnalytics` function also takes a Data Projection Object which is comprised of functions that will provide additional data Heartbeat may need. Not all values in this object are required, however if your source has ads or chapters, you will need to implement the functions described under their headers.

##### Required

| Key               | Signature     | Required    | Description |
| ----------------- |:-------------:|:-----------:|-----------:|
| `toVideoUID`      |`(player:PlayerAPI) => string`| 	YES | Returns the UID for the Player|
| `toCustomMetadata`|`(player:PlayerAPI) => string`| 	YES | Returns the custom metadata for the Playback Session|

##### Ads

| Key               | Signature     | Required    | Description |
| ----------------- |:-------------:|:-----------:|-----------:|
|`toAdBreakName`    |`(player:PlayerAPI, adBreakEvent:AdBreakEvent) => string`| YES | Returns the name of the current AdBreak|
|`toAdBreakPosition`|`(player:PlayerAPI, adBreakEvent:AdBreakEvent) => number` | YES | Returns the number of the current AdBreak|
|`toAdName`         |`(player:PlayerAPI, adEvent:AdEvent) => string` | YES | Returns the Name of the current Ad|
|`toAdId`           |`(player:PlayerAPI, adEvent:AdEvent) => string` | YES | Returns the ID for the current Ad|
|`toAdPosition`     |`(player:PlayerAPI, adEvent:AdEvent) => number` | YES | Returns the number of the current Ad within current AdBreak|

##### Chapters

| Key               | Signature     | Required    | Description |
| ----------------- |:-------------:|:-----------:|-----------:|
|`toChapterName`    |`(player:PlayerAPI, chapterEvent:ChapterEvent) => string`| 	NO | Returns the name of the current Chapter |
|`toChapterPosition`|`(player:PlayerAPI, chapterEvent:ChapterEvent) => number`| 	NO | Returns the number of the current Chapter|
|`toChapterLength`  |`(player:PlayerAPI, chapterEvent:ChapterEvent) => number`| 	NO | Returns the length of the chapter in seconds|
|`toChapterStartTime`|`(player:PlayerAPI, chapterEvent:ChapterEvent) => number`| 	NO | Returns the start time in seconds of the current chapter |

### Registration
To register a player to your Heartbeat server and begin tracking, invoke the `AdobeAnalytics` function found in the player analytics:

```js
const cleanup = window.bitmovin.player.analytics.AdobeAnalytics(
  heartbeatConfig,
  player,
  dataProjectionOverrides = {}
);
```
Note, the registration of playback event callbacks with player should be done after registering the player instance to your Heartbeat server. Not doing so may cause errors.

### Cleanup
`window.bitmovin.player.analytics.AdobeAnalytics` returns a teardown method that tells the system that you are done tracking and it should begin garbage collection. When you have finished with a player just invoke the related Teardown to stop tracking
```js
cleanup();
```

Note it is up to you to call teardown whenever you would destroy the player. Not doing so will cause errors.

## Dev Environment Setup
-----------------

### Installation

1. Clone this git repository.
1. Visit [Video Heartbeat Library](https://github.com/Adobe-Marketing-Cloud/video-heartbeat-v2/releases/tag/js-v2.0.2) to download `VideoHeartbeatLibrary-js-v2.0.2.zip`.
1. Copy `VideoHeartbeat.min.js` from the libs directory in the Video Heartbeat Library to your project.
1. Download `AppMeasurement.js` and `VisitorAPI.js` from your Adobe Experience Cloud account and place them in your project.
1. Edit the current example project to include your heartbeat settings
1. Install required packages with `npm ci`.
1. Build project with `npm run build`.
1. Compiled file can be found at `public\js\bitmovin-player-adobe-analytics.js`.
1. Include the built file and the 3 Adobe Heartbeat JavaScript files in the body tag of the html file.

### Running the project

To run the project during development you can run
```
npm run start
```
this will start a webpack-dev-server that will serve the /public folder on ``localhost:8080/``

If you would prefer to just build and serve the project without the live reload you can achive this by running
```
npm run build
```
which will compile the Typescript files located in the `src/` folder into Javascript files in `/public/js` folder.
you can then start a normal http-server with
```
npm run server
```

### Generating docs
This project uses TypeDoc to generate docs. After Installation you can create your own copy of the documentation by running
```
npm run doc
```
this will generated a `doc\` folder in the root directory containing the documentation

### adobeStub

To help with development, an additional file, `adobeStub.ts`, is included in this repository. This file can replace the Adobe Heartbeat library (`adobePassthrough.ts`) in `bitmovin-heartbeat.ts`. This will allow you to view event calls to Heartbeat without the need of a Adobe Heartbeat Account.
