'use strict';

// Load modules

const Code = require('@hapi/code');
const Hapi = require('@hapi/hapi');
const HapiMixpanel = require('..');
const Hoek = require('@hapi/hoek');
const Lab = require('@hapi/lab');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const { describe, it } = lab;
const { expect } = Code;


describe('HapiMixpanel', () => {

    const setupServer = async (options = { apiKey: 'hello' }) => {

        const errors = [];
        const server = Hapi.server();

        server.events.on({ name: 'log', filter: { tags: ['mixpanel', 'error'], all: true } }, (event, tags) => {

            errors.push(event);
        });

        await server.register({
            plugin: HapiMixpanel,
            options
        });

        await server.initialize();

        return { server, errors };
    };

    it('exposes client', async () => {

        const { server } = await setupServer();

        expect(server.plugins['hapi-mixpanel'].mixpanel.track).to.exist();

        await server.stop();
    });

    it('supports server.track()', async () => {

        const { server, errors } = await setupServer();

        server.track('hi');
        server.track('hi again', null, new Date());
        server.track('hello', null, 0);

        await server.stop();

        expect(errors).to.be.empty();
    });

    it('logs errors', async () => {

        const { server, errors } = await setupServer({ apiKey: 'hello', endpoint: 'http://does.not.exist:1234' });

        server.track('hi', { ok: true });

        await server.stop();

        expect(errors.length).to.equal(1);
        expect(errors[0].data).to.contain('flush failed: Error: getaddrinfo ENOTFOUND does.not.exist');
    });

    it('flushes internal queue when full', async () => {

        const { server, errors } = await setupServer({ apiKey: 'hello', endpoint: 'http://does.not.exist:1234' });

        for (let i = 0; i < 50; ++i) {
            server.track('hi');
        }

        await Hoek.wait(200);

        expect(errors.length).to.equal(1);
        expect(errors[0].data).to.contain('flush failed: Error: getaddrinfo ENOTFOUND does.not.exist');

        await server.stop();
    });
});
