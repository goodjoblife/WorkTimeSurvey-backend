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
        type: Joi.string().valid("interview", "work", "intern"),
        url: Joi.string()
            .uri()
            .required(),
    }),
    callToActionButtonText: Joi.string().required(),
    callToActionButtonUrl: Joi.string()
        .uri()
        .required(),
    relatedFieldKeyword: Joi.string().required(),
    relatedExperiences: Joi.array().items(
        Joi.object({
            title: Joi.string().required(),
            url: Joi.string()
                .uri()
                .required(),
        })
    ),
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

    genBodyHTML(variables) {
        return experience_view_log_notification.genBodyHTML(variables);
    }

    genSubject(variables) {
        return experience_view_log_notification.genSubject(variables);
    }
}

module.exports = ExperienceViewLogNotificationTemplate;
