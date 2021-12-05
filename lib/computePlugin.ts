import type { GraphQLResolveInfo } from "graphql";
import { plugin } from "nexus";
import {
  ArgsValue,
  GetGen,
  MaybePromise,
  printedGenTyping,
  printedGenTypingImport,
  SourceValue,
  isPromiseLike,
} from "nexus/dist/core";
import { join } from "path";

// TODO Not 100% safe (see https://github.com/graphql-nexus/nexus/issues/1013)

export type ComputeResolverReturn = Record<string, () => MaybePromise<unknown>>;

export type ComputeResolver<
  TypeName extends string,
  FieldName extends string
> = (
  root: SourceValue<TypeName>,
  args: ArgsValue<TypeName, FieldName>,
  context: GetGen<"context">,
  info: GraphQLResolveInfo
) => ComputeResolverReturn;

export const computePlugin = plugin({
  name: "computePlugin",

  description:
    "Plugin for precomputing expensive operations, passing them into resolvers through context",

  fieldDefTypes: printedGenTyping({
    optional: true,
    name: "compute",
    description: "Compute expensive operations",
    type: "ComputeResolver<TypeName, FieldName>",
    imports: [
      printedGenTypingImport({
        module: join(__dirname, "./computePlugin"),
        bindings: ["ComputeResolver"],
      }),
    ],
  }),

  onCreateFieldResolver(config) {
    const compute = config.fieldConfig.extensions?.nexus?.config.compute;

    if (!compute) {
      return;
    }

    if (typeof compute !== "function") {
      console.error(
        new Error(
          `The compute property provided to ${
            config.fieldConfig.name
          } with type ${
            config.fieldConfig.type
          } should be a function, saw ${typeof compute}`
        )
      );
      return;
    }

    return (root, args, ctx, info, next) => {
      const computeResolverReturn = compute(
        root,
        args,
        ctx,
        info
      ) as ComputeResolverReturn;

      const computedValues: Record<string, unknown> = {};

      let promisesKeys: string[] | null = null;
      let promises: PromiseLike<unknown>[] | null = null;

      for (const key in computeResolverReturn) {
        const computeValue = computeResolverReturn[key];

        if (isPromiseLike(computeValue)) {
          if (!promisesKeys || !promises) {
            promisesKeys = [];
            promises = [];
          }

          promisesKeys.push(key);
          promises.push(computeValue);
        } else {
          computedValues[key] = computeValue();
        }
      }

      if (promisesKeys && promises) {
        return Promise.all(promises).then((results) => {
          for (let i = 0; i < promisesKeys!.length; i++) {
            computedValues[promisesKeys![i]] = results[i];
          }

          return next(root, args, { ...ctx, computed: computedValues }, info);
        });
      }

      return next(root, args, { ...ctx, computed: computedValues }, info);
    };
  },
});
