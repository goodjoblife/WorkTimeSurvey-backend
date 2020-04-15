const { Schema, model } = require("mongoose");

const IN_PROGRESS = "in_progress";
const COMPLETED = "completed";

const UserTaskSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    task_id: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    snapshot: {
        type: Schema.Types.Mixed,
    },
    status: {
        type: String,
        enum: [IN_PROGRESS, COMPLETED],
        required: true,
    },
    points: {
        type: Number,
    },
    createdAt: {
        type: Date,
        required: true,
    },
    updatedAt: {
        type: Date,
        required: true,
    },
    completedAt: {
        type: Date,
        required: true,
    },
});

// create index here
// UserTaskSchema.index({});

const UserTask = model("UserTask", UserTaskSchema, "user_task");

module.exports = {
    UserTask,
    UserTaskSchema,
    IN_PROGRESS,
    COMPLETED,
};
