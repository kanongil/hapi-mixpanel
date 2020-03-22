'use strict';

const Hoek = require('@hapi/hoek');
const Joi = require('@hapi/joi');
const Mixpanel = require('mixpanel');


const internals = {
    queue: [],
    flushes: new Set(),
    timer: null
};


internals.schema = Joi.object().keys({
    apiKey: Joi.string(),
    endpoint: Joi.string().uri({ scheme: ['http', 'https'] }).optional()
});


internals.flushQueue = function (server) {

    clearTimeout(internals.timer);
    internals.timer = null;

    if (internals.queue.length === 0) {
        return;
    }

    const flushPromise = (async (queue) => {

        try {
            await new Promise((resolve, reject) => {

                const mixpanel = server.plugins['hapi-mixpanel'].mixpanel;
                mixpanel.track_batch(queue, (err) => {

                    return err ? reject(err) : resolve();
                });
            });
        }
        catch (err) {
            server.log(['mixpanel', 'error'], `flush failed: ${err}`);
        }
        finally {
            internals.flushes.delete(flushPromise);
        }
    })(internals.queue);

    internals.queue = [];
    internals.flushes.add(flushPromise);
};


internals.serverTrack = function (event, properties, timestamp) {

    properties = properties ? Hoek.clone(properties) : {};

    if (timestamp || timestamp === 0) {
        properties.time = timestamp;
    }

    internals.queue.push({
        event,
        properties
    });

    // Check for flush

    if (internals.queue.length >= 50) {
        internals.flushQueue(this);
    }
    else if (internals.timer === null) {
        internals.timer = setTimeout(internals.flushQueue.bind(internals, this), 10 * 1000);
    }
};


internals.register = function (server, options) {

    options = Joi.attempt(options, internals.schema);

    const config = {};

    if (options.endpoint) {
        const { protocol, hostname, port, pathname } = new URL(options.endpoint);
        config.protocol = protocol.slice(0, -1);
        config.host = hostname;
        config.port = port;
        config.path = pathname !== '/' ? pathname : '';
    }

    const mixpanel = Mixpanel.init(options.apiKey, config);

    server.expose('mixpanel', mixpanel);
    server.decorate('server', 'track', internals.serverTrack);

    server.ext('onPostStop', () => {

        // Flush and wait

        internals.flushQueue(server);
        return Promise.all([...internals.flushes]);
    });
};


exports.plugin = {
    pkg: require('../package.json'),
    register: internals.register
};
