import type { Construct } from "constructs";

export interface InfraConfig {
  allowedOrigin: string;
  appEnv: string;
  cognitoDomainPrefix?: string;
}

export const readConfig = (scope: Construct, appEnv: string): InfraConfig => ({
  allowedOrigin: scope.node.tryGetContext("allowedOrigin")?.toString() ?? process.env.ALLOWED_ORIGIN ?? "http://localhost:5173",
  appEnv,
  cognitoDomainPrefix: scope.node.tryGetContext("cognitoDomainPrefix")?.toString() ?? process.env.COGNITO_DOMAIN_PREFIX,
});
