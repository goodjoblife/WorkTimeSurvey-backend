var MongoClient = require('mongodb').MongoClient
const assert = require('chai').assert;

describe('MongoDB version', function() {
	it('should be at least 3.x.x', function(done) {
		var conn = MongoClient.connect(process.env.MONGODB_URI, function(err, db) {
			var adminDb = db.admin();
			adminDb.serverStatus(function(err, info) {
				var version = parseInt(info.version.split('.')[0]);
				assert.isAtLeast(version, 3, 'current version is ' + info.version);
				done();
			})
		})
	})
})
