var TRACKING_SERVER = 'ADOBE d3 TRACKING SERVER'; //'<organization-name>.d3.sc.omtrdc.net';

// Bitmovin player config object
var playerConfig = {
  key: 'YOUR PLAYER KEY HERE',
  advertising: {
    adBreaks: [
      {
        tag: {
          url:
            'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=%2F32573358%2Fskippable_ad_unit&gdfp_req=1&env=vp&output=xml_vast3&unviewed_position_start=1&eid=495644008&sdkv=h.3.198.2&sdki=3c0d&correlator=1919695060472234&scor=2016491895316387&adk=3454041677&media_url=blob%3Ahttp%253a%2F%2Flocalhost%253a8080%2F292b4e26-2725-457e-8a69-e5f90e472b28&u_so=l&osd=2&frm=0&sdr=1&is_amp=0&adsid=NT&jar=2018-3-29-13&mpt=bitmovin-player&afvsz=450x50%2C468x60%2C480x70&url=null&ged=ve4_td3_tt0_pd3_la3000_er0.0.0.0_vi0.0.862.539_vp0_eb16491',
          type: 'vast'
        },
        id: 'pre-roll-1',
        position: 'pre'
      },
      {
        tag: {
          url:
            'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dlinear&correlator=',
          type: 'vast'
        },
        id: 'post-roll-1',
        position: 'post'
      }
    ]
  },
  ui: {
    metadata: {
      markers: [
        { time: 24, title: 'First Chapter' },
        { time: 69, title: 'Chapter 2' },
        { time: 105, title: 'Chapter 3' },
        { time: 188, duration: 11, title: 'Last Chapter' }
      ]
    }
  }
};

var sourceConfig = {
  title: 'Red Bull Parkour',
  dash:
    '//bitmovin-a.akamaihd.net/content/MI201109210084_1/mpds/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.mpd',
  hls:
    '//bitmovin-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
  progressive:
    '//bitmovin-a.akamaihd.net/content/MI201109210084_1/MI201109210084_mpeg-4_hd_high_1080p25_10mbits.mp4',
  poster: '//bitmovin-a.akamaihd.net/content/MI201109210084_1/poster.jpg'
};

var toDataProjectionOverrides = function(player) {
  var ID_LOCATION = 4;
  var startedAdBreaksMap = new Map();

  function updateStartedAdBreaksMap(adBreakEvent) {
    startedAdBreaksMap.set(JSON.stringify(adBreakEvent), adBreakEvent);
    return Array.from(startedAdBreaksMap.values());
  }

  function sortedAdBreakSlots(adBreakEvent) {
    var adBreaks = player.getConfig().advertising.adBreaks;
    var previousAdBreaks = updateStartedAdBreaksMap(adBreakEvent);
    var scheduledAdBreaks = player.ads.list();
    var mergedAdBreakSlots = previousAdBreaks.concat(scheduledAdBreaks);

    return Object.keys(mergedAdBreakSlots)
      .map(function(key) {
        return [
          JSON.stringify(mergedAdBreakSlots[key]),
          normalizeAdTime(mergedAdBreakSlots[key].position)
        ];
      })
      .sort(compareAdBreaks);
  }

  function compareAdBreaks(a, b) {
    return a[1] - b[1];
  }

  function normalizeAdTime(offset) {
    var specials = {
      pre: 0,
      post: 100
    };
    //need explicit undefined due to value can = 0
    return specials[offset] !== undefined
      ? specials[offset]
      : //replace with special or remove all non numeric values
        parseInt(offset.replace(/\D*/, ''));
  }

  //TODO: Add documentation / comments so others can understand this
  return {
    //In a real implementation you would want to derive this
    toVideoUID: function(player) {
      var type = player.getStreamType();
      var source = player.getSource()[type];
      return source.split('/')[ID_LOCATION];
    },
    toCustomMetadata: function(player) {
      const customMetadata = {};
      customMetadata['device'] = 'Desktop';
      customMetadata['os'] = 'macos';
      return customMetadata;
    },
    toAdName: function(player, adEvent) {
      //TODO: We are heavily abusing the fact we know the format of the click-through to parse it.
      //      Other users will need to adjust this to match the click-through urls generated by their ad
      //      system if they want to follow the pattern
      var url = adEvent.ad.clickThroughUrl;
      var getAdInfo = /(adurl=)(.+)(?=\&|$)/.exec(url);
      return getAdInfo[2];
    },
    toAdId: function(player, adEvent) {
      //TODO: same as above this REGEX is highly specialized to the format we currently know we are getting back
      var url = adEvent.ad.clickThroughUrl;
      var getAdInfo = /(sig=)(.+?)(?=\&|$)/.exec(url);
      return getAdInfo[2];
    },

    //TODO: We are using AdBreakName as a source of truth to signify adBreak Change.
    //      Might hit race problems or other problems if the two functions desync
    toAdBreakPosition: function(player, adBreakEvent) {
      var adBreaksSlots = sortedAdBreakSlots(adBreakEvent.adBreak);

      var adBreakIndex = adBreaksSlots.findIndex(function(slot) {
        return slot[0] === JSON.stringify(adBreakEvent.adBreak);
      });

      // The positions of the ad breaks in the content start with 1
      return adBreakIndex + 1;
    },
    toChapterName: function(player, chapterEvent) {
      return chapterEvent.title;
    },
    toChapterPosition: function(player, chapterEvent) {
      return chapterEvent.position;
    },
    toChapterLength: function(player, chapterEvent) {
      return chapterEvent.interval[1] === Number.POSITIVE_INFINITY
        ? player.getDuration() - chapterEvent.interval[0]
        : chapterEvent.interval[1] - chapterEvent.interval[0];
    },
    toChapterStartTime: function(player, chapterEvent) {
      return chapterEvent.time;
    }
  };
};

var appMeasurement = new AppMeasurement('ADOBE REPORT SUITE ID');
var visitor = Visitor.getInstance('ADOBE ORGANIZATION ID');
visitor.trackingServer = TRACKING_SERVER;
visitor.setCustomerIDs({
  userId: {
    id: 'sample-dpid'
  },
  puuid: {
    id: 'sample-dpuuid'
  }
});
appMeasurement.visitor = visitor;
appMeasurement.trackingServer = TRACKING_SERVER;
appMeasurement.account = 'ADOBE REPORT SUITE ID';
appMeasurement.charSet = 'UTF­8';

const mediaConfigObj = {
  trackingServer: 'ADOBE HEARTBEAT TRACKING SERVER', //<organization-name>.hb.omtrdc.net
  ovp: '',
  playerName: '',
  channel: '',
  appVersion: '',
  debugLogging: false,
  ssl: false
};

var playerInstance = new bitmovin.player.Player(
  document.getElementById('player'),
  playerConfig
);
playerInstance.load(sourceConfig).then(
  function() {
    console.log('Successfully created bitmovin player instance');
  },
  function(reason) {
    console.log('Error while creating bitmovin player instance');
  }
);

window.bitmovin.player.analytics.BitmovinPlayerAdobeVhl(
  mediaConfigObj,
  playerInstance,
  toDataProjectionOverrides(playerInstance),
  appMeasurement
);
