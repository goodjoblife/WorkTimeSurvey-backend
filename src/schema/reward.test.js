const { assert } = require("chai");
const request = require("supertest");
const app = require("../app");

const rewardConfigMap = require("../libs/events/reward_config");

describe("取得獎勵列表", () => {
    it("rewards", async () => {
        const payload = {
            query: /* GraphQL */ `
                {
                    rewards {
                        id
                        title
                        description
                    }
                }
            `,
            variables: null,
        };
        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        const rewards = res.body.data.rewards;
        for (let r of rewards) {
            assert.propertyVal(r, "title", rewardConfigMap[r.id].title);
            assert.propertyVal(
                r,
                "description",
                rewardConfigMap[r.id].description
            );
        }
    });
});
