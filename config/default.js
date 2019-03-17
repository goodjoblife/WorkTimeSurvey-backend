module.exports = {
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost",
    MONGODB_DBNAME: process.env.MONGODB_DBNAME || "goodjob",
    REDIS_URL: process.env.REDIS_URL || "redis://localhost",
    CORS_ANY: process.env.CORS_ANY || "FALSE",
    JWT_SECRET: process.env.JWT_SECRET,
    AWS_SES_SERVER_REGION: process.env.AWS_SES_SERVER_REGION || "us-west-2",
    VERIFY_EMAIL_JWT_SECRET: process.env.VERIFY_EMAIL_JWT_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL || "https://www.goodjob.life",
};
