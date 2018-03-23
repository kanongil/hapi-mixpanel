# Hapi-Mixpanel

Hapi.js plugin that adds a `server.track()` method, which sends events to Mixpanel.

[![Build Status](https://secure.travis-ci.org/kanongil/hapi-mixpanel.svg)](http://travis-ci.org/kanongil/hapi-mixpanel)

Lead Maintainer - [Gil Pedersen](https://github.com/kanongil)

## Usage

Register plugin to add a `server.track()` method.

```js
    await server.register({
        plugin: HapiMixpanel,
        options
    });
```

### Registration options

  - `apiKey` - Your mixpanel provided api token.
  - `endpoint` - optional endpoint url used to send tracking events.

### `server.track(eventName, [properties], [timestamp])`

Records an event called `eventName` with the specified properties and timestamp.

This is queued internally, and sent to the mixpanel backend in batches.
