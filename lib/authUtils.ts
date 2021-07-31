import { Request } from "express";
import { verify, sign } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { AuthenticationError, ApolloError } from "apollo-server-express";
import { PrismaClient } from "@prisma/client";
import { customAlphabet } from "nanoid";

import { ContextAuth } from "../api/context";
import { usernamePrefs } from "./prefs";
import * as keys from "../lib/keys";

/**
 * Preform JWT authentication assuming jwt is sent in a cookie
 */
export function authenticate(req: Request): ContextAuth | undefined {
  // TODO We might need to look up the cookie in the authorization header especially with mobile clients

  /*
    Note we don't make any database calls to verify that the user id exists in the database
    the user might be authenticated on a device but has removed his account on another device, so technically he shouldn't be authenticated
    but anyways, This will produce an error in resolvers, so I think It's kind of safe
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

export function createAccessToken(userId: number, expiresIn: string): string {
  return sign(
    { [keys.accessTokenPayloadUserId]: userId },
    process.env.JWT_SECRET!,
    {
      expiresIn,
    }
  );
}

// TODO usename functions below need to be tested and probably refactored

/**
 * @param email You don't have to check if it's valid, this function accounts for that
 */
export async function generateUsername(
  email: string | undefined,
  prisma: PrismaClient
) {
  if (email) {
    // Tweak the email into a valid username
    let usernameFromEmail = makeUsernameFromEmail(email);
    if (await isUsernameUnique(usernameFromEmail, prisma)) {
      return usernameFromEmail;
    } else {
      // One more attempt to create a unique username from the email
      usernameFromEmail = tweakUsernameFromEmail(usernameFromEmail);

      if (await isUsernameUnique(usernameFromEmail, prisma)) {
        return usernameFromEmail;
      } else {
        return await generateRandomUsername(prisma);
      }
    }
  } else {
    return await generateRandomUsername(prisma);
  }
}

export async function isUsernameUnique(username: string, prisma: PrismaClient) {
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
    },
  });

  return user ? false : true;
}

async function generateRandomUsername(prisma: PrismaClient) {
  let nanoidUsername = customAlphabet(
    "0123456789_abcdefghijklmnopqrstuvwxyz",
    usernamePrefs.avgLength
  )();

  if (await isUsernameUnique(nanoidUsername, prisma)) {
    return nanoidUsername;
  } else {
    nanoidUsername = customAlphabet(
      "0123456789_abcdefghijklmnopqrstuvwxyz",
      usernamePrefs.maxLength // This time with max length
    )();

    if (await isUsernameUnique(nanoidUsername, prisma)) {
      return nanoidUsername;
    } else {
      // We are done. We couldn't generate a username. This is very rare to happen
      // The user has to try again himself
      // TODO maybe try to generate one more time

      throw new ApolloError(
        "We could not auto generate a username to create the user model"
      );
    }
  }
}

function tweakUsernameFromEmail(usernameFromEmail: string) {
  function isUsernameShort(username: string) {
    // Being short means that we can diretly use nanoid to fill username
    const minNanoidLength = 4; // The least number of random numbers for nanaoid to work
    const usernameShortLength = usernamePrefs.avgLength - minNanoidLength;
    return username.length <= usernameShortLength;
  }

  function fillUsername(username: string) {
    let filledUsername;

    // If the username is short, fill upto average length
    if (isUsernameShort(username)) {
      const nanoid = customAlphabet(
        "0123456789",
        username.length - usernamePrefs.avgLength
      );
      filledUsername = username + nanoid();
    } else {
      // If the username is long, add upto max length
      const nanoid = customAlphabet(
        "0123456789",
        username.length - usernamePrefs.maxLength
      );
      filledUsername = username + nanoid();
    }

    return filledUsername;
  }

  if (isUsernameShort(usernameFromEmail)) {
    return fillUsername(usernameFromEmail);
  } else {
    // If the username is long, remove trailing numbers and add random numbers
    usernameFromEmail = usernameFromEmail.replace(/\d+$/, "");
    return fillUsername(usernameFromEmail);
  }
}

