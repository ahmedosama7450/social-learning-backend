import { User } from ".prisma/client";
import { Context } from "../../api/context";

// TODO typing parent and args with generics

export const isAuthenticated = defineRule((_, __, ctx) => {
  return !!ctx.auth;
});

export const ownUserOnlyAccess = defineRule((parent: User, __, ctx) => {
  return parent.id === ctx.auth?.userId;
});

/* export const secretFieldAccess = (fieldName: string) =>
  defineRuleWithArgs(fieldName, (ruleArg) => (parent, _, ctx) => {
    return parent[fieldName] === ;
  });
 */

// ======================================
// Utilities
// ======================================
type RuleLogic = (parent: any, args: any, ctx: Context) => boolean;
type RuleWithArgsLogic<T> = (ruleArgs: T) => RuleLogic;

function defineRule(logic: RuleLogic) {
  return logic;
}

function defineRuleWithArgs<T>(ruleArgs: T, logic: RuleWithArgsLogic<T>) {
  return defineRule(logic(ruleArgs));
}
