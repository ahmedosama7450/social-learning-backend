import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      profile: {
        create: {
          locale: "ARABIC",
          bio: "Hello World",
        },
      },
      firstName: "ahmed",
      lastName: "osama",
      provider: "GOOGLE",
      providerUid: "dasdasdasdsa",
      username: "ahmedosama",
      posts: {
        createMany: {
          data: [
            {
              type: "DISCUSSION",
              title: "First discussion",
              body: "Hey guys, this is my first discussion here",
              tagsIds: [],
              votesCount: 5,
              commentsCount: 2,
              sharesCount: 4,
            },
            {
              type: "DISCUSSION",
              title: "What is it like to be like it is ?",
              body: "The question says it all, I would like to know what you guys think",
              tagsIds: [],
              votesCount: 5,
              commentsCount: 2,
              sharesCount: 4,
            },
          ],
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      profile: {
        create: {
          locale: "ARABIC",
          bio: "Hello World",
        },
      },
      firstName: "ibrahim",
      lastName: "mahmoud",
      provider: "GOOGLE",
      providerUid: "dasddsasdasdsa",
      username: "ibrahim",
      posts: {
        createMany: {
          data: [
            {
              type: "DISCUSSION",
              title: "Interesting talk",
              body: "Hey guys, this is an interesting discussion",
              tagsIds: [],
              votesCount: 5,
              commentsCount: 2,
              sharesCount: 4,
            },
          ],
        },
      },
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
