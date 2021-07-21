import { OAuth2Client } from "google-auth-library";
import { AuthenticationError } from "apollo-server-express";
import { PrismaClient } from "@prisma/client";
import * as yup from "yup";
import { customAlphabet } from "nanoid";

import { ApolloError } from "apollo-server-express";

import {
  usernameAvgLength,
  usernameMaxLength,
  usernameMinLength,
} from "./prefs";

// ======================================
// General
// ======================================
export const debug = process.env.NODE_ENV != "production";

// ======================================
// Authentication
// ======================================

export async function generateUsername(
  email: string | undefined,
  prisma: PrismaClient
) {
  if (email) {
    // Tweak the email into a valid username
    let usernameFromEmail = makeUsernameFromEmail(email);
    if (isUsernameUnique(usernameFromEmail, prisma)) {
      return usernameFromEmail;
    } else {
      // One more attempt to create a unique username from the email
      if (isUsernameShort(usernameFromEmail)) {
        usernameFromEmail = fillUsername(usernameFromEmail);
      } else {
        // If the username is long, remove trailing numbers and add random numbers
        usernameFromEmail = usernameFromEmail.replace(/\d+$/, "");
        usernameFromEmail = fillUsername(usernameFromEmail);
      }

      if (isUsernameUnique(usernameFromEmail, prisma)) {
        return usernameFromEmail;
      } else {
        return generateRandomUsername(prisma);
      }
    }
  } else {
    return generateRandomUsername(prisma);
  }
}

// TODO test and refactor
function generateRandomUsername(prisma: PrismaClient) {
  const nanoid = customAlphabet(
    "0123456789_abcdefghijklmnopqrstuvwxyz",
    usernameAvgLength
  );
  let nanoidUsername = nanoid();
  if (isUsernameUnique(nanoidUsername, prisma)) {
    return nanoidUsername;
  } else {
    const nanoid = customAlphabet(
      "0123456789_abcdefghijklmnopqrstuvwxyz",
      usernameMaxLength // This time with max length
    );
    nanoidUsername = nanoid();
    if (isUsernameUnique(nanoidUsername, prisma)) {
      return nanoidUsername;
    } else {
      // We are done. We couldn't generate a username. This is very rare to happen
      // The user has to try again himself
      throw new ApolloError(
        "We could not auto generate a username to create the user model"
      );
    }
  }
}

function isUsernameShort(username: string) {
  const minNanoidLength = 4;
  const usernameShortLength = usernameAvgLength - minNanoidLength;
  return username.length <= usernameShortLength;
}

function fillUsername(username: string) {
  let filledUsername;

  // If the username is short, fill upto average length
  if (isUsernameShort(username)) {
    const nanoid = customAlphabet(
      "0123456789",
      username.length - usernameAvgLength
    );
    filledUsername = username + nanoid();
  } else {
    // If the username is long, add upto max length
    const nanoid = customAlphabet(
      "0123456789",
      username.length - usernameMaxLength
    );
    filledUsername = username + nanoid();
  }

  return filledUsername;
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
  if (usernameFromEmail.length > usernameMaxLength) {
    // If it's more than 15 characters, we take only the first 15-character substring
    usernameFromEmail = usernameFromEmail.substring(0, usernameMaxLength); // returning 15 characters
  } else if (usernameFromEmail.length < usernameMinLength) {
    // If it's less than 5 character, we add random numbers
    // The number of characters added to exceed minLength is the average between min and max
    const nanoid = customAlphabet(
      "0123456789",
      usernameFromEmail.length - usernameAvgLength
    );
    usernameFromEmail += nanoid();
  }

  return usernameFromEmail;
}

export async function isUsernameValid(username: string) {
  // A valid username has more than 4 characters + less than 15 characters + contains only english lowercase letters, numbers and _
  const isValid = await yup
    .string()
    .required()
    .lowercase()
    .min(usernameMinLength)
    .max(usernameMaxLength)
    .matches(/[a-z0-9_]+/)
    .isValid(username);
  return isValid;
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

export interface ProfileFromProvider {
  sub: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export async function fetchProfileFromGoogle(
  code: string
): Promise<ProfileFromProvider> {
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
      "Authorization code might not be valid. obtained id token from google is null. try to login with google again"
    );
  }

  const payload = (
    await client.verifyIdToken({
      idToken,
      audience: googleClientId,
    })
  ).getPayload();
  if (!payload) {
    throw new AuthenticationError(
      "We were not able to get profile info from google. try to login with google again"
    );
  }

  return {
    sub: payload.sub,
    firstName: payload.given_name || "",
    lastName: payload.family_name || "",
    email: payload.email,
  };
}

/* This is not used any more but we will keep the code
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
