const assert = require('chai').assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;

describe('CORS for clairvoyance API', function() {
    const allowed_origins = [
        "http://www.104.com.tw",
        "https://www.104.com.tw",
        "http://104.com.tw",
        "https://104.com.tw",
        "http://www.1111.com.tw",
        "http://www.518.com.tw",
        "http://www.yes123.com.tw",
        "https://www.yes123.com.tw",
    ];
    
    for(let by of ["by-job", "by-company"]) {
        const api_path = "/clairvoyance/search/" + by ;

        describe('CORS while in ' + api_path, function() {
            for (let origin of allow_origins) {
                it(origin + ' is in cors list', function(done) {
                    request(app).get(api_path)
                        .set('origin', origin)
                        .expect(422)
                        .expect(function(res) {
                            assert.propertyVal(res.header, 'access-control-allow-origin', origin);
                        })
                        .end(done);
                });
            }
        });
        it('reject other origin', function(done) {
            request(app).get(api_path)
                .set('origin', 'http://www.google.com.tw')
                .expect(404)
                .expect(function(res) {
                    assert.notProperty(res.header, 'access-control-allow-origin');
                })
                .end(done);
        });
    }
});