const chai = require("chai");
chai.use(require("chai-as-promised"));

const assert = chai.assert;
const MongoClient = require("mongodb").MongoClient;
const config = require("config");
const permission = require("./search-permission");

describe("Permission Library", () => {
    let db;

    before("Setup MongoDB", () =>
        MongoClient.connect(config.get("MONGODB_URI")).then(_db => {
            db = _db;
        })
    );

    const test_data = [{ expected: false }];
    [1, 0, undefined].forEach(time_and_salary_count => {
        [1, 0, undefined].forEach(reference_count => {
            test_data.push({
                counts: {
                    time_and_salary_count,
                    reference_count,
                },
                expected:
                    (time_and_salary_count || 0) + (reference_count || 0) > 0,
            });
        });
    });

    test_data.forEach(data => {
        describe(`correctly authorize user with ${JSON.stringify(
            data
        )}`, () => {
            before(() => {
                // insert test data into db
                if (data.counts) {
                    return db
                        .collection("users")
                        .insert({
                            facebook_id: "peter.shih",
                            time_and_salary_count:
                                data.counts.time_and_salary_count,
                        })
                        .then(() =>
                            db.collection("recommendations").insert({
                                user: {
                                    id: "peter.shih",
                                    type: "facebook",
                                },
                                count: data.counts.reference_count,
                            })
                        );
                }
            });

            it("search permission for user", () => {
                const user = {
                    id: "peter.shih",
                    type: "facebook",
                };

                return assert.becomes(
                    permission.resolveSearchPermission(db, user),
                    data.expected
                );
            });

            after(() => db.collection("users").deleteMany({}));

            after(() => db.collection("recommendations").deleteMany({}));
        });
    });
});
