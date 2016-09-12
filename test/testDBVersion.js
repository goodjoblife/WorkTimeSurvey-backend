var MongoClient = require('mongodb').MongoClient
const assert = require('chai').assert;

describe('MongoDB version', function() {
	it('should be at least 3.x.x', function(done) {
		MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
			return new Promise(function(resolve, reject){
				_db.admin().serverStatus(function(err, info) {
					resolve(info.version);
				});
			});
		}).then(function(version){
			var v = parseInt(version.split('.')[0]);
			assert.isAtLeast(v, 3, 'current version is ' + version);
			done();			
		});
	})
})


