// TODO I am thinking aobut putting this data somewhere else e.g. a CDN or so

export const EDU_ORGS_GENERAL_OPTION_VALUE = -1;

export const eduOrgsInfoVersion = 1;

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
 * Tags are very specific to the univeristy, college, year they're attached to. A tag
 * with cairo universiry and arts college is different from a tag with only cairo university
 *
 * eduOrg is the array of all possible combinations of its constituent arrays
 *
 * Leaving eduOrgs undefined is assumed to be {}
 * Leaving one of the constiuent arrays of eduOrgs undefined is assumed to be, e.g. universitiesIds: [-1]
 */
export interface Tag {
  description: string;
  type: TagType;
  eduOrgs?: {
    universitiesIds?: number[];
    collegesIds?: number[];
    years?: number[];
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

export const tags: Record<number, Tag> = {
  1: {
    description: "Math",
    type: TagType.SUBJECT,
    eduOrgs: [
      { universitiesIds: [1, 2], collegesIds: [3, 2], years: [1, 2, 3] },
      { universitiesIds: [1], collegesIds: [1], years: [1] },
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
      { universitiesIds: [2], collegesIds: [1], years: [0, 1, 2, 3, 4] },
      { universitiesIds: [1], collegesIds: [1], years: [1] },
    ],
  },
  4: {
    description: "Electronics",
    type: TagType.SUBJECT,
    eduOrgs: [{ collegesIds: [1] }],
  },
};
