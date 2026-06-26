import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { ApiConstruct } from "./constructs/api.construct.js";
import { AuthConstruct } from "./constructs/auth.construct.js";
import { DatabaseConstruct } from "./constructs/database.construct.js";
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
      logoutUrls: [config.allowedOrigin],
    });

    const api = new ApiConstruct(this, "Api", {
      allowedOrigin: config.allowedOrigin,
      table: database.table,
    });

    new cdk.CfnOutput(this, "CoffeeTableName", {
      value: database.table.tableName,
    });
    new cdk.CfnOutput(this, "CustomerApiUrl", {
      value: api.api.apiEndpoint,
    });
    new cdk.CfnOutput(this, "CustomerUserPoolId", {
      value: auth.userPool.userPoolId,
    });
    new cdk.CfnOutput(this, "CustomerUserPoolClientId", {
      value: auth.userPoolClient.userPoolClientId,
    });
  }
}
