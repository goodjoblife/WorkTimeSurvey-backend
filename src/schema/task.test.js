const { assert } = require("chai");
const request = require("supertest");
const app = require("../app");

const taskConfigMap = require("../libs/events/task_config");

describe("取得任務列表", () => {
    it("tasks", async () => {
        const payload = {
            query: /* GraphQL */ `
                {
                    tasks {
                        id
                        title
                        description
                        maxRunCount
                    }
                }
            `,
            variables: null,
        };
        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        const tasks = res.body.data.tasks;
        for (let t of tasks) {
            assert.propertyVal(t, "title", taskConfigMap[t.id].title);
            assert.propertyVal(
                t,
                "description",
                taskConfigMap[t.id].description
            );
            assert.propertyVal(
                t,
                "maxRunCount",
                taskConfigMap[t.id].maxRunCount
            );
        }
    });
});