function makeUsernameFromEmail(email: string): string {
  let usernameFromEmail = email;

  // Remove domain part and convert to lowercase. we also account for the case that email is not valid
  const atIndex = email.lastIndexOf("@");
  if (atIndex !== -1) {
    usernameFromEmail = usernameFromEmail.substring(0, atIndex).toLowerCase();
  }

  // A username can only have lowercase letters, numbers and _ So, replace any other character with an empty space
  usernameFromEmail = usernameFromEmail.replace(/[^a-z0-9_]/gi, "");

  // A username is 5 to 15 characters long
  if (usernameFromEmail.length > usernamePrefs.maxLength) {
    // If it's more than 15 characters, we take only the first 15-character substring
    usernameFromEmail = usernameFromEmail.substring(0, usernamePrefs.maxLength); // returning 15 characters
  } else if (usernameFromEmail.length < usernamePrefs.minLength) {
    // If it's less than 5 character, we add random numbers
    // The number of characters added to exceed minLength is the average between min and max
    const nanoid = customAlphabet(
      "0123456789",
      usernameFromEmail.length - usernamePrefs.avgLength
    );
    usernameFromEmail += nanoid();
  }

  return usernameFromEmail;
}

export interface ProfileFromProvider {
  sub: string;
  firstName: string;
  lastName: string;
  email?: string;
}

/**
 * firstName and lastName might be empty strings
 */
export async function fetchProfileFromGoogle(
  code: string
): Promise<ProfileFromProvider> {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const client = new OAuth2Client(
      googleClientId,
      googleClientSecret,
      /**
       * To get access_token and refresh_token in server side,
       * the data for redirect_uri should be postmessage.
       * postmessage is magic value for redirect_uri to get credentials without actual redirect uri.
       */
      "postmessage"
    );

    const idToken = (await client.getToken(code)).tokens.id_token;
    if (!idToken) {
      throw new AuthenticationError(
        "Authorization code might not be valid. Obtained id token from google is null. Try to login with google again"
      );
    }

    const payload = (
      await client.verifyIdToken({
        idToken,
        audience: googleClientId,
      })
    ).getPayload();
    if (!payload || !payload.sub) {
      throw new AuthenticationError(
        "We were not able to get profile info from google. Try to login with google again"
      );
    }

    return {
      sub: payload.sub,
      firstName: payload.given_name || "",
      lastName: payload.family_name || "",
      email: payload.email,
    };
  } catch (err) {
    throw new AuthenticationError(
      "Something went wrong while authorizing your code from google. Try to login with google again"
    );
  }
}

/* facebook auth is not used any more but we will keep the code just in case
export async function fetchProfileFromFacebook(
  code: string
): Promise<ProfileFromProvider> {
  const facebookClientId = process.env.FACEBOOK_CLIENT_ID;
  const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET;

  // Make a request to facebook token endpoint to exchange code for an access token
  const accessToken = (
    await axios.get('https://graph.facebook.com/v8.0/oauth/access_token', {
      params: {
        code: code,
        client_id: facebookClientId,
        client_secret: facebookClientSecret,
        redirect_uri: 'http://localhost:3000/facebook-redirect',
      },
    })
  ).data['access_token'];

  // Get profile info using obtained access token
  const profileInfo = (
    await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,first_name,last_name,email',
        access_token: accessToken,
      },
    })
  ).data;
  if (!profileInfo) {
    throw new AuthenticationError(
      'We were not able to get profile info from facebook. try to login with facebook again'
    );
  }

  return {
    sub: profileInfo['id'],
    firstName: profileInfo['first_name'] || '',
    lastName: profileInfo['last_name'] || '',
    email: profileInfo['email'],
  };
}
*/
