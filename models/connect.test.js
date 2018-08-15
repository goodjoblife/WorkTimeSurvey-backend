const { connectMongo } = require("./connect");
const assert = require("chai").assert;

describe("MongoDB version", function() {
    it("should be at least 3.x.x", async function() {
        const { db } = await connectMongo();
        const info = await db.admin().serverStatus();
        const v = parseInt(info.version.split(".")[0], 10);
        assert.isAtLeast(v, 3, `current version is ${info.version}`);
    });
});
