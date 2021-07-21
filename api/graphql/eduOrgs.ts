import {
  objectType,
  interfaceType,
  queryField,
  nullable,
  inputObjectType,
} from "nexus";

import * as eduOrgsUtils from "../../lib/eduOrgsUtils";

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

export const Tag = objectType({
  name: "Tag",
  definition(t) {
    t.string("description");
  },
});
 */

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
  args: {
    cachedVersion: nullable("Int"),
  },
  async resolve(_, { cachedVersion }) {
    const currentVersion = eduOrgsUtils.eduOrgsInfoVersion;

    // Compare cached version to the current version to decide if we need to send data back or not
    // If cached version is not sent, just send the data
    if (!cachedVersion || currentVersion > cachedVersion) {
      // New data needs to be sent
      return {
        eduOrgs: {
          universities: eduOrgsUtils.universities,
          colleges: eduOrgsUtils.colleges,
          tags: eduOrgsUtils.tags,
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
