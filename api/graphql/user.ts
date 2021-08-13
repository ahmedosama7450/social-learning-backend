import {
  objectType,
  queryField,
  enumType,
  mutationField,
  inputObjectType,
} from "nexus";
import {
  User as _User,
  Profile as _Profile,
  Provider as _Provider,
  Locale as _Locale,
} from "nexus-prisma";
import ms from "ms";

import {
  fetchProfileFromGoogle,
  ProfileFromProvider,
  generateUsername,
  createAccessToken,
} from "../../lib/authUtils";
import { inProd } from "../../lib/utils";
import { isAuthenticated, ownUserOnlyAccess } from "../permissions";
import * as keys from "../../lib/keys";
import * as prefs from "../../lib/prefs";
import { lowercase, trim } from "../../lib/validation-plugin/transformers";
import {
  maxSize,
  pattern,
  rangeSize,
} from "../../lib/validation-plugin/validators";

export const User = objectType({
  name: _User.$name,
  definition(t) {
    t.field(_User.id);
    t.field(_User.provider);
    t.field(_User.username);
    t.field(_User.firstName);
    t.field(_User.lastName);

    t.field(_User.email.name, {
      type: _User.email.type,
      authorize: ownUserOnlyAccess,
    });
    t.field(_User.isActive);
    t.field(_User.avatar);
    t.field(_User.joinedAt);

    t.field(_User.isVerified);
    t.field(_User.reputation);

    t.field(_User.followersCount);
    t.field(_User.followingCount);

    // Relations
    t.field(_User.profile);
  },
});

export const Profile = objectType({
  name: _Profile.$name,
  definition(t) {
    t.field(_Profile.bio);
    t.field(_Profile.locale);

    t.field(_Profile.university);
    t.field(_Profile.college);
    t.field(_Profile.year);

    // Relations
    t.field(_Profile.userId);
  },
});

export const Provider = enumType(_Provider);

export const Locale = enumType(_Locale);

export const LoginResponse = objectType({
  name: "LoginResponse",
  definition(t) {
    t.string("accessToken");
  },
});

export const ProfileCreateInput = inputObjectType({
  name: "ProfileCreateInput",
  definition(t) {
    t.field(_User.username);
    t.field(_User.firstName);
    t.field(_User.lastName);
    t.field(_User.avatar);

    t.field(_Profile.bio);
    t.field(_Profile.locale);
    t.field(_Profile.university);
    t.field(_Profile.college);
    t.field(_Profile.year);
  },
});

export const UserQuery = queryField((t) => {
  t.field("me", {
    type: "User",
    authorize: isAuthenticated,
    resolve(_, __, { prisma, auth }) {
      return prisma.user.findUnique({
        where: {
          id: auth!.userId,
        },
        include: {
          profile: true,
        },
        rejectOnNotFound: true,
      });
    },
  });
});

export const UserMutation = mutationField((t) => {
  t.field("loginWithProvider", {
    type: "LoginResponse",
    description:
      "Create an access token for the user + put it in a cookie. if the user doesn't exist, a new user is created",
    args: {
      provider: "Provider",
      code: "String",
    },
    async resolve(_, args, { prisma, res }) {
      let profileFromProvider: ProfileFromProvider =
        await fetchProfileFromGoogle(args.code);

      let user = await prisma.user.findUnique({
        where: {
          provider_providerUid: {
            provider: args.provider,
            providerUid: profileFromProvider.sub,
          },
        },
        select: {
          id: true,
        },
      });

      if (!user) {
        // welcome our new user
        user = await prisma.user.create({
          data: {
            provider: args.provider,
            providerUid: profileFromProvider.sub,
            firstName: profileFromProvider.firstName,
            lastName: profileFromProvider.lastName,
            email: profileFromProvider.email,
            username: await generateUsername(profileFromProvider.email, prisma),
          },
        });
      }

      const accessToken = createAccessToken(user.id, prefs.accessTokenMaxAge);

      // Put the access token in an http-only cookie for web clients
      res.cookie(keys.accessTokenCookie, accessToken, {
        httpOnly: true,
        secure: inProd,
        maxAge: ms(prefs.accessTokenMaxAge),
      });

      // Send back the access token for mobile clients
      return {
        accessToken,
      };
    },
  });

  t.nonNull.boolean("logout", {
    authorize: isAuthenticated,
    description: "Logout for web client to clear the auth http-only cookie",
    resolve(_, __, { res }) {
      res.clearCookie(keys.accessTokenCookie);
      return true;
    },
  });

  t.nonNull.field("createProfile", {
    type: "User",
    description:
      "Calling this mutation if profile is already created will result in an error",
    args: { profileCreateInput: "ProfileCreateInput" },
    authorize: isAuthenticated,
    transform() {
      return {
        profileCreateInput: {
          firstName: trim,
          lastName: trim,
          username: [trim, lowercase],
          bio: trim,
        },
      };
    },
    validate(_, __, { prisma, auth }) {
      return {
        profileCreateInput: {
          // TODO maybe restrict names with a regex
          firstName: [
            rangeSize(
              prefs.firstLastNamePrefs.minLength,
              prefs.firstLastNamePrefs.maxLength
            ),
          ],
          lastName: [
            rangeSize(
              prefs.firstLastNamePrefs.minLength,
              prefs.firstLastNamePrefs.maxLength
            ),
          ],
          username: [
            rangeSize(
              prefs.usernamePrefs.minLength,
              prefs.usernamePrefs.maxLength
            ),
            pattern(prefs.usernamePrefs.regex),
            async (username) => {
              const user = await prisma.user.findUnique({
                where: {
                  username,
                },
                select: {
                  id: true,
                },
              });

              if (!user || user.id === auth!.userId) {
                // This username is unique, It's all his now
                return undefined;
              } else {
                return ["username-not-unique", null];
              }
            },
          ],
          bio: maxSize(prefs.bioMaxLength),
        },
      };
    },
    async resolve(
      _,
      {
        profileCreateInput: {
          firstName,
          lastName,
          username,
          bio,
          avatar,
          locale,
          university,
          college,
          year,
        },
      },
      { prisma, auth }
    ) {
      return await prisma.user.update({
        where: {
          id: auth!.userId,
        },
        data: {
          avatar: avatar,
          firstName: firstName,
          lastName: lastName,
          username: username,

          profile: {
            create: {
              bio: bio,
              university: university,
              college: college,
              year: year,
              locale: locale,
            },
          },
        },
        include: {
          profile: true,
        },
      });
    },
  });
});
