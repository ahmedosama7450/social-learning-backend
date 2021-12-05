import { PostType } from "@prisma/client";

import {
  defineValidator,
  rangeSize,
  validUrl,
  validUrls,
} from "./validation-plugin/validators";
import { colleges, universities, tags } from "./eduOrgsInfo";
import * as prefs from "./prefs";
import { MaybeNullable } from "./types";

export const universityValidator = defineValidator<number>(
  "university-invalid",
  (universityId) => universityId in universities,
  null,
  false
);

/**
 *
 * @param universityId must be a valid university
 */
export const collegeValidator = (universityId: MaybeNullable<number>) =>
  defineValidator<number>(
    "college-invalid",
    (collegeId) =>
      !universityId
        ? collegeId in colleges
        : collegeId in universities[universityId].collegesIds,
    null,
    false
  );

/**
 *
 * @param collegeId must be a valid college
 */
export const yearValidator = (collegeId: MaybeNullable<number>) =>
  defineValidator<number>(
    "year-invalid",
    (year) =>
      !!collegeId &&
      year >= colleges[collegeId].firstYear &&
      year <= colleges[collegeId].lastYear,
    null,
    false
  );

/**
 * All args must be valid
 */
export const tagsValidator = (
  universityId: MaybeNullable<number>,
  collegeId: MaybeNullable<number>,
  year: MaybeNullable<number>
) =>
  defineValidator<string[]>(
    "tags-invalid",
    (tagsIds) =>
      tagsIds.every((tagId) => {
        const tagEduOrgs = tags[Number(tagId)].eduOrgs;

        return tagEduOrgs
          ? tagEduOrgs.some(
              (tagEduOrg) =>
                tagEduOrg.universitiesIds.includes(universityId || null) &&
                tagEduOrg.collegesIds.includes(collegeId || null) &&
                tagEduOrg.years.includes(year || null)
            )
          : !universityId && !collegeId && !year;
      }),
    null,
    false
  );

export const eduOrgValidators = (
  university: MaybeNullable<number>,
  college: MaybeNullable<number>,
  year: MaybeNullable<number>
) => ({
  university: universityValidator,
  college: collegeValidator(university),
  year: yearValidator(college),
  tags: tagsValidator(university, college, year),
});

export const bodyValidator = (type: PostType | "COMMENT") =>
  defineValidator<string>("body-invalid", () => {
    // TODO Not implemented yet

    switch (type) {
      case "DISCUSSION":
        // TODO Make sure body doesn't have images in case of discussions
        return false;
      case "COMMENT":
        return false;
      default:
        return false;
    }
  });

export const postValidators = (
  type: PostType,
  university: MaybeNullable<number>,
  college: MaybeNullable<number>,
  year: MaybeNullable<number>
) => ({
  ...eduOrgValidators(university, college, year),

  title: rangeSize(
    prefs.postTitlePrefs.minLength,
    prefs.postTitlePrefs.maxLength
  ),

  body: bodyValidator(type),

  attachments: [
    defineValidator<string[]>(
      "attachments-only-for-discussions",
      (attachments) => {
        return !!attachments && type !== "DISCUSSION";
      }
    ),
    validUrls,
  ],

  coverUrl: [
    defineValidator<string>("coverUrl-only-for-articles", (coverUrl) => {
      return !!coverUrl && type !== "ARTICLE";
    }),
    validUrl,
  ],
});

export const commentValidators = {
  body: bodyValidator("COMMENT"),

  attachments: validUrls,
};
