import type { Construct } from "constructs";

export interface InfraConfig {
  apiCertificateArn?: string;
  apiDomainName: string;
  allowedOrigin: string;
  appEnv: string;
  cognitoDomainPrefix?: string;
  hostedZoneId?: string;
  hostedZoneName?: string;
  rootDomainName: string;
  webCertificateArn?: string;
  webDomainName: string;
}

export const readConfig = (scope: Construct, appEnv: string): InfraConfig => ({
  apiCertificateArn: scope.node.tryGetContext("apiCertificateArn")?.toString() ?? process.env.API_CERTIFICATE_ARN,
  apiDomainName:
    scope.node.tryGetContext("apiDomainName")?.toString() ?? process.env.API_DOMAIN_NAME ?? `api.${appEnv}.mycaffe.in`,
  allowedOrigin: scope.node.tryGetContext("allowedOrigin")?.toString() ?? process.env.ALLOWED_ORIGIN ?? "http://localhost:5173",
  appEnv,
  cognitoDomainPrefix: scope.node.tryGetContext("cognitoDomainPrefix")?.toString() ?? process.env.COGNITO_DOMAIN_PREFIX,
  hostedZoneId: scope.node.tryGetContext("hostedZoneId")?.toString() ?? process.env.HOSTED_ZONE_ID,
  hostedZoneName: scope.node.tryGetContext("hostedZoneName")?.toString() ?? process.env.HOSTED_ZONE_NAME,
  rootDomainName: scope.node.tryGetContext("rootDomainName")?.toString() ?? process.env.ROOT_DOMAIN_NAME ?? "mycaffe.in",
  webCertificateArn: scope.node.tryGetContext("webCertificateArn")?.toString() ?? process.env.WEB_CERTIFICATE_ARN,
  webDomainName: scope.node.tryGetContext("webDomainName")?.toString() ?? process.env.WEB_DOMAIN_NAME ?? `${appEnv}.mycaffe.in`,
});
