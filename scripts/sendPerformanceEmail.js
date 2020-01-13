require("dotenv").config();

const pMap = require("p-map");
const { ObjectId } = require("mongodb");

const { connectMongo } = require("../src/models/connect");
const ExperienceModel = require("../src/models/experience_model");

const {
    ExperienceViewLogNotificationTemplate,
} = require("../src/libs/email_templates");
const emailLib = require("../src/libs/email");

const GOODJOB_DOMAIN = "https://www.goodjob.life";

const sendPerformanceEmail = async () => {
    const { db, client } = await connectMongo();
    const experienceModel = new ExperienceModel(db);

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
                        $lookup: {
                            from: "users",
                            localField: "author_id",
                            foreignField: "_id",
                            as: "user",
                        },
                    },
                    {
                        $match: {
                            "user.subscribeEmail": true,
                            "user.email": { $exists: true },
                        },
                    },
                    {
                        $unwind: "$user",
                    },
                    {
                        $lookup: {
                            from: "email_logs",
                            localField: "user._id",
                            foreignField: "user_id",
                            as: "user.email_logs",
                        },
                    },
                    {
                        $group: {
                            _id: "$author_id",
                            experiences: {
                                $push: {
                                    _id: "$_id",
                                    title: "$title",
                                    viewCount: "$view_count",
                                    type: "$type",
                                    sections: "$sections",
                                },
                            },
                            user: {
                                $first: "$user",
                            },
                        },
                    },
                ])
                .toArray();

            const userWithNewExperiences = userWithExperiences
                .filter(userWithExperience => {
                    const {
                        user: { email_logs: emailLogs },
                    } = userWithExperience;

                    return (
                        emailLogs.length === 0 ||
                        // 全部的 email logs 都是兩週前的
                        emailLogs.every(
                            log =>
                                new Date(log.created_at) <
                                new Date(new Date() - 1000 * 60 * 60 * 24 * 14)
                        )
                    );
                })
                .map(userWithExperience => {
                    const {
                        experiences,
                        user: { email_logs: emailLogs },
                    } = userWithExperience;

                    // all experiences sent before
                    const oldExperiences = emailLogs.map(
                        emailLog => emailLog.reason
                    );

                    const newExperiences = experiences
                        .filter(experience =>
                            oldExperiences.every(
                                old =>
                                    // experience 以前從沒寄過信
                                    old.experience_id.toString() !==
                                        experience._id.toString() ||
                                    // experience 有被寄過信，但是之前的 threshold 都比較小
                                    (old.experience_id.toString() ===
                                        experience._id.toString() &&
                                        old.threshold < experience.viewCount &&
                                        old.threshold < threshold)
                            )
                        )
                        .map(experience => ({
                            ...experience,
                            url: `${GOODJOB_DOMAIN}/experiences/${experience._id.toString()}`,
                        }));

                    return {
                        ...userWithExperience,
                        experiences: newExperiences,
                    };
                })
                .filter(
                    userWithExperience =>
                        userWithExperience.experiences.length > 0
                );

            const emailInfos = userWithNewExperiences.map(
                userWithExperience => {
                    // TODO: maybe send multiple experiences in one email
                    const experience = userWithExperience.experiences[0];
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
                        emailLogs: {
                            userId: userWithExperience.user._id,
                            experienceId: experience._id,
                        },
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
                }
            );

            const template = new ExperienceViewLogNotificationTemplate();

            await pMap(
                emailInfos,
                async emailInfo => {
                    const { emailLogs, email, subject } = emailInfo;
                    const current = new Date();

                    await emailLib.sendEmailsFromTemplate(
                        [email],
                        template,
                        subject
                    );

                    await db.collection("email_logs").insertOne({
                        user_id: ObjectId(emailLogs.userId),
                        created_at: current,
                        reason: {
                            experience_id: ObjectId(emailLogs.experienceId),
                            threshold,
                        },
                    });
                },
                { concurrency: 10 }
            );
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
    } finally {
        await client.close();
    }
};

module.exports = sendPerformanceEmail;
