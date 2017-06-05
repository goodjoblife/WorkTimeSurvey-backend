const MongoClient = require('mongodb').MongoClient;
const assert = require('chai').assert;
const config = require('config');

describe('MongoDB version', function() {
    it('should be at least 3.x.x', async function() {
        const db = await MongoClient.connect(config.get('MONGODB_URI'));
        const info = await db.admin().serverStatus();
        const v = parseInt(info.version.split('.')[0]);
        assert.isAtLeast(v, 3, 'current version is ' + info.version);
    });
});
