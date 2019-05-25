const { assert, expect } = require("chai");
const request = require("supertest");
const { connectMongo } = require("../models/connect");

const app = require("../app");

describe("Query popular_experiences", () => {
    let db;

    before(async () => {
        ({ db } = await connectMongo());
    });

    before(() =>
        db.collection("experiences").insertMany([
            {
                created_at: new Date(),
                type: "work",
                title: "ugly",
                sections: [
                    {
                        content: "我很醜",
                    },
                ],
            },
            {
                created_at: new Date(),
                type: "work",
                title: "gentle",
                sections: [
                    {
                        content: "可是我很溫柔",
                    },
                ],
            },
            {
                created_at: new Date(),
                type: "work",
                title: "cold",
                sections: [
                    {
                        content: "外表冷漠",
                    },
                ],
            },
            {
                created_at: new Date(new Date() - 100 * 24 * 60 * 60 * 1000),
                type: "work",
                title: "hot",
                sections: [
                    {
                        content: "內心狂熱",
                    },
                ],
            },
        ])
    );

    it("will return 3 sample experiences", async () => {
        const payload = {
            query: `{
                    popular_experiences {
                        id
                        title
                    }
                }`,
            variables: null,
        };
        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        const { popular_experiences } = res.body.data;

        assert.isArray(popular_experiences);
        assert.lengthOf(popular_experiences, 3);
        expect(popular_experiences).to.not.deep.include({ title: "hot" });
    });

    after(async () => {
        return db.collection("experiences").drop();
    });
});
