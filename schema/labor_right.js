const { gql } = require("apollo-server-express");
const contentful = require("contentful");
const R = require("ramda");
const lru = require("lru-cache");
const config = require("config");

const SPACE = config.get("CONTENTFUL_SPACE");
const ACCESS_TOKEN = config.get("CONTENTFUL_ACCESS_TOKEN");
const IS_PREVIEW = config.get("CONTENTFUL_PREVIEW") === "on";

const client = contentful.createClient({
    space: SPACE,
    accessToken: ACCESS_TOKEN,
    host: IS_PREVIEW ? "preview.contentful.com" : undefined,
});

const cache = new lru({
    max: 100,
    maxAge: 1000 * 600,
});

const Type = gql`
    type LaborRight {
        id: ID!
        title: String!
        coverUrl: String
        order: Int
        description: String!
        content: String!
        seoTitle: String
        seoDescription: String
        seoText: String
        nPublicPages: Int
        descriptionInPermissionBlock: String
    }
`;

const Query = gql`
    extend type Query {
        labor_rights: [LaborRight!]!
        labor_right(id: ID!): LaborRight
    }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        async labor_rights() {
            const data = cache.get("/entries");
            if (data) {
                return data;
            }

            const opt = {
                order: "fields.order",
                content_type: "lecturePost",
            };
            const result = await client.getEntries(opt);
            const entries = result.toPlainObject().items;
            cache.set("/entries", entries);
            return entries;
        },
        async labor_right(root, { id }) {
            const data = cache.get(`/entries/${id}`);
            if (data) {
                return data;
            }

            const result = await client.getEntry(id);
            const entry = result.toPlainObject();
            cache.set(`/entries/${id}`, entry);
            return entry;
        },
    },
    LaborRight: {
        id: R.path(["sys", "id"]),
        title: R.path(["fields", "title"]),
        coverUrl: R.path(["fields", "coverImage", "fields", "file", "url"]),
        order: R.path(["fields", "order"]),
        description: R.path(["fields", "description"]),
        content: R.path(["fields", "content"]),
        seoTitle: R.path(["fields", "seoTitle"]),
        seoDescription: R.path(["fields", "seoDescription"]),
        seoText: R.path(["fields", "seoText"]),
        nPublicPages: R.path(["fields", "nPublicPages"]),
        descriptionInPermissionBlock: R.path([
            "fields",
            "descriptionInPermissionBlock",
        ]),
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
