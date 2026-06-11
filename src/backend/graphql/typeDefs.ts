import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Room {
    id: ID!
    roomCode: String!
    videoUrl: String!
    videoType: String!
    playing: Boolean!
    currentTime: Float!
    createdAt: String!
  }

  type Query {
    getRoom(roomCode: String!): Room
  }

  type Mutation {
    createRoom(videoUrl: String!, passcode: String): Room!
    joinRoom(roomCode: String!, passcode: String): Room
  }
`;
