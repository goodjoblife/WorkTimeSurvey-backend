const assert = require("chai").assert;
const request = require("supertest");
const app = require("../app");

describe("CORS", () => {
    const client_origins = [
        "https://worktime.goodjob.life",
        "http://hello.goodjob.life",
    ];

    for (const origin of client_origins) {
        it(`${origin} is in cors list`, () =>
            request(app)
                .get("/")
                .set("origin", origin)
                .expect(404)
                .expect(res => {
                    assert.propertyVal(
                        res.header,
                        "access-control-allow-origin",
                        origin
                    );
                }));
    }

    it("reject other origin", () =>
        request(app)
            .get("/")
            .set("origin", "http://www.google.com.tw")
            .expect(404)
            .expect(res => {
                assert.notProperty(res.header, "access-control-allow-origin");
            }));
});
