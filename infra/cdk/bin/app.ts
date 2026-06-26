#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CoffeeSubscriptionStack } from "../lib/coffee-subscription-stack.js";

const app = new cdk.App();

const appEnv = app.node.tryGetContext("appEnv")?.toString() ?? process.env.APP_ENV ?? "dev";
const region = process.env.CDK_DEFAULT_REGION ?? "ap-south-1";
const account = process.env.CDK_DEFAULT_ACCOUNT;

new CoffeeSubscriptionStack(app, `MyCaffe-${appEnv}`, {
  appEnv,
  env: {
    account,
    region,
  },
});
