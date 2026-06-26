import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import { ApiConstruct } from "./constructs/api.construct.js";
import { AuthConstruct } from "./constructs/auth.construct.js";
import { DatabaseConstruct } from "./constructs/database.construct.js";
import { WebsiteConstruct } from "./constructs/website.construct.js";
import { readConfig } from "./config.js";

interface CoffeeSubscriptionStackProps extends cdk.StackProps {
  appEnv: string;
}

export class CoffeeSubscriptionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CoffeeSubscriptionStackProps) {
    super(scope, id, props);

    const config = readConfig(this, props.appEnv);
    const database = new DatabaseConstruct(this, "Database", {
      appEnv: config.appEnv,
    });

    const auth = new AuthConstruct(this, "Auth", {
      callbackUrls: [`${config.allowedOrigin}/auth/callback`],
      cognitoDomainPrefix: config.cognitoDomainPrefix,
      googleClientId: config.googleClientId,
      googleClientSecretName: config.googleClientSecretName,
      logoutUrls: [config.allowedOrigin],
    });

    const hostedZone =
      config.hostedZoneId && config.hostedZoneName
        ? route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
            hostedZoneId: config.hostedZoneId,
            zoneName: config.hostedZoneName,
          })
        : undefined;

    const api = new ApiConstruct(this, "Api", {
      certificateArn: config.apiCertificateArn,
      domainName: config.apiDomainName,
      allowedOrigin: config.allowedOrigin,
      hostedZone,
      table: database.table,
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
    });

    const website = new WebsiteConstruct(this, "Website", {
      certificateArn: config.webCertificateArn,
      domainName: config.webDomainName,
      hostedZone,
    });

    new cdk.CfnOutput(this, "CoffeeTableName", {
      value: database.table.tableName,
    });
    new cdk.CfnOutput(this, "CustomerApiUrl", {
      value: api.api.apiEndpoint,
    });
    new cdk.CfnOutput(this, "CustomerWebDistributionDomainName", {
      value: website.distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "CustomerWebDomainName", {
      value: config.webDomainName,
    });
    new cdk.CfnOutput(this, "CustomerApiDomainName", {
      value: config.apiDomainName,
    });
    new cdk.CfnOutput(this, "CustomerUserPoolId", {
      value: auth.userPool.userPoolId,
    });
    new cdk.CfnOutput(this, "CustomerUserPoolClientId", {
      value: auth.userPoolClient.userPoolClientId,
    });
  }
}
