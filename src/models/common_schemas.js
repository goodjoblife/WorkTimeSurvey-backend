// This file is for common joi schemas
const Joi = require("@hapi/joi");

const salarySchema = Joi.object({
    type: Joi.valid("hour", "day", "month", "year"),
    amount: Joi.when("type", {
        is: "hour",
        then: Joi.number()
            .integer()
            .min(10)
            .max(10000)
            .messages({
                "number.min":
                    "薪資過低。可能有少填寫 0，或薪資種類(年薪/月薪/日薪/時薪)選擇錯誤，請再檢查一次",
                "number.max":
                    "薪資過高。可能有多填寫 0，或薪資種類(年薪/月薪/日薪/時薪)選擇錯誤，請再檢查一次",
            }),
    })
        .when("type", {
            is: "day",
            then: Joi.number()
                .integer()
                .min(100)
                .max(120000)
                .messages({
                    "number.min":
                        "薪資過低。可能有少填寫 0，或薪資種類(年薪/月薪/日薪/時薪)選擇錯誤，請再檢查一次",
                    "number.max":
                        "薪資過高。可能有多填寫 0，或薪資種類(年薪/月薪/日薪/時薪)選擇錯誤，請再檢查一次",
                }),
        })
        .when("type", {
            is: "month",
            then: Joi.number()
                .integer()
                .min(1000)
                .max(1000000)
                .messages({
                    "number.min":
                        "薪資過低。可能有少填寫 0，或薪資種類(年薪/月薪/日薪/時薪)選擇錯誤，請再檢查一次",
                    "number.max":
                        "薪資過高。可能有多填寫 0，或薪資種類(年薪/月薪/日薪/時薪)選擇錯誤，請再檢查一次",
                }),
        })
        .when("type", {
            is: "year",
            then: Joi.number()
                .integer()
                .min(10000)
                .max(12000000)
                .messages({
                    "number.min":
                        "薪資過低。可能有少填寫 0，或薪資種類(年薪/月薪/日薪/時薪)選擇錯誤，請再檢查一次",
                    "number.max":
                        "薪資過高。可能有多填寫 0，或薪資種類(年薪/月薪/日薪/時薪)選擇錯誤，請再檢查一次",
                }),
        }),
});

module.exports = {
    salarySchema,
};
