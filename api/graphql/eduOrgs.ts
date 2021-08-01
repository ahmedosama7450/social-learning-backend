import { objectType, queryField, nullable } from "nexus";

import * as eduOrgsInfo from "../../lib/eduOrgsInfo";

export const EduOrgs = objectType({
  name: "EduOrgs",
  definition(t) {
    t.json("universities");
    t.json("colleges");
    t.json("tags");
  },
});

export const EduOrgsInfo = objectType({
  name: "EduOrgsInfo",
  definition(t) {
    t.nullable.field("eduOrgs", { type: "EduOrgs" });
    t.int("version");
  },
});

export const EduOrgsQuery = queryField("eduOrgsInfo", {
  type: "EduOrgsInfo",
  description:
    "cachedVersion is compared to the current version to decide if we need to send data back or not. the version is always sent back",
  args: {
    cachedVersion: nullable("Int"),
  },
  async resolve(_, { cachedVersion }) {
    const currentVersion = eduOrgsInfo.eduOrgsInfoVersion;

    // If cached version is not sent or we have a newer version, we send data back
    if (!cachedVersion || currentVersion > cachedVersion) {
      // New data needs to be sent
      return {
        eduOrgs: {
          universities: eduOrgsInfo.universities,
          colleges: eduOrgsInfo.colleges,
          tags: eduOrgsInfo.tags,
        },
        version: currentVersion,
      };
    } else {
      // We don't need need to send anything back, the frontend has the latest version of data
      return {
        version: currentVersion,
      };
    }
  },
});

/* export const EduOrgInfoInput = inputObjectType({
  name: "EduOrgInfoInput",
  definition(t) {
    t.int("university");
    t.int("college");
    t.int("year");
  },
});
 */

/* export const EduOrg = interfaceType({
  name: 'EduOrg',
  resolveType(data) {
    return 'colleges' in data ? 'University' : 'College';
  },
  definition(t) {
    t.int('id');
    t.string('description');
  },
});
 */

/* export const University = objectType({
  name: "University",
  definition(t) {
    t.string("description");
    t.list.int("colleges");
  },
});

export const College = objectType({
  name: "College",
  definition(t) {
    t.string("description");
    t.int("firstYear");
    t.int("lastYear");
  },
});

 */
