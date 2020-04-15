const User = require("../../models/schemas/userModel");
const { Task } = require("../../models/schemas/task");
const { UserTask, COMPLETED } = require("../../models/schemas/userTask");

class Event {
    constructor({ userId, taskName }) {
        this.userId = userId;
        this.taskName = taskName;
    }

    async dispatchToQueue({ snapshot, status = COMPLETED }) {
        // 從 `tasks` collection 尋找相對應的 taskId
        const task = await Task.findOne({
            name: this.taskName,
        });
        if (!task) {
            throw Error("Task not found.");
        }

        // 從 user_tasks collection 尋找使用者是否曾經完成過該 task
        const userTaskCount =
            (await UserTask.countDocuments({
                user_id: this.userId,
                task_id: task._id,
            })) || 0;

        if (task.maxRunCount > userTaskCount) {
            // 給予獎勵
            const user = await User.findOne({
                _id: this.userId,
            });
            user.points += task.points;
            await user.save();

            // 新增 user_tasks document
            const now = new Date();
            await UserTask.create({
                user_id: this.userId,
                task_id: task._id,
                status,
                points: task.points,
                createdAt: now,
                updatedAt: now,
                completedAt: now,
                snapshot,
            });
            return task.point;
        } else {
            // 執行次數達上限，無法給獎勵，throw error
            throw Error("Task has been completed by current user.");
        }
    }
}

module.exports = Event;
