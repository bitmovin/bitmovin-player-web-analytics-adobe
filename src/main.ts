import { HeartbeatAnalytics } from './bitmovin-heartbeat';
// Importing this file just to check and potentially add polyfills for Object#assign
// Array#findIndex.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
import './utils/polyfills';

// Export Heartbeat Analytics to global namespace
let w = window as any;
w.bitmovin = w.bitmovin || {};
w.bitmovin.player = w.bitmovin.player || {};
w.bitmovin.player.analytics = w.bitmovin.player.analytics || {};
w.bitmovin.player.analytics.AdobeAnalytics = HeartbeatAnalytics;
