import { Request, Response } from "express";
import { verify } from "jsonwebtoken";

import { ContextAuth } from "../api/context";
import * as keys from "../lib/keys";

// TODO We might need to look up the cookie in the authorization header especially with mobile clients

/**
 * Preform JWT authentication assuming jwt is sent the in a cookie
 */
export function authenticate(req: Request): ContextAuth | undefined {
  /*
    Note we don't make any database calls to verify that the user id exists in the database
    the user might be authenticated on a device but has removed his account on another device, so technically he should be authenticated
    but anyways, this will produce an erro in resolvers, so I think It's kind of safe
    TODO one sollution, is to provide a way to revoke access tokens
  */

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

  return userId ? { userId } : undefined;
}
