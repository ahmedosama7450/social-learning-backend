import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { ContextFunction } from "apollo-server-core";
import { ExpressContext } from "apollo-server-express/dist/ApolloServer";

import { authenticate } from "../lib/authUtils";

export interface ContextAuth {
  userId: number;
}

export interface Context {
  req: Request;
  res: Response;
  prisma: PrismaClient;
  auth?: ContextAuth;
}

export function createContext(
  prisma: PrismaClient
): ContextFunction<ExpressContext, Promise<Context>> {
  return async ({ req, res }) => {
    // TODO comment fake auth in production
    //-------------------------------------------
    // Fake auth
    //-------------------------------------------
    const fakeAuthUserId = null; // To disable, Set fakeAuthUserId to null

    if (fakeAuthUserId) {
      return {
        req,
        res,
        prisma,
        auth: { userId: fakeAuthUserId },
      };
    }
    //-------------------------------------------
    // End of fake auth
    //-------------------------------------------

    return {
      req,
      res,
      prisma,
      auth: authenticate(req),
    };
  };
}
