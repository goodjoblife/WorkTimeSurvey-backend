const Joi = require("joi");
const EmailTemplate = require("./template");
const { EmailTemplateVariablesError } = require("../errors");
const { experience_view_log_notification } = require("email-template");

const schema = Joi.object().keys({
    username: Joi.string()
        .min(1)
        .max(30)
        .required(),
    experience: Joi.object({
        viewCount: Joi.number().required(),
        title: Joi.string().required(),
        content: Joi.string().required(),
        typeName: Joi.string().valid("面試經驗", "工作心得", "實習心得"),
        url: Joi.string()
            .uri()
            .required(),
    }),
    relatedContent: Joi.object({
        keyword: Joi.string().required(),
        experiences: Joi.array().items(
            Joi.object({
                title: Joi.string().required(),
                url: Joi.string()
                    .uri()
                    .required(),
            })
        ),
    }),
});

class ExperienceViewLogNotificationTemplate extends EmailTemplate {
    validateVariables(variables) {
        const result = Joi.validate(variables, schema);
        if (result.error === null) {
            return true;
        } else {
            throw new EmailTemplateVariablesError(result.error);
        }
    }

    /**
     * @param {string} variables.username 使用者名稱
     * @param {string} variables.experience.viewCount 瀏覽次數
     * @param {string} variables.experience.title 職場經驗標題
     * @param {string=["面試經驗", "工作心得", "實習心得"]} variables.experience.typeName 職場經驗種類
     * @param {string} variables.experience.content 職場經驗內容
     * @param {string} variables.experience.url 職場經驗網址
     * @param {string} variables.relatedContent.keyword 相關領域的關鍵字
     * @param {string} variables.relatedContent.experiences 相關領域文章列表
     * @param {string} variables.relatedContent.experiences[i].title 相關領域文章標題
     * @param {string} variables.relatedContent.experiences[i].url 相關領域文章連結
     */
    genBodyHTML({ username, experience, relatedContent }) {
        return experience_view_log_notification.genBodyHTML({
            username,
            experience,
            relatedContent,
        });
    }

    /**
     * @param {string} variables.username 使用者名稱
     * @param {string} variables.experience.viewCount 瀏覽次數
     * @param {string=["面試經驗", "工作心得", "實習心得"]} variables.experience.typeName 職場經驗種類
     */
    genSubject({ username, experience }) {
        return experience_view_log_notification.genSubject({
            username,
            experience,
        });
    }
}

module.exports = ExperienceViewLogNotificationTemplate;
