const { Schema, model } = require("mongoose");

const TaskSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    point: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
    },
    createdAt: {
        type: Date,
        required: true,
    },
    // 最多可執行次數 / 0 代表無限
    maxRunCount: {
        type: Number,
        required: true,
    },
});

// create index here
// UserTaskSchema.index({});

const Task = model("Task", TaskSchema, "tasks");

module.exports = {
    TaskSchema,
    Task,
};
