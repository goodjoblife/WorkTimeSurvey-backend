var MongoClient = require('mongodb').MongoClient
const assert = require('chai').assert;

function connectDB(uri){
	return new Promise(function(resolve, reject){
		var conn = MongoClient.connect(uri, function(err, db) {
			resolve(db.admin());
		})
	});
}

function getVersion(adminDb){
	return new Promise(function(resolve, reject){
		adminDb.serverStatus(function(err, info) {
			resolve(info.version);
		})
	});
}

describe('MongoDB version', function() {
	it('should be at least 3.x.x', function(done) {
		connectDB(process.env.MONGODB_URI).then(function(adminDb){
			return getVersion(adminDb);
		}).then(function(version){
			var v = parseInt(version.split('.')[0]);
			assert.isAtLeast(v, 3, 'current version is ' + version);
			done();			
		});
	})
})


