import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface ApiConstructProps {
  allowedOrigin: string;
  table: dynamodb.Table;
}

export class ApiConstruct extends Construct {
  readonly api: apigatewayv2.HttpApi;
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
      methods: [apigatewayv2.HttpMethod.GET],
      path: "/v1/me",
    });
    this.api.addRoutes({
      integration,
      methods: [apigatewayv2.HttpMethod.GET],
      path: "/v1/me/redemptions",
    });
    this.api.addRoutes({
      integration,
      methods: [apigatewayv2.HttpMethod.POST],
      path: "/v1/redemptions",
    });
  }
}
