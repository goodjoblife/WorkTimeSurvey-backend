const MongoClient = require('mongodb').MongoClient;
const assert = require('chai').assert;

describe('MongoDB version', function() {
    it('should be at least 3.x.x', function() {
        return MongoClient.connect(process.env.MONGODB_URI)
            .then(db => db.admin().serverStatus())
            .then(info => {
                let v = parseInt(info.version.split('.')[0]);
                assert.isAtLeast(v, 3, 'current version is ' + info.version);
            });
    });
});
