import { makeSchema, fieldAuthorizePlugin } from "nexus";
import { AuthenticationError } from "apollo-server-express";
import { join } from "path";

import * as types from "./graphql";
import { validationPlugin } from "../lib/validation-plugin/validationPlugin";

export default makeSchema({
  types,
  plugins: [
    fieldAuthorizePlugin({
      formatError() {
        return new AuthenticationError("Not authenticated or authorized");
      },
    }),
    validationPlugin,
  ],
  nonNullDefaults: {
    input: true,
    output: true,
  },
  outputs: {
    typegen: join(__dirname, "..", "__generated__", "nexus-typegen.ts"),
    schema: join(__dirname, "..", "__generated__", "schema.graphql"),
  },
  contextType: {
    module: join(__dirname, "./context.ts"),
    alias: "Context",
    export: "Context",
  },
  // TODO Maybe don't have to define prisma source types because I am using the plugin
  sourceTypes: {
    modules: [
      {
        module: "@prisma/client",
        alias: "prisma",
      },
    ],
  },
});
