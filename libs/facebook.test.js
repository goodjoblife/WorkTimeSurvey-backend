const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
const assert = chai.assert;
const facebook = require('./facebook');
const nock = require('nock');

describe('libs/facebook.js', () => {
    describe('accessTokenAuth', () => {
        it('rejected if no access_token is passed', () => assert.isRejected(facebook.accessTokenAuth()));

        it('rejected if response contain error', () => {
            const access_token = 'fack_access_token';
            const response = { error: 'error' };

            nock('https://graph.facebook.com:443').get('/v2.6/me')
                .query({
                    access_token,
                    fields: "id,name",
                    format: "json",
                })
                .reply(200, response);
            return assert.isRejected(facebook.accessTokenAuth(access_token));
        });

        it('fullfilled if response is correct', () => {
            const access_token = 'fack_access_token';
            const response = { id: '-1', name: 'test' };

            nock('https://graph.facebook.com:443').get('/v2.6/me')
                .query({
                    access_token,
                    fields: "id,name",
                    format: "json",
                })
                .reply(200, response);
            return assert.becomes(facebook.accessTokenAuth(access_token), response);
        });
    });
});

