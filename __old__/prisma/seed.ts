import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  /*   prisma.tag.createMany({
    data: [
      {
        name: 'Math',
        type: 'Subject',
      },
      { name: 'First Term', type: 'Term' },
      { name: 'Second Term', type: 'Term' },
    ],
  }); */
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
