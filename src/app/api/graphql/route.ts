import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { typeDefs } from '@/backend/graphql/typeDefs';
import { resolvers } from '@/backend/graphql/resolvers';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Create the Next.js handler
const handler = startServerAndCreateNextHandler<NextRequest>(server, {
  context: async (req) => {
    // Extract IP address for rate limiting
    const forwarded = req.headers.get('x-forwarded-for');
    const userIp = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

    return { req, userIp };
  },
});

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
