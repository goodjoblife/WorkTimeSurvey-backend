const { Schema, model } = require("mongoose");

const PERMISSION = "permission";

const RewardRecordSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
    },
    item: {
        type: String,
        enum: [PERMISSION],
    },
    points: {
        type: Number,
        required: true,
    },
    created_at: {
        type: Date,
        required: true,
    },
    meta: {
        type: Schema.Types.Mixed,
        required: true,
    },
});

RewardRecordSchema.index({ user_id: 1 }, { created_at: 1 });

const RewardRecord = model(
    "RewardRecord",
    RewardRecordSchema,
    "reward_records"
);

module.exports = {
    RewardRecord,
    RewardRecordSchema,
    PERMISSION,
};
