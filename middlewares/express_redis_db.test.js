const { assert } = require("chai");
const expressRedisDb = require("./express_redis_db");

describe("Redis middleware", () => {
    it("request should have property redis_client", done => {
        const middleware = expressRedisDb("");

        const req = {};
        middleware(req, {}, () => {
            try {
                assert.property(req, "redis_client");
                done();
            } catch (err) {
                done(err);
            }
        });
    });
});
