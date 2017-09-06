module.exports = {
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost/goodjob",
    REDIS_URL: process.env.REDIS_URL || "redis://localhost",
    CORS_ANY: process.env.CORS_ANY || "FALSE",
};
