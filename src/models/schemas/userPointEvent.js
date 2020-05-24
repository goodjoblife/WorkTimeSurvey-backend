const { Schema, model } = require("mongoose");
const {
    createSalaryWorkTime,
    createInterviewExperience,
    createWorkExperience,
    shareWebsite,
    unlockExperience,
    unlockSalaryWorkTime,
    createInterviewExperienceBonus,
    createWorkExperienceBonus,
} = require("../../libs/events/EventType");

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
            createInterviewExperienceBonus,
            createWorkExperienceBonus,
        ],
    },
    doc_id: {
        type: String,
        required: true,
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
    completed_at: {
        type: Date,
        required: true,
    },
});

// create index here
UserPointSchema.index({
    userId: -1,
    eventName: -1,
    doc_id: -1,
});

UserPointSchema.index({
    userId: -1,
    eventName: -1,
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
