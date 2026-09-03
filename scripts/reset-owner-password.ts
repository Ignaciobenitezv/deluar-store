import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env.production.local" });

const ownerEmail = (process.env.OWNER_EMAIL ?? "benitezvucasignacio@gmail.com").toLowerCase();
const newPassword = process.env.NEW_PASSWORD ?? process.env.BETTER_AUTH_NEW_PASSWORD ?? "";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function describeError(error: unknown) {
  const err = error as { name?: unknown; code?: unknown; message?: unknown; status?: unknown; cause?: unknown };
  const cause = err.cause as { name?: unknown; code?: unknown; message?: unknown; status?: unknown } | undefined;

  return {
    name: typeof err.name === "string" ? err.name : undefined,
    code: typeof err.code === "string" || typeof err.code === "number" ? err.code : undefined,
    status: typeof err.status === "string" || typeof err.status === "number" ? err.status : undefined,
    message: typeof err.message === "string" ? err.message : undefined,
    cause: cause
      ? {
          name: typeof cause.name === "string" ? cause.name : undefined,
          code: typeof cause.code === "string" || typeof cause.code === "number" ? cause.code : undefined,
          status: typeof cause.status === "string" || typeof cause.status === "number" ? cause.status : undefined,
          message: typeof cause.message === "string" ? cause.message : undefined,
        }
      : undefined,
  };
}

async function readPasswordFromStdin() {
  if (newPassword) return newPassword;

  const { stdin, stdout } = await import("node:process");
  const { emitKeypressEvents } = await import("node:readline");

  if (!stdin.isTTY) {
    fail("No se puede pedir la contraseña oculta porque stdin no es una terminal. Usá NEW_PASSWORD o ejecutalo en una consola interactiva.");
  }

  const prompt = "Nueva contraseña: ";
  stdout.write(prompt);

  const wasRawMode = typeof stdin.isRaw === "boolean" ? stdin.isRaw : false;
  const canSetRawMode = typeof stdin.setRawMode === "function";

  if (canSetRawMode) {
    stdin.setRawMode(true);
  }

  stdin.resume();
  emitKeypressEvents(stdin);

  return await new Promise<string>((resolve, reject) => {
    let value = "";

    const cleanup = () => {
      stdin.off("keypress", onKeypress);
      if (canSetRawMode) {
        stdin.setRawMode(wasRawMode);
      }
      stdin.pause();
      stdout.write("\n");
    };

    const onKeypress = (_str: string, key: { name?: string; sequence?: string; ctrl?: boolean; meta?: boolean }) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("Interrumpido por el usuario."));
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve(value.trim());
        return;
      }

      if (key.name === "backspace") {
        value = value.slice(0, -1);
        return;
      }

      if (key.sequence && !key.ctrl && !key.meta) {
        value += key.sequence;
      }
    };

    stdin.on("keypress", onKeypress);
  });
}

async function main() {
  const password = await readPasswordFromStdin();
  if (!password) {
    fail("No se indicó ninguna contraseña nueva.");
  }

  const { authRoles, authAccessControl, normalizeBetterAuthRoles } = await import("../src/lib/auth-roles");
  const { prisma } = await import("../src/lib/prisma");
  const { betterAuth } = await import("better-auth/minimal");
  const { admin: adminPlugin, testUtils } = await import("better-auth/plugins");
  const { prismaAdapter } = await import("better-auth/adapters/prisma");

  const { BETTER_AUTH_SECRET, BETTER_AUTH_URL, DATABASE_URL } = process.env;
  if (!BETTER_AUTH_SECRET || !BETTER_AUTH_URL || !DATABASE_URL) {
    fail("Faltan BETTER_AUTH_SECRET, BETTER_AUTH_URL o DATABASE_URL en el entorno.");
  }

  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail },
    select: {
      id: true,
      email: true,
      role: true,
      accounts: {
        select: {
          id: true,
          issuer: true,
          providerId: true,
          accountId: true,
          password: true,
        },
      },
    },
  });

  if (!owner) {
    fail(`No existe un usuario con email ${ownerEmail}.`);
  }

  const normalizedRoles = normalizeBetterAuthRoles(owner.role);
  if (!normalizedRoles.includes("owner")) {
    fail(`El usuario ${ownerEmail} existe pero no tiene rol owner.`);
  }

  const credentialAccounts = owner.accounts.filter((account) => account.providerId === "credential");
  if (credentialAccounts.length === 0) {
    fail(`El usuario ${ownerEmail} no tiene Account credential.`);
  }
  if (credentialAccounts.length > 1) {
    fail(`El usuario ${ownerEmail} tiene más de un Account credential y el script no puede elegir uno de forma inequívoca.`);
  }

  const credentialAccount = credentialAccounts[0];

  const auth = betterAuth({
    secret: BETTER_AUTH_SECRET,
    baseURL: BETTER_AUTH_URL,
    trustedOrigins: [BETTER_AUTH_URL],
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    advanced: {
      database: {
        joins: true,
        generateId: "uuid",
      },
    },
    plugins: [
      adminPlugin({
        ac: authAccessControl,
        roles: authRoles,
      }),
      testUtils(),
    ],
  });

  const ctx = await auth.$context;
  const adminLogin = await ctx.test.login({ userId: owner.id });

  try {
    await auth.api.setUserPassword({
      body: {
        userId: owner.id,
        newPassword: password,
      },
      headers: adminLogin.headers,
    });
  } catch (error) {
    console.error(JSON.stringify({ step: "setUserPassword", error: describeError(error) }, null, 2));
    process.exit(1);
  } finally {
    await prisma.session.deleteMany({
      where: {
        token: adminLogin.token,
      },
    });
  }

  let signInResult: { token: string; user: { id: string; email: string; role: string } } | null = null;
  try {
    const result = await auth.api.signInEmail({
      body: {
        email: ownerEmail,
        password,
        rememberMe: true,
      },
      headers: new Headers(),
    });

    signInResult = {
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role ? String(result.user.role) : "user",
      },
    };
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          step: "signInEmail",
          error: describeError(error),
          credentialAccount: {
            id: credentialAccount.id,
            issuer: credentialAccount.issuer,
            providerId: credentialAccount.providerId,
            accountId: credentialAccount.accountId,
            hasPassword: Boolean(credentialAccount.password),
          },
        },
        null,
        2,
      ),
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  try {
    if (signInResult) {
      await prisma.session.deleteMany({
        where: {
          token: signInResult.token,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("Contraseña actualizada correctamente");
  console.log(
    JSON.stringify(
      {
        credentialTarget: {
          userId: owner.id,
          email: owner.email,
          credentialAccountId: credentialAccount.id,
          providerId: credentialAccount.providerId,
          accountId: credentialAccount.accountId,
        },
        loginVerified: true,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ step: "fatal", error: describeError(error) }, null, 2));
  process.exit(1);
});
