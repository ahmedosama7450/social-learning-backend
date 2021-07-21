// TODO

import { list, nonNull, objectType } from "nexus";
import { Discussion as _Discussion } from "nexus-prisma";

export const Discussion = objectType({
  name: _Discussion.$name,
  definition(t) {
    t.field(_Discussion.id);

    t.field(_Discussion.body);
    t.field(_Discussion.attachments);
    t.field(_Discussion.createdAt);

    t.field(_Discussion.university);
    t.field(_Discussion.college);
    t.field(_Discussion.year);

    t.field(_Discussion.upvotesCount);
    t.field(_Discussion.downvotesCount);

    // Relations
    t.field(_Discussion.authorId);
    t.field(_Discussion.author);
    /* t.field('author', {
      type: 'User',
      async resolve(parent, _, { prisma }) {
        return (await prisma.discussion
          .findUnique({
            where: {
              id: parent.id,
            },
            rejectOnNotFound: true,
          })
          .author())!; // TODO there is a prisma issue here
      },
    }); */

    /*  t.list.field("tags", {
      type: "Tag",
      resolve(parent, _, { prisma }) {
        return prisma.discussion
          .findUnique({
            where: {
              id: parent.id,
            },
          })
          .tags();
      },
    }); */
  },
});

export const DiscussionComment = objectType({
  name: "DiscussionComment",
  definition(t) {
    t.int("id");

    t.string("body");
    t.list.string("attachments");
    t.dateTime("createdAt");

    t.int("upvotesCount");
    t.int("downvotesCount");

    // Relations
    t.int("authorId");
    t.field("author", {
      type: "User",
      async resolve(parent, _, { prisma }) {
        return (await prisma.discussionComment
          .findUnique({
            where: {
              id: parent.id,
            },
            rejectOnNotFound: true,
          })
          .author())!; // TODO there is a prisma issue here
      },
    });

    t.int("discussionId");
    t.field("discussion", {
      type: "Discussion",
      async resolve(parent, _, { prisma }) {
        return (await prisma.discussionComment
          .findUnique({
            where: {
              id: parent.id,
            },
            rejectOnNotFound: true,
          })
          .discussion())!; // TODO there is a prisma issue here
      },
    });
  },
});
