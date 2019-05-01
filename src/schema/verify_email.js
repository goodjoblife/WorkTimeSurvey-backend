const { gql } = require("apollo-server-express");
const { combineResolvers } = require("graphql-resolvers");
const qs = require("querystring");
const winston = require("winston");
const { isAuthenticated } = require("../utils/resolvers");
const { issueToken, verifyToken } = require("../utils/verify_email_token");
const { signUser } = require("../utils/jwt");
const emailLib = require("../libs/email");
const { AccountVerifyTemplate } = require("../libs/email_templates");
const { VERIFIED, SENT_VERIFICATION_LINK } = require("../models/user_model");

const FRONTEND_URL = process.env.FRONTEND_URL;

const Type = `
`;

const Query = `
`;

const Mutation = gql`
    input SendVerifyEmailInput {
        "要驗證的使用者的信箱"
        email: String!
        "驗證成功後，按鈕會導向的 URL"
        redirect_url: String!
    }

    type SendVerifyEmailPayload {
        status: String!
    }

    input VerifyEmailInput {
        token: String!
    }

    type VerifyEmailPayload {
        "登入用 token"
        token: String!
        "驗證成功後，按鈕會導向的 URL，與 SendVerifyEmailInput 一致"
        redirect_url: String!
    }

    extend type Mutation {
        "發送驗證信"
        sendVerifyEmail(input: SendVerifyEmailInput!): SendVerifyEmailPayload!

        "驗證信箱"
        verifyEmail(input: VerifyEmailInput!): VerifyEmailPayload!
    }
`;

const buildVerifyUrl = ({ token }) => {
    const search = qs.stringify({ token: token });
    return `${FRONTEND_URL}/verify?${search}`;
};

const resolvers = {
    Mutation: {
        sendVerifyEmail: combineResolvers(
            isAuthenticated,
            async (root, { input }, { user, manager }) => {
                /**
                 * 1. Issue 驗證用 token
                 * 2. 建立範本並寄送 email
                 * 3. 標記成 SENT_VERIFICATION_LINK
                 */
                // 可以做的 TODO
                // email 格式檢查
                // 使用者 email_status 檢查
                const { email, redirect_url } = input;
                const token = await issueToken({
                    user_id: user._id,
                    email,
                    redirect_url,
                });

                // 建立範本並寄送 email
                const toAddresses = [email];
                const template = new AccountVerifyTemplate();
                const variables = {
                    username: user.name,
                    verifyUrl: buildVerifyUrl({ token }),
                };

                winston.info("Mutation.sendVerifyEmail", {
                    user_id: user._id,
                    email,
                });

                await emailLib.sendEmailsFromTemplate(
                    toAddresses,
                    template,
                    variables
                );

                // 修改 user 的 email_status
                const UserModel = manager.UserModel;
                await UserModel.collection.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            email_status: SENT_VERIFICATION_LINK,
                        },
                    }
                );

                return { status: "ok" };
            }
        ),
        async verifyEmail(root, { input }, { manager }) {
            /**
             * 1. 檢查 token 是否有效、是否過期
             * 2. 標記成 VERIFIED，並更新 email 欄位
             * 3. 簽發登入用 token
             */
            const { token } = input;
            const payload = await verifyToken({ token });
            const { user_id, email, redirect_url } = payload;

            // 修改 user 的 email_status & email
            const UserModel = manager.UserModel;
            await UserModel.collection.updateOne(
                { _id: user_id },
                {
                    $set: {
                        email,
                        email_status: VERIFIED,
                    },
                }
            );

            // 簽發登入用 token
            const user = await UserModel.findOneById(user_id);
            const access_token = await signUser(user);

            return {
                token: access_token,
                redirect_url,
            };
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
