const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;
const sinon = require('sinon');
require('sinon-as-promised');
const request = require('supertest');

const app = require('../app');
const authentication = require('../libs/authentication');
const authorization = require('../libs/authorization');

describe('GET /me/permission/search 確認使用者查詢資訊權限', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    it('hasSearchPermission is true', function() {
        const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication')
            .withArgs(sinon.match.object, 'fakeaccesstoken')
            .resolves({id: '-1', name: 'LittleWhiteYA'});

        const cachedSearchPermissionAuthorization = sandbox.stub(authorization, 'cachedSearchPermissionAuthorization')
            .withArgs(sinon.match.object, sinon.match.object, {id: '-1', type: 'facebook'})
            .resolves(true);

        return request(app).get('/me/permissions/search')
            .query({
                access_token: 'fakeaccesstoken',
            })
            .expect(200)
            .expect(function(res) {
                sinon.assert.calledOnce(cachedFacebookAuthentication);
                sinon.assert.calledOnce(cachedSearchPermissionAuthorization);

                assert.propertyVal(res.body, 'hasSearchPermission', true);
            });
    });

    it('hasSearchPermission is false if facebook auth fail', function() {
        sandbox.stub(authentication, 'cachedFacebookAuthentication').rejects();

        return request(app).get('/me/permissions/search')
            .query({
                access_token: 'fakeaccesstoken',
            })
            .expect(200)
            .expect(function(res) {
                assert.propertyVal(res.body, 'hasSearchPermission', false);
            });
    });

    it('hasSearchPermission is false if authorization fail', function() {
        const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication')
            .withArgs(sinon.match.object, 'fakeaccesstoken')
            .resolves({id: '-1', name: 'LittleWhiteYA'});
        sandbox.stub(authorization, 'cachedSearchPermissionAuthorization').rejects();

        return request(app).get('/me/permissions/search')
            .query({
                access_token: 'fakeaccesstoken',
            })
            .expect(200)
            .expect(function(res) {
                sinon.assert.calledOnce(cachedFacebookAuthentication);

                assert.propertyVal(res.body, 'hasSearchPermission', false);
            });
    });

    afterEach(function() {
        sandbox.restore();
    });
});
