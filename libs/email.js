/*
    Before loading AWS SDK, please ensure you have correct
    `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` environment
    variables, and having corresponding permission to send email
*/

const AWS = require("aws-sdk");
const config = require("config");

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
 *
 * @param {*} toAddresses 目標對象的電子郵件列表
 * @param {*} bodyHTML 內容的 html 字串 （UTF-8）
 * @param {*} subject 標題字串 （UTF-8）
 */
const sendEmail = async (toAddresses, bodyHTML, subject) => {
    const params = {
        Destination: {
            /* required */
            // CcAddresses: [],
            ToAddresses: toAddresses,
        },
        Message: {
            /* required */
            Body: {
                /* required */
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
        Source: `=?UTF-8?B?${base64FromName}?= <${fromEmail}>` /* required */,
        // ReplyToAddresses: [],
    };
    return SES.sendEmail(params).promise();
};

/* example to handle promise's fulfilled/rejected states
    sendPromise.then(
        function(data) {
        console.log(data.MessageId);
    }).catch(
        function(err) {
        console.error(err, err.stack);
    });
*/

module.exports = {
    sendEmail,
};
