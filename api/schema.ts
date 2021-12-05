import { makeSchema, fieldAuthorizePlugin, connectionPlugin } from "nexus";
import { AuthenticationError } from "apollo-server-express";
import { join } from "path";

import * as types from "./graphql";
import { validationPlugin } from "../lib/validation-plugin/validationPlugin";
import { computePlugin } from "../lib/computePlugin";

export default makeSchema({
  types,
  plugins: [
    computePlugin,
    fieldAuthorizePlugin({
      formatError() {
        // TODO Maybe distinguish authentication from authorization errors by sending different codes
        return new AuthenticationError("Not authenticated or authorized");
      },
    }),
    validationPlugin,
    connectionPlugin({
      includeNodesField: true,
    }),
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
