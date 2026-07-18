import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import clientPromise from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      try {
        const client = await clientPromise;
        const db = client.db();
        const usersCollection = db.collection('users');

        // Check if user exists
        const existingUser = await usersCollection.findOne({ email: user.email });

        if (!existingUser) {
          // Check for intent cookie to automatically set role
          let roleIntent: string | undefined;
          try {
            const { cookies } = require('next/headers');
            const cookieStore = await cookies();
            roleIntent = cookieStore.get('scoutlayer_role_intent')?.value;
          } catch (e) {
            console.error('Error reading cookies in NextAuth signIn callback:', e);
          }

          const resolvedRole = (roleIntent === 'founder' || roleIntent === 'investor') ? roleIntent : undefined;

          // Create new user with resolved role from intent if present
          await usersCollection.insertOne({
            email: user.email,
            name: user.name || '',
            role: resolvedRole,
            createdAt: new Date(),
          });
        }
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async jwt({ token, user, trigger, session }) {
      // Fetch user role from DB
      if (token.email) {
        try {
          const client = await clientPromise;
          const db = client.db();
          const usersCollection = db.collection('users');
          const dbUser = await usersCollection.findOne({ email: token.email });
          if (dbUser) {
            token.role = dbUser.role;
            token.userId = dbUser._id.toString();
          }
        } catch (error) {
          console.error('Error fetching user in jwt callback:', error);
        }
      }

      // Handle session updates (e.g. after choosing a role)
      if (trigger === 'update' && session?.role) {
        token.role = session.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
