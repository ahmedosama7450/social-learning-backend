import { makeSchema, fieldAuthorizePlugin, connectionPlugin } from "nexus";
import { ApolloError, AuthenticationError } from "apollo-server-express";
import { argsValidatorPlugin } from "nexus-args-validator";
import { join } from "path";

import { computePlugin } from "../lib/computePlugin";
import * as types from "./graphql";

export default makeSchema({
  types,
  plugins: [
    computePlugin,
    fieldAuthorizePlugin({
      formatError() {
        // Throw an apollo error with a code, if you want to customize the error thrown
        return new AuthenticationError("Not authenticated or authorized");
      },
    }),
    argsValidatorPlugin({
      onValidationError(errorsTree) {
        throw new ApolloError(
          "One or more arguments failed validation",
          "VALIDATION_FAILED",
          {
            validationErrors: errorsTree,
          }
        );
      },
    }),
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
