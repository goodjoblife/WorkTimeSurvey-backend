/*
    Before loading AWS SDK, please ensure you have correct
    `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` environment
    variables, and having corresponding permission to send email
*/

const AWS = require("aws-sdk");
const config = require("config");
const { EmailTemplateTypeError } = require("./errors");
const EmailTemplate = require("./email_templates/template");

// Set the region and API version
AWS.config.update({ region: config.get("AWS_SES_SERVER_REGION") });
const SES = new AWS.SES({ apiVersion: "2010-12-01" });

/* prepare constants */
// friendly from name （收到信的時候，來信者的名字）
const fromName = "職場透明化運動 GoodJob";
// 因為 AWS 只支援 ASCII character 作為 from name，這邊要做一些編碼轉換
// reference: https://github.com/aws/aws-sdk-js/issues/1585
const base64FromName = Buffer.from(fromName).toString("base64");
// this email domain must be verified by AWS
const fromEmail = "noreply@email.goodjob.life";

/**
 * 寄送一封信件到不同的電子郵件地址（內容相同）
 * @param {String[]} toAddresses 目標對象的電子郵件列表
 * @param {String} bodyHTML 內容的 html 字串 （UTF-8）
 * @param {String} subject 標題字串 （UTF-8）
 *
 * @fulfilled data success response
 * @rejected error
 */
const sendEmails = async (toAddresses, bodyHTML, subject) => {
    const params = {
        Destination: {
            ToAddresses: toAddresses,
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: bodyHTML,
                },
            },
            Subject: {
                Charset: "UTF-8",
                Data: subject,
            },
        },
        Source: `=?UTF-8?B?${base64FromName}?= <${fromEmail}>`,
    };
    return SES.sendEmail(params).promise();
};

/**
 * 寄送一封樣板信件到不同的電子郵件地址（內容相同）
 * @param {String[]} toAddresses 目標對象的電子郵件列表
 * @param {Object} template Email 樣板物件（EmailTemplate Class 的實體）
 * @param {Object} variables 變數物件
 */
const sendEmailsFromTemplate = async (toAddresses, template, variables) => {
    if (!(template instanceof EmailTemplate)) {
        throw new EmailTemplateTypeError(
            "template is not an instanceof EmailTemplate"
        );
    }

    // validate variables
    template.validateVariables(variables);

    return sendEmails(
        toAddresses,
        template.genBodyHTML(variables),
        template.genSubject(variables)
    );
};

module.exports = {
    sendEmails,
    sendEmailsFromTemplate,
};
