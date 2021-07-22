import {
  objectType,
  queryField,
  enumType,
  mutationField,
  inputObjectType,
} from "nexus";
import { sign } from "jsonwebtoken";
import ms from "ms";
import * as yup from "yup";
import { UserInputError } from "apollo-server-express";

import {
  debug,
  fetchProfileFromGoogle,
  generateUsername,
  isUsernameUnique,
  ProfileFromProvider,
} from "../../lib/utils";
import { isAuthenticated, ownUserOnlyAccess } from "../permissions";
import * as keys from "../../lib/keys";
import * as prefs from "../../lib/prefs";

export const User = objectType({
  name: "User",
  definition(t) {
    t.int("id");
    t.field("provider", { type: "Provider" });
    t.string("username");
    t.nullable.string("email", {
      // no user can see another user's email
      authorize: ownUserOnlyAccess,
    });
    t.boolean("isActive");

    t.string("firstName");
    t.string("lastName");
    t.string("avatar");
    t.dateTime("joinedAt");

    t.boolean("isVerified");
    t.int("reputation");

    t.int("followersCount");
    t.int("followingCount");

    // Relations
    t.nullable.field("profile", {
      type: "Profile",
      resolve(parent, _, { prisma }) {
        return prisma.user
          .findUnique({
            where: { id: parent.id },
          })
          .profile();
      },
    });
  },
});

export const Profile = objectType({
  name: "Profile",
  definition(t) {
    t.string("bio");
    t.field("locale", { type: "Locale" });

    t.nullable.int("university");
    t.nullable.int("college");
    t.int("year");

    // Relations
    t.int("userId");
  },
});

export const Provider = enumType({
  name: "Provider",
  members: ["GOOGLE"],
});

export const Locale = enumType({
  name: "Locale",
  members: ["ARABIC", "ENGLISH"],
});

export const LoginResponse = objectType({
  name: "LoginResponse",
  definition(t) {
    t.string("accessToken");
  },
});

export const ProfileCreateInput = inputObjectType({
  name: "ProfileCreateInput",
  nonNullDefaults: { input: false },
  definition(t) {
    t.string("avatar");
    t.string("firstName");
    t.string("lastName");
    t.string("username");

    t.string("bio");
    t.int("university");
    t.int("college");
    t.int("year");
    t.field("locale", { type: "Locale" });
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
      "Create an access token for the user. if the user doesn't exist, a new user is created",
    args: {
      provider: "Provider",
      code: "String",
    },
    async resolve(_, args, { prisma, res }) {
      let profileFromProvider: ProfileFromProvider = await fetchProfileFromGoogle(
        args.code
      );

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

      const accessToken = sign(
        { [keys.accessTokenPayloadUserId]: user.id },
        process.env.JWT_SECRET!,
        {
          expiresIn: `${prefs.accessTokenMaxAgeInDays} d`,
        }
      );

      // Put the access token in an http-only cookie for web clients
      res.cookie(keys.accessTokenCookie, accessToken, {
        httpOnly: true,
        secure: !debug,
        maxAge: ms(`${prefs.accessTokenMaxAgeInDays} d`),
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
    authorize: isAuthenticated,
    args: { profileCreateInput: "ProfileCreateInput" },
    async resolve(_, { profileCreateInput }, { prisma, auth }) {
      // TODO Find a workaround for null to undefined mess: https://www.prisma.io/docs/concepts/components/prisma-client/null-and-undefined
      const validationSchema = yup.object().shape({
        avatar: yup.string(),
        firstName: yup.string().required().min(5).max(10),
        lastName: yup.string().required().min(5).max(10),
        username: yup
          .string()
          .required()
          .lowercase()
          .matches(/^[a-z0-9_]+$/)
          .test("uniqueUsername", "username-not-unique", (val) => {
            return val ? isUsernameUnique(val, prisma) : false;
          }),
        bio: yup.string().max(80),
        university: yup.number().required(),
        college: yup.number().required(),
        year: yup.number().required(),
      });

      try {
        const {
          avatar,
          firstName,
          lastName,
          username,
          bio,
          university,
          college,
          year,
        } = await validationSchema.validate(profileCreateInput, {
          abortEarly: false,
        });

        const me = await prisma.user.update({
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
                locale:
                  profileCreateInput.locale === null
                    ? undefined
                    : profileCreateInput.locale,
              },
            },
          },
          include: {
            profile: true,
          },
        });

        return me;
      } catch (e) {
        if (e.inner) {
          throw new UserInputError("validation", {
            validationErrors: e.inner.reduce(
              (acc: any, curr: any) => ((acc[curr.path] = curr.message), acc),
              {}
            ),
          });
        } else {
          throw e;
        }
      }
    },
  });
});
