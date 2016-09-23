const assert = require('chai').assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;

describe('CORS', function() {
    const client_origins = [
        'http://localhost:8080',
        'http://localhost:8000',
        'https://worktime.goodjob.life',
        'http://hello.goodjob.life',
    ];

    for (let origin of client_origins) {
        it(origin + ' is in cors list', function(done) {
            request(app).get('/')
                .set('origin', origin)
                .expect(404)
                .expect(function(res) {
                    assert.propertyVal(res.header, 'access-control-allow-origin', origin);
                })
                .end(done);
        });
    }

    it('reject other origin', function(done) {
        request(app).get('/')
            .set('origin', 'http://www.google.com.tw')
            .expect(404)
            .expect(function(res) {
                assert.notProperty(res.header, 'access-control-allow-origin');
            })
            .end(done);
    });
});
