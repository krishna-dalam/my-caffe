export interface ApiEnv {
  allowedOrigin: string;
  awsRegion: string;
  customerRepository: "memory" | "dynamodb";
  tableName: string;
  port: number;
}

const readEnv = (key: string): string | undefined => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
};

export const env: ApiEnv = {
  allowedOrigin: readEnv("ALLOWED_ORIGIN") ?? "http://localhost:5173",
  awsRegion: readEnv("AWS_REGION") ?? "ap-south-1",
  customerRepository: readEnv("CUSTOMER_REPOSITORY") === "dynamodb" ? "dynamodb" : "memory",
  tableName: readEnv("COFFEE_TABLE_NAME") ?? "",
  port: Number(readEnv("API_PORT") ?? "3000"),
};
