import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { ContextFunction } from 'apollo-server-core';
import { ExpressContext } from 'apollo-server-express/dist/ApolloServer';
import { verify } from 'jsonwebtoken';

import * as keys from '../lib/keys';

const fakeAuthUserId = 1;

export interface Context {
  req: Request;
  res: Response;
  prisma: PrismaClient;
  auth?: { userId: number };
}

export function createContext(
  prisma: PrismaClient
): ContextFunction<ExpressContext, Promise<Context>> {
  return async ({ req, res }) => {
    // TODO comment this out in productions
    // Fake Auth
    //----------------------
    if (fakeAuthUserId) {
      return {
        req,
        res,
        prisma,
        auth: { userId: fakeAuthUserId },
      };
    }

    // JWT Authentication and populating user
    // -------------------------------------------------

    // Note we don't make any database calls to verify that the user id exists in the database
    // the user might be authenticated on a device but has removed his account on another device
    // we currently don't have any method to revoke access tokens, maybe in the future

    let userId: number | undefined = undefined;
    const accessToken = req.cookies[keys.accessTokenCookie];
    if (accessToken) {
      // user might be authenticated
      try {
        const payload: any = verify(accessToken, process.env.JWT_SECRET!);
        userId = payload[keys.accessTokenPayloadUserId];
      } catch (err) {
        // jwt is probably tempered with or is expired
        userId = undefined;
      }
    }
    const auth = userId ? { userId } : undefined;

    return {
      req,
      res,
      prisma,
      auth,
    };
  };
}
