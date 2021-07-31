// TODO Maybe make your own authentication plugin if things didn't scale well with this

import { User } from "@prisma/client";
import { Context } from "./context";

// TODO Typing parent and args with generics
type Rule = (parent: any, args: any, ctx: Context) => boolean;

//===================================
// Common rules
//===================================

export const isAuthenticated: Rule = (_, __, ctx) => {
  return !!ctx.auth;
};

// TODO maybe just inline it in the User type

/**
 * Make a field private to the user (no other user can access it)
 *
 * This rule can only be used with the User type
 */
export const ownUserOnlyAccess: Rule = (parent: User, __, ctx) => {
  return parent.id === ctx.auth?.userId;
};
