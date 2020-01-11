const Joi = require("@hapi/joi");
const EmailTemplate = require("./template");
const { EmailTemplateVariablesError } = require("../errors");
const { account_verify } = require("email-template");

const schema = Joi.object().keys({
    username: Joi.string()
        .min(1)
        .max(30)
        .required(),
    verifyUrl: Joi.string()
        .uri()
        .required(),
});

class AccountVerifyTemplate extends EmailTemplate {
    validateVariables(variables) {
        const result = schema.validate(variables);
        if (!result.error) {
            return true;
        } else {
            throw new EmailTemplateVariablesError(result.error);
        }
    }

    genBodyHTML({ username, verifyUrl }) {
        return account_verify.genBodyHTML({ username, verifyUrl });
    }

    genSubject() {
        return account_verify.genSubject();
    }
}

module.exports = AccountVerifyTemplate;
