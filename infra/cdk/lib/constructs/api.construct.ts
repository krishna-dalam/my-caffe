import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface ApiConstructProps {
  certificateArn?: string;
  domainName: string;
  allowedOrigin: string;
  hostedZone?: route53.IHostedZone;
  table: dynamodb.Table;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
}

export class ApiConstruct extends Construct {
  readonly api: apigatewayv2.HttpApi;
  readonly customDomain?: apigatewayv2.DomainName;
  readonly handler: lambda.Function;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const apiDistPath = join(process.cwd(), "../../services/api/dist");
    if (!existsSync(apiDistPath)) {
      throw new Error("services/api/dist is missing. Run `pnpm --filter @my-caffe/api build` before CDK synth.");
    }

    this.handler = new lambda.Function(this, "CustomerApiHandler", {
      code: lambda.Code.fromAsset(apiDistPath),
      environment: {
        ALLOWED_ORIGIN: props.allowedOrigin,
        COFFEE_TABLE_NAME: props.table.tableName,
        CUSTOMER_REPOSITORY: "dynamodb",
      },
      handler: "handler.handler",
      memorySize: 256,
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
    });

    props.table.grantReadWriteData(this.handler);

    const integration = new integrations.HttpLambdaIntegration("CustomerApiIntegration", this.handler);
    const customerAuthorizer = new authorizers.HttpUserPoolAuthorizer("CustomerJwtAuthorizer", props.userPool, {
      userPoolClients: [props.userPoolClient],
    });

    this.api = new apigatewayv2.HttpApi(this, "CustomerHttpApi", {
      corsPreflight: {
        allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.OPTIONS,
          apigatewayv2.CorsHttpMethod.POST,
        ],
        allowOrigins: [props.allowedOrigin],
      },
    });

    this.api.addRoutes({
      integration,
      methods: [apigatewayv2.HttpMethod.GET],
      path: "/v1/health",
    });
    this.api.addRoutes({
      integration,
      methods: [apigatewayv2.HttpMethod.GET],
      path: "/v1/cafes/{slug}",
    });
    this.api.addRoutes({
      integration,
      methods: [apigatewayv2.HttpMethod.POST],
      path: "/v1/waitlist",
    });
    this.api.addRoutes({
      authorizer: customerAuthorizer,
      integration,
      methods: [apigatewayv2.HttpMethod.GET],
      path: "/v1/me",
    });
    this.api.addRoutes({
      authorizer: customerAuthorizer,
      integration,
      methods: [apigatewayv2.HttpMethod.GET],
      path: "/v1/me/redemptions",
    });
    this.api.addRoutes({
      authorizer: customerAuthorizer,
      integration,
      methods: [apigatewayv2.HttpMethod.POST],
      path: "/v1/redemptions",
    });

    if (props.certificateArn) {
      const domainName = new apigatewayv2.DomainName(this, "CustomerApiDomainName", {
        certificate: acm.Certificate.fromCertificateArn(this, "CustomerApiCertificate", props.certificateArn),
        domainName: props.domainName,
      });
      this.customDomain = domainName;

      new apigatewayv2.ApiMapping(this, "CustomerApiMapping", {
        api: this.api,
        domainName,
      });

      if (props.hostedZone) {
        new route53.ARecord(this, "CustomerApiAliasRecord", {
          recordName: props.domainName,
          target: route53.RecordTarget.fromAlias(new targets.ApiGatewayv2DomainProperties(domainName.regionalDomainName, domainName.regionalHostedZoneId)),
          zone: props.hostedZone,
        });
      }
    }
  }
}
