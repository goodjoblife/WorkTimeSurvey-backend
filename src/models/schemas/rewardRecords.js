const { Schema, model } = require("mongoose");

const PERMISSION = "permission";

const RewardRecordSchema = new Schema({
    user_id: {
        type: "ObjectId",
    },
    item: {
        type: String,
        enum: [PERMISSION],
    },
    points: {
        type: Number,
    },
    created_at: {
        type: Date,
    },
    meta: {
        type: Schema.Types.Mixed,
    },
});

RewardRecordSchema.index({ user_id: 1 }, { created_at: 1 });

const RewardRecord = model("reward_records", RewardRecordSchema);

module.exports = {
    RewardRecord,
    RewardRecordSchema,
    PERMISSION,
};
