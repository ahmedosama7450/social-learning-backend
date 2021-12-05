// TODO Maybe make your own authentication plugin if things didn't scale well with the built-in fieldAuthorize plugin

import { Post, Comment } from "@prisma/client";
import { GraphQLResolveInfo } from "graphql";
import { isPromiseLike, MaybePromise } from "nexus/dist/core";

import { Context } from "./context";

type Permission<RootType = any, ArgsType = any> = (
  root: RootType,
  args: ArgsType,
  ctx: Context,
  info: GraphQLResolveInfo
) => MaybePromise<boolean>;

function resolvePermissions(
  i: number,
  permissions: Permission[],
  permissionsArgs: Parameters<Permission>,
  implementAnd: boolean
): MaybePromise<boolean> {
  if (i > permissions.length - 1) {
    return implementAnd;
  }

  const maybePromise = permissions[i](...permissionsArgs);

  if (isPromiseLike(maybePromise)) {
    return maybePromise.then((data) => {
      if (data === !implementAnd) {
        return !implementAnd;
      } else {
        return resolvePermissions(
          i + 1,
          permissions,
          permissionsArgs,
          implementAnd
        );
      }
    });
  } else {
    if (maybePromise === !implementAnd) {
      return !implementAnd;
    } else {
      return resolvePermissions(
        i + 1,
        permissions,
        permissionsArgs,
        implementAnd
      );
    }
  }
}

export const not: <RootType, ArgsType>(
  permission: Permission<RootType, ArgsType>
) => Permission<RootType, ArgsType> =
  (permission: Permission) =>
  (...args) => {
    const result = permission(...args);

    if (isPromiseLike(result)) {
      return result.then((data) => {
        return !data;
      });
    } else {
      return !result;
    }
  };

export const and: <RootType, ArgsType>(
  ...permissions: Permission<RootType, ArgsType>[]
) => Permission<RootType, ArgsType> =
  (...permissions) =>
  (...args) => {
    return resolvePermissions(0, permissions, args, true);
  };

export const or: <RootType, ArgsType>(
  ...permissions: Permission<RootType, ArgsType>[]
) => Permission<RootType, ArgsType> =
  (...permissions) =>
  (...args) => {
    return resolvePermissions(0, permissions, args, false);
  };

//===================================
// Common rules
//===================================

export const isAuthenticated: Permission = (_, __, ctx) => {
  return !!ctx.auth;
};

// TODO ownUser general permission ??

/**
 * If computed.post is available, It must include authorId field
 */
export const ownUserPost = and<any, { id: string }>(
  isAuthenticated,

  async (_, { id: postId }, { prisma, auth, computed }) => {
    const post =
      (computed?.post as Pick<Post, "authorId">) ||
      (await prisma.post.findUnique({
        where: {
          id: postId,
        },
        select: {
          authorId: true,
        },
        rejectOnNotFound: true,
      }));

    return post.authorId === auth!.userId;
  }
);

/**
 * If computed.comment is available, It must include authorId field
 */
export const ownUserComment = and<any, { id: string }>(
  isAuthenticated,

  async (_, { id: commentId }, { prisma, auth, computed }) => {
    const comment =
      (computed?.comment as Pick<Comment, "authorId">) ||
      (await prisma.comment.findUnique({
        where: {
          id: commentId,
        },
        select: {
          authorId: true,
        },
        rejectOnNotFound: true,
      }));

    return comment.authorId === auth!.userId;
  }
);
