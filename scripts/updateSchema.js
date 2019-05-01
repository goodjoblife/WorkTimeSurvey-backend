const fs = require("fs");
const path = require("path");

const { graphql } = require("graphql");
const { introspectionQuery, printSchema } = require("graphql/utilities");

const schema = require("../src/schema");

// Save JSON of full schema introspection for Babel Relay Plugin to use
(async () => {
    const result = await graphql(schema, introspectionQuery);
    if (result.errors) {
        console.error(
            "ERROR introspecting schema: ",
            JSON.stringify(result.errors, null, 2)
        );
    }

    // Save user readable type system shorthand of schema
    fs.writeFileSync(
        path.join(__dirname, "../schema.graphql"),
        printSchema(schema)
    );
    process.exit(0);
})();
