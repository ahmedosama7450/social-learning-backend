import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApolloServer } from "apollo-server-express";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

import schema from "./schema";
import { createContext } from "./context";

config(); // TODO do I need this in production ?

async function startServer() {
  // Setup prisma client and prisma middleware
  const prisma = new PrismaClient({
    log: ["error", "warn", "query"],
  });

  // Create express app with custom middleware
  const app = express();
  // TODO maybe use apollo cors, instead
  app.use(
    cors({
      credentials: true,
      origin: ["http://localhost:3000", "https://studio.apollographql.com"],
    })
  ); // TODO Change origin to whatever frontend domain is
  app.use(cookieParser());

  // Apply apollo server middleware
  const apolloServer = new ApolloServer({
    schema,
    context: createContext(prisma),
    formatError(err) {
      // TODO We still need more powerful logging
      console.log(err);
      return err;
    },
  });
  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  // Start the server
  const port = process.env.PORT || 4000;
  app
    .listen(port, () => {
      console.log(
        `🚀 Graphql Server ready at http://localhost:${port}${apolloServer.graphqlPath}`
      );
    })
    .on("error", async (e) => {
      console.error("Error stopped server", e);
      prisma.$disconnect();
    });
}

// TODO maybe wrap with try/catch to disconnect prisma client
startServer();
