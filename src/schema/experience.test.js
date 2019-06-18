const chai = require("chai");
const request = require("supertest");
const { connectMongo } = require("../models/connect");

chai.use(require("chai-subset"));

const { assert, expect } = chai;
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
                status: "published",
                archive: {
                    is_archived: false,
                },
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
                status: "published",
                archive: {
                    is_archived: false,
                },
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
                status: "published",
                archive: {
                    is_archived: false,
                },
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
                status: "published",
                archive: {
                    is_archived: false,
                },
            },
        ])
    );

    it("will return experiences in thirty days", async () => {
        const payload = {
            query: `{
                    popular_experiences(returnNumber: 4, sampleNumber: 4) {
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
        expect(popular_experiences).containSubset([{ title: "cold" }]);
        expect(popular_experiences).to.not.containSubset([{ title: "hot" }]);
    });

    it("will experiences with most number of words", async () => {
        const payload = {
            query: `{
                    popular_experiences(returnNumber: 2, sampleNumber: 2) {
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
        assert.lengthOf(popular_experiences, 2);
        expect(popular_experiences).containSubset([{ title: "cold" }]);
        expect(popular_experiences).containSubset([{ title: "gentle" }]);
    });

    after(async () => {
        return db.collection("experiences").deleteMany({});
    });
});
