import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface WebsiteConstructProps {
  certificateArn?: string;
  domainName: string;
  hostedZone?: route53.IHostedZone;
  runtimeConfig: Record<string, string | boolean>;
}

export class WebsiteConstruct extends Construct {
  readonly bucket: s3.Bucket;
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: WebsiteConstructProps) {
    super(scope, id);

    const webDistPath = join(process.cwd(), "../../apps/customer-web/dist");
    if (!existsSync(webDistPath)) {
      throw new Error("apps/customer-web/dist is missing. Run `pnpm --filter @my-caffe/customer-web build` before CDK synth.");
    }

    const certificate = props.certificateArn
      ? acm.Certificate.fromCertificateArn(this, "WebCertificate", props.certificateArn)
      : undefined;

    this.bucket = new s3.Bucket(this, "CustomerWebBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.distribution = new cloudfront.Distribution(this, "CustomerWebDistribution", {
      certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
      domainNames: certificate ? [props.domainName] : undefined,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    new s3deploy.BucketDeployment(this, "CustomerWebDeployment", {
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
      sources: [
        s3deploy.Source.asset(webDistPath),
        s3deploy.Source.jsonData("config.json", props.runtimeConfig, {
          escape: true,
        }),
      ],
    });

    if (certificate && props.hostedZone) {
      new route53.ARecord(this, "CustomerWebAliasRecord", {
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
        zone: props.hostedZone,
      });
    }
  }
}
