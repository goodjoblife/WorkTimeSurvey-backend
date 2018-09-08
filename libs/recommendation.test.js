const chai = require("chai");
chai.use(require("chai-as-promised"));

const assert = chai.assert;
const { connectMongo } = require("../models/connect");
const ObjectId = require("mongodb").ObjectId;

const recommendation = require("./recommendation");

describe("Recommendation Library", () => {
    describe("getRecommendationString", () => {
        let db;

        before(async () => {
            ({ db } = await connectMongo());
        });

        before(() =>
            db.collection("recommendations").insertMany([
                {
                    _id: new ObjectId("00000000ccd8958909a983e9"),
                    user: {
                        id: "-1",
                        type: "facebook",
                    },
                },
            ])
        );

        it("resolve with correct _id", () => {
            const user = {
                id: "-1",
                type: "facebook",
            };

            return assert.becomes(
                recommendation.getRecommendationString(db, user),
                "00000000ccd8958909a983e9"
            );
        });

        it("resolve with new recommendation string", async () => {
            const user = {
                id: "mark",
                type: "facebook",
            };

            const main = recommendation.getRecommendationString(db, user);

            await assert.isFulfilled(main);
            // 尋找 DB 中的 user _id 與回傳的相符
            const result = await db
                .collection("recommendations")
                .findOne({ user });
            await assert.becomes(main, result._id.toHexString());
        });

        it("will return the same recommendation string", async () => {
            const user = { id: "mark", type: "facebook" };

            const rec1 = await recommendation.getRecommendationString(db, user);
            const rec2 = await recommendation.getRecommendationString(db, user);
            assert.equal(rec1, rec2);
        });

        after(() => db.collection("recommendations").deleteMany({}));
    });

    describe("getUserByRecommendationString", () => {
        let db;

        before(async () => {
            ({ db } = await connectMongo());
        });

        before(() =>
            db.collection("recommendations").insertMany([
                {
                    _id: new ObjectId("00000000ccd8958909a983e9"),
                    user: {
                        id: "-1",
                        type: "facebook",
                    },
                },
            ])
        );

        it("resolve with correct user", () =>
            assert.becomes(
                recommendation.getUserByRecommendationString(
                    db,
                    "00000000ccd8958909a983e9"
                ),
                { id: "-1", type: "facebook" }
            ));

        it("resolve with null", () =>
            assert.becomes(
                recommendation.getUserByRecommendationString(
                    db,
                    "00000000ccd8958909a983ea"
                ),
                null
            ));

        it("reject if format error", async () => {
            // should be a string
            await assert.isRejected(
                recommendation.getUserByRecommendationString(db, 1234)
            );

            // should be a single String of 12 bytes or a string of 24 hex characters
            await assert.isRejected(
                recommendation.getUserByRecommendationString(db, "0000")
            );
        });

        after(() => db.collection("recommendations").deleteMany({}));
    });
});
