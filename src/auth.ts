import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { isRole, type Role } from "@/lib/roles";

/**
 * Looks up a username against each role table in turn and returns the first
 * match with its role, or null. Usernames are unique per table but nothing
 * stops the same username existing in two tables, so admin is checked first,
 * then teacher, student, parent -- matching menu/permission precedence.
 */
const findUserByUsername = async (username: string) => {
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (admin) return { id: admin.id, username: admin.username, password: admin.password, role: "admin" as const };

  const teacher = await prisma.teacher.findUnique({ where: { username } });
  if (teacher) return { id: teacher.id, username: teacher.username, password: teacher.password, role: "teacher" as const };

  const student = await prisma.student.findUnique({ where: { username } });
  if (student) return { id: student.id, username: student.username, password: student.password, role: "student" as const };

  const parent = await prisma.parent.findUnique({ where: { username } });
  if (parent) return { id: parent.id, username: parent.username, password: parent.password, role: "parent" as const };

  return null;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await findUserByUsername(username);
        if (!user) return null;

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) return null;

        return { id: user.id, name: user.username, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      // `user` is only present right after sign-in; persist the role onto the token.
      if (user) token.role = (user as { role: Role }).role;
      return token;
    },
    session: ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;
      if (isRole(token.role)) session.user.role = token.role;
      return session;
    },
  },
});
