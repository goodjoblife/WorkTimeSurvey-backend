const { Schema, model } = require("mongoose");
const {
    createSalaryWorkTime,
    createInterviewExperience,
    createWorkExperience,
    shareWebsite,
} = require("../../libs/events/tasks/EventType");

const {
    unlockExperience,
    unlockSalaryWorkTime,
} = require("../../libs/events/rewards/EventType");

const COMPLETED = "completed";
const ADMIN_CANCELED = "admin_canceled";

const UserPointSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    event_name: {
        type: String,
        enum: [
            createSalaryWorkTime,
            createInterviewExperience,
            createWorkExperience,
            shareWebsite,
            unlockExperience,
            unlockSalaryWorkTime,
        ],
    },
    snapshot: {
        type: Schema.Types.Mixed,
    },
    status: {
        type: String,
        enum: [COMPLETED, ADMIN_CANCELED],
        required: true,
    },
    points: {
        type: Number,
    },
    created_at: {
        type: Date,
        required: true,
    },
    updated_at: {
        type: Date,
    },
});

// create index here
UserPointSchema.index({
    user_id: -1,
    event_name: -1,
    doc_id: -1,
});

UserPointSchema.index({
    user_id: -1,
    event_name: -1,
    status: -1,
});

const UserPointEvent = model(
    "UserPointEvent",
    UserPointSchema,
    "user_point_events"
);

module.exports = {
    UserPointSchema,
    UserPointEvent,
    COMPLETED,
    ADMIN_CANCELED,
};
