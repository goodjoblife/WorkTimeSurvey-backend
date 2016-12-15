const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;
const sinon = require('sinon');
require('sinon-as-promised');
const request = require('supertest');

const app = require('../app');
const recommendation = require('../libs/recommendation');
const facebook = require('../libs/facebook');

describe('POST /me/recommendations 取得使用者推薦字串', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    it('get recommendation string success', function(done) {
        sandbox.stub(facebook, 'accessTokenAuth').resolves({id: '-1', name: 'mark86092'});
        sandbox.stub(recommendation, 'getRecommendationString').resolve('00000000ccd8958909a983e9');

        request(app).post('/me/recommendations')
            .expect(200)
            .expect(function(res) {
                assert.propertyVal(res.body, 'recommendation_string', '00000000ccd8958909a983e9');
            })
            .end(done);
    });

    it('fail if facebook auth fail', function(done) {
        sandbox.stub(facebook, 'accessTokenAuth').reject();

        request(app).post('/me/recommendations')
            .expect(401)
            .end(done);
    });

    afterEach(function() {
        sandbox.restore();
    });
});
