const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;
const sinon = require('sinon');
require('sinon-as-promised');
const request = require('supertest');

const app = require('../app');
const recommendation = require('../libs/recommendation');
const authentication = require('../libs/authentication');

describe('POST /me/recommendations 取得使用者推薦字串', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    it('get recommendation string success', function(done) {
        const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication')
            .withArgs(sinon.match.object, 'fakeaccesstoken')
            .resolves({id: '-1', name: 'mark86092'});

        const getRecommendationString = sandbox.stub(recommendation, 'getRecommendationString')
            .withArgs(sinon.match.object, {id: '-1', type: 'facebook'})
            .resolves('00000000ccd8958909a983e9');

        request(app).post('/me/recommendations')
            .send({
                access_token: 'fakeaccesstoken',
            })
            .expect(200)
            .expect(function(res) {
                sinon.assert.calledOnce(cachedFacebookAuthentication);
                sinon.assert.calledOnce(getRecommendationString);

                assert.propertyVal(res.body, 'recommendation_string', '00000000ccd8958909a983e9');
            })
            .end(done);
    });

    it('fail if facebook auth fail', function(done) {
        sandbox.stub(authentication, 'cachedFacebookAuthentication').rejects();

        request(app).post('/me/recommendations')
            .expect(401)
            .end(done);
    });

    it('fail if getRecommendationString fail', function(done) {
        sandbox.stub(authentication, 'cachedFacebookAuthentication')
            .resolves({id: '-1', name: 'mark86092'});
        sandbox.stub(recommendation, 'getRecommendationString').rejects();

        request(app).post('/me/recommendations')
            .send({
                access_token: 'fakeaccesstoken',
            })
            .expect(500)
            .end(done);
    });

    afterEach(function() {
        sandbox.restore();
    });
});
