module.exports = {
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost",
    MONGODB_DBNAME: process.env.MONGODB_DBNAME || "goodjob",
    REDIS_URL: process.env.REDIS_URL || "redis://localhost",
    CORS_ANY: process.env.CORS_ANY || "FALSE",
    JWT_SECRET: process.env.JWT_SECRET,
    AWS_SES_SERVER_REGION: process.env.AWS_SES_SERVER_REGION || "us-west-2",
    CONTENTFUL_ACCESS_TOKEN:
        process.env.CONTENTFUL_ACCESS_TOKEN || "FakeTokenYouWillFail",
    CONTENTFUL_SPACE: process.env.CONTENTFUL_SPACE || "rhotsuly6hr2",
    CONTENTFUL_PREVIEW: process.env.CONTENTFUL_PREVIEW || "on",
};
