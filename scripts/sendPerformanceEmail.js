require("dotenv").config();

const pMap = require("p-map");
const { ObjectId } = require("mongodb");

const { connectMongo } = require("../src/models/connect");
const ExperienceModel = require("../src/models/experience_model");
const ModelManager = require("../src/models/manager");

const {
    ExperienceViewLogNotificationTemplate,
} = require("../src/libs/email_templates");
const { sendEmailsFromTemplate } = require("../src/libs/email");

const GOODJOB_DOMAIN = "https://www.goodjob.life";

(async () => {
    const { db, client } = await connectMongo();
    const experienceModel = new ExperienceModel(db);
    const manager = new ModelManager(db);
    const { UserModel } = manager;

    // order is important
    const viewCountThreshold = [1000, 500, 100];

    try {
        for (let threshold of viewCountThreshold) {
            const userWithExperiences = await experienceModel.collection
                .aggregate([
                    {
                        $match: {
                            status: "published",
                            "archive.is_archived": false,
                            view_count: { $gte: threshold },
                        },
                    },
                    {
                        $group: {
                            _id: "$author_id",
                            workings: {
                                $push: {
                                    _id: "$_id",
                                    title: "$title",
                                    content: "$content",
                                    url: {
                                        $concat: [
                                            `${GOODJOB_DOMAIN}/experiences/`,
                                            { $toString: "$_id" },
                                        ],
                                    },
                                    viewCount: "$view_count",
                                    type: "$type",
                                    sections: "$sections",
                                },
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "_id",
                            foreignField: "_id",
                            as: "user",
                        },
                    },
                    {
                        $unwind: "$user",
                    },
                    {
                        $match: {
                            "user.subscribeEmail": true,
                            "user.email": { $exists: true },
                            $or: [
                                {
                                    // before 14 days
                                    "user.last_email_time": {
                                        $lt: new Date(
                                            new Date() -
                                                1000 * 60 * 60 * 24 * 14
                                        ),
                                    },
                                },
                                { "user.last_email_time": { $exists: false } },
                            ],
                        },
                    },
                ])
                .toArray();

            const template = new ExperienceViewLogNotificationTemplate();

            const emailInfos = userWithExperiences.map(userWithExperience => {
                // TODO: maybe send multiple experiences in one email
                const experience = userWithExperience.workings[0];
                const content = experience.sections
                    .map(section => section.content)
                    .join("\n");

                let typeName;
                if (experience.type === "intern") {
                    typeName = "實習心得";
                } else if (experience.type === "interview") {
                    typeName = "面試經驗";
                } else {
                    typeName = "工作心得";
                }

                return {
                    email: userWithExperience.user.email,
                    userId: userWithExperience.user._id,
                    subject: {
                        username: userWithExperience.user.name,
                        experience: {
                            title: experience.title,
                            viewCount: experience.viewCount,
                            url: experience.url,
                            typeName,
                            content,
                        },
                    },
                };
            });

            await pMap(
                emailInfos,
                async emailInfo => {
                    const { userId, email, subject } = emailInfo;
                    const current = new Date();

                    await sendEmailsFromTemplate([email], template, subject);

                    await UserModel.collection.updateOne(
                        { _id: ObjectId(userId) },
                        { $set: { last_email_time: current } }
                    );
                },
                { concurrency: 10 }
            );
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
})();
