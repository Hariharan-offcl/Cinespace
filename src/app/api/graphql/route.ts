import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import dbConnect from '@/backend/config/db';
import { typeDefs } from '@/backend/graphql/typeDefs';
import { resolvers } from '@/backend/graphql/resolvers';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Create the Next.js handler
const handler = startServerAndCreateNextHandler<NextRequest>(server, {
  context: async (req) => {
    // Connect to database on every request (cached in db.ts)
    await dbConnect();

    // Extract IP address for rate limiting
    // x-forwarded-for is used when behind a proxy (like Vercel or Render)
    const forwarded = req.headers.get('x-forwarded-for');
    const userIp = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

    return { req, userIp };
  },
});

export { handler as GET, handler as POST };
