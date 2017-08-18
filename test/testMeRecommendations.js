const chai = require('chai');
chai.use(require("chai-as-promised"));

const assert = chai.assert;
const sinon = require('sinon');
const request = require('supertest');

const app = require('../app');
const recommendation = require('../libs/recommendation');
const authentication = require('../libs/authentication');

describe('POST /me/recommendations 取得使用者推薦字串', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    it('get recommendation string success', () => {
        const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication')
            .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
            .resolves({ facebook_id: '-1' });

        const getRecommendationString = sandbox.stub(recommendation, 'getRecommendationString')
            .withArgs(sinon.match.object, { id: '-1', type: 'facebook' })
            .resolves('00000000ccd8958909a983e9');

        return request(app).post('/me/recommendations')
            .send({
                access_token: 'fakeaccesstoken',
            })
            .expect(200)
            .expect((res) => {
                sinon.assert.calledOnce(cachedFacebookAuthentication);
                sinon.assert.calledOnce(getRecommendationString);

                assert.propertyVal(res.body, 'recommendation_string', '00000000ccd8958909a983e9');
            });
    });

    it('fail if facebook auth fail', () => {
        sandbox.stub(authentication, 'cachedFacebookAuthentication').rejects();

        return request(app).post('/me/recommendations')
            .expect(401);
    });

    it('fail if getRecommendationString fail', () => {
        sandbox.stub(authentication, 'cachedFacebookAuthentication')
            .resolves({ _id: { id: '-1', type: 'facebook' } });
        sandbox.stub(recommendation, 'getRecommendationString').rejects();

        return request(app).post('/me/recommendations')
            .send({
                access_token: 'fakeaccesstoken',
            })
            .expect(500);
    });

    afterEach(() => {
        sandbox.restore();
    });
});
