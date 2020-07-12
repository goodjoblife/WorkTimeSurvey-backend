const { Schema } = require("mongoose");
const EMAIL_STATUS = require("../email_status");

const unlockedDataSchema = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    createdAt: {
        type: Schema.Types.Date,
        required: true,
    },
});

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        minlength: 1,
    },
    email: {
        type: String,
    },
    email_status: {
        type: String,
        enum: Object.values(EMAIL_STATUS),
        default: EMAIL_STATUS.UNVERIFIED,
    },
    facebook_id: {
        type: String,
        required: function() {
            return !this.google_id;
        },
    },
    google_id: {
        type: String,
        required: function() {
            return !this.facebook_id;
        },
    },
    facebook: {
        type: Schema.Types.Mixed,
    },
    google: {
        type: Schema.Types.Mixed,
    },
    points: {
        type: Number,
        default: 0,
    },
    unlocked_experiences: [unlockedDataSchema],
    unlocked_salary_work_times: [unlockedDataSchema],
});

userSchema.index(
    { facebook_id: 1 },
    {
        unique: true,
        partialFilterExpression: { facebook_id: { $type: "string" } },
    }
);

userSchema.index(
    { google_id: 1 },
    {
        unique: true,
        partialFilterExpression: { google_id: { $type: "string" } },
    }
);

userSchema.statics.findOneByFacebookId = function(facebook_id) {
    return this.findOne({ facebook_id });
};

userSchema.statics.findOneByGoogleId = function(google_id) {
    return this.findOne({ google_id });
};

module.exports = userSchema;
