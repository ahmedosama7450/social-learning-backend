// TODO I am thinking about putting this data somewhere else e.g. a CDN or so

// TODO The data is not complete yet

/**
 *  Version should be manually increased when the info changes, so this data can be cached on the frontend
 */
export const eduOrgsInfoVersion = 1;

export const EDU_ORGS_GENERAL_OPTION_VALUE = -1;

//-------------------------------------------
// Types
//-------------------------------------------

export interface College {
  description: string;
  firstYear: number;
  lastYear: number;
}

export interface University {
  description: string;
  collegesIds: number[];
}

export enum TagType {
  SUBJECT = 0,
  TERM = 1,
  DEPARTMENT = 2,
}

/**
 * Tags are very specific to the university, college, year they're attached to. A tag
 * with cairo university and arts college is different from a tag with only cairo university
 *
 * eduOrg is the array of all possible combinations of its constituent arrays
 *
 */
export interface Tag {
  description: string;
  type: TagType;
  eduOrgs?: {
    universitiesIds: number[];
    collegesIds: number[];
    years: number[];
  }[];
}

//-------------------------------------------
// Data
//-------------------------------------------

export const universities: Record<number, University> = {
  1: {
    description: "Cairo University",
    collegesIds: [2, 3],
  },
  2: {
    description: "Zagazig University",
    collegesIds: [1],
  },
};

export const colleges: Record<number, College> = {
  1: {
    description: "Faculty Of Engineering",
    firstYear: 0,
    lastYear: 4,
  },
  2: {
    description: "Faculty Of Science",
    firstYear: 1,
    lastYear: 5,
  },
  3: {
    description: "Faculty Of Education",
    firstYear: 1,
    lastYear: 5,
  },
};

/**
 * This is how I type the tags data here, but it gets converted to match Tag Interface above
 * (Just automating and making it easy for myself)
 */
interface PreTransformedTag {
  description: string;
  type: TagType;
  eduOrgs?: {
    universitiesIds?: number | number[];
    collegesIds?: number | number[];
    years?: number | number[];
  }[];
}

const preTransformedTags: Record<number, PreTransformedTag> = {
  1: {
    description: "Math",
    type: TagType.SUBJECT,
    eduOrgs: [
      { universitiesIds: [1, 2], collegesIds: [3, 2], years: [2, 3] },
      { universitiesIds: 1, collegesIds: 2, years: 1 },
    ],
  },
  2: {
    description: "First Term",
    type: TagType.TERM,
  },
  3: {
    description: "Electrical Dep",
    type: TagType.DEPARTMENT,
    eduOrgs: [
      { universitiesIds: 2, collegesIds: 1, years: [0, 1, 2, 3, 4] },
      { universitiesIds: 1, collegesIds: 2, years: 1 },
    ],
  },
  4: {
    description: "Electronics",
    type: TagType.SUBJECT,
    eduOrgs: [
      { collegesIds: 1 },
      { universitiesIds: 1, collegesIds: 2, years: 1 },
    ],
  },
};

export const tags = transformTags(preTransformedTags);

//-------------------------------------------
// Helpers
//-------------------------------------------

function transformTags(
  preTransformedTags: Record<number, PreTransformedTag>
): Record<number, Tag> {
  const transformedTags: Record<number, Tag> = {};

  Object.entries(preTransformedTags).forEach(([tagId, preTransformedTag]) => {
    transformedTags[Number(tagId)] = {
      type: preTransformedTag.type,
      description: preTransformedTag.description,
      eduOrgs: transformTagEduOrgs(preTransformedTag.eduOrgs),
    };
  });

  return transformedTags;
}

function transformTagEduOrgs(
  preTransformedEduOrgs: PreTransformedTag["eduOrgs"]
): Tag["eduOrgs"] {
  if (
    preTransformedEduOrgs === undefined ||
    preTransformedEduOrgs.length === 0
  ) {
    return undefined;
  }

  let transformedEduOrgs: NonNullable<Tag["eduOrgs"]> = [];

  preTransformedEduOrgs.forEach((preTransformedEduOrg, i) => {
    transformedEduOrgs[i] = {
      universitiesIds: transformTagEduOrgPart(
        preTransformedEduOrg.universitiesIds
      ),
      collegesIds: transformTagEduOrgPart(preTransformedEduOrg.collegesIds),
      years: transformTagEduOrgPart(preTransformedEduOrg.years),
    };
  });

  return transformedEduOrgs;
}

function transformTagEduOrgPart(part?: number | number[]): number[] {
  return part === undefined ? [] : typeof part === "number" ? [part] : part;
}
