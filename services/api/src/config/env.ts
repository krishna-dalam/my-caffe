export interface ApiEnv {
  allowedOrigin: string;
  port: number;
}

const readEnv = (key: string): string | undefined => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
};

export const env: ApiEnv = {
  allowedOrigin: readEnv("ALLOWED_ORIGIN") ?? "http://localhost:5173",
  port: Number(readEnv("API_PORT") ?? "3000"),
};
