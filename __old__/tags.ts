// TODO

import { objectType, enumType, queryField, inputObjectType } from 'nexus';

export const Tag = objectType({
  name: 'Tag',
  definition(t) {
    t.int('id');

    t.string('name');
    t.field('type', { type: 'TagType' });

    t.nullable.int('university');
    t.nullable.int('college');
    t.int('year');
  },
});

export const TagType = enumType({
  name: 'TagType',
  members: ['Subject', 'Term', 'Department'],
});

export const TagsQuery = queryField((t) => {
  t.list.field('tags', {
    type: 'Tag',
    args: { eduOrgInfo: 'EduOrgInfoInput' },
    resolve(_, { eduOrgInfo }, { prisma }) {
      return prisma.tag.findMany({
        where: {
          university: eduOrgInfo.university,
          college: eduOrgInfo.college,
          year: eduOrgInfo.year,
        },
      });
    },
  });
});
