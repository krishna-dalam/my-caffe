export interface ApiEnv {
  allowedOrigin: string;
  adminEmails: string[];
  awsRegion: string;
  customerRepository: "memory" | "dynamodb";
  tableName: string;
  port: number;
}

const readEnv = (key: string): string | undefined => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
};

export const readAdminEmails = (): string[] =>
  (readEnv("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const env: ApiEnv = {
  allowedOrigin: readEnv("ALLOWED_ORIGIN") ?? "http://localhost:5173",
  adminEmails: readAdminEmails(),
  awsRegion: readEnv("AWS_REGION") ?? "ap-south-1",
  customerRepository: readEnv("CUSTOMER_REPOSITORY") === "dynamodb" ? "dynamodb" : "memory",
  tableName: readEnv("COFFEE_TABLE_NAME") ?? "",
  port: Number(readEnv("API_PORT") ?? "3000"),
};
