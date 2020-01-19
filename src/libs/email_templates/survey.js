const Joi = require("@hapi/joi");
const EmailTemplate = require("./template");
const { EmailTemplateVariablesError } = require("../errors");
const { survey } = require("email-template");

const schema = Joi.object().keys({
    userName: Joi.string()
        .min(1)
        .required(),
    surveryUrl: Joi.string()
        .uri()
        .required(),
});

class SurveyTemplate extends EmailTemplate {
    validateVariables(variables) {
        const result = schema.validate(variables);
        if (!result.error) {
            return true;
        } else {
            throw new EmailTemplateVariablesError(result.error);
        }
    }

    genBodyHTML({ userName, surveryUrl }) {
        return survey.genBodyHTML({
            userName,
            surveryUrl,
        });
    }

    genSubject({ userName }) {
        return survey.genSubject({ userName });
    }
}

module.exports = SurveyTemplate;
