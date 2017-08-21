const chai = require('chai');
chai.use(require("chai-as-promised"));

const assert = chai.assert;
const sinon = require('sinon');
const request = require('supertest');

const app = require('../app');
const authentication = require('../libs/authentication');
const authorization = require('../libs/authorization');
const recommendation = require('../libs/recommendation');

describe('GET /me/permission/search 確認使用者查詢資訊權限', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    it('hasSearchPermission is true', () => {
        const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication')
            .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
            .resolves({ facebook_id: '-1' });

        const cachedSearchPermissionAuthorization = sandbox.stub(authorization, 'cachedSearchPermissionAuthorization')
            .withArgs(sinon.match.object, sinon.match.object, { id: '-1', type: 'facebook' })
            .resolves(true);

        return request(app).get('/me/permissions/search')
            .query({
                access_token: 'fakeaccesstoken',
            })
            .expect(200)
            .expect((res) => {
                sinon.assert.calledOnce(cachedFacebookAuthentication);
                sinon.assert.calledOnce(cachedSearchPermissionAuthorization);

                assert.propertyVal(res.body, 'hasSearchPermission', true);
            });
    });

    it('hasSearchPermission is false if facebook auth fail', () => {
        sandbox.stub(authentication, 'cachedFacebookAuthentication').rejects();

        return request(app).get('/me/permissions/search')
            .query({
                access_token: 'fakeaccesstoken',
            })
            .expect(200)
            .expect((res) => {
                assert.propertyVal(res.body, 'hasSearchPermission', false);
            });
    });

    it('hasSearchPermission is false if authorization fail', () => {
        const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication')
            .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
            .resolves({ facebook_id: '-1' });
        sandbox.stub(authorization, 'cachedSearchPermissionAuthorization').rejects();

        return request(app).get('/me/permissions/search')
            .query({
                access_token: 'fakeaccesstoken',
            })
            .expect(200)
            .expect((res) => {
                sinon.assert.calledOnce(cachedFacebookAuthentication);

                assert.propertyVal(res.body, 'hasSearchPermission', false);
            });
    });

    afterEach(() => {
        sandbox.restore();
    });
});

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
