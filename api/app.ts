import express from "express";
import cookieParser from "cookie-parser";
import { ApolloServer } from "apollo-server-express";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import cors from "cors";

import schema from "./schema";
import { createContext } from "./context";

import "../lib/setupYup";

// ======================================
// Load environment variables from .env file into process.env
// ======================================
config();

// ======================================
// App declarations
// ======================================
const port = process.env.PORT || 4000;
const prisma = new PrismaClient({
  log: [],
});

const app = express();
const apolloServer = new ApolloServer({
  schema,
  context: createContext(prisma),
});

// ======================================
// App
// ======================================
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(cookieParser());
apolloServer.applyMiddleware({
  app,
  cors: false,
});

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
