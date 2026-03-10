export function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }

  return value;
}

export const authConfig = {
  maxAttempts: Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS ?? 5),
  lockMinutes: Number(process.env.AUTH_LOGIN_LOCK_MINUTES ?? 15),
};
