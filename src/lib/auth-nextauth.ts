import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyToken } from './auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Aquí deberías verificar las credenciales contra tu base de datos
          // Por ahora, retornamos un usuario de ejemplo
          return {
            id: '870e589f-d313-4a5a-901f-f25fd4e7240a',
            email: credentials.email,
            tenantId: '870e589f-d313-4a5a-901f-f25fd4e7240a',
            name: 'Usuario de Prueba'
          };
        } catch (error) {
          console.error('Error en autenticación:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.tenantId = token.tenantId as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/admin-login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
};
