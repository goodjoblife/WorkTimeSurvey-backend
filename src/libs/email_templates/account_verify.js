const Joi = require("joi");
const EmailTemplate = require("./template");
const { EmailTemplateVariablesError } = require("../errors");

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
        const result = Joi.validate(variables, schema);
        if (result.error === null) {
            return true;
        } else {
            throw new EmailTemplateVariablesError(result.error);
        }
    }

    genBodyHTML({ username, verifyUrl }) {
        return `<div>${username} 感謝您註冊職場透明化運動，點擊以下按鈕，馬上驗證您的信箱<a href="${verifyUrl}">驗證</a></div>`;
    }

    genSubject() {
        return "職場透明化運動電子信箱驗證信";
    }
}

module.exports = AccountVerifyTemplate;
