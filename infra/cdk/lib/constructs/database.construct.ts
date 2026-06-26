import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

interface DatabaseConstructProps {
  appEnv: string;
}

export class DatabaseConstruct extends Construct {
  readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    this.table = new dynamodb.Table(this, "CoffeeTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: props.appEnv === "production",
      },
      removalPolicy: props.appEnv === "production" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      sortKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: {
        name: "gsi1pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "gsi1sk",
        type: dynamodb.AttributeType.STRING,
      },
    });
  }
}
