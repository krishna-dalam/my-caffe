interface OidcPolicyConfig {
  accountId: string;
  githubOrg: string;
  githubRepo: string;
  githubEnvironment: string;
  region: string;
}

const readEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
};

const readConfig = (): OidcPolicyConfig => ({
  accountId: readEnv("DEV_AWS_ACCOUNT_ID") ?? readEnv("CDK_DEFAULT_ACCOUNT") ?? "123456789012",
  githubOrg: readEnv("GITHUB_ORG") ?? "krishna-dalam",
  githubRepo: readEnv("GITHUB_REPO") ?? "my-caffe",
  githubEnvironment: readEnv("GITHUB_ENVIRONMENT") ?? "dev",
  region: readEnv("CDK_DEFAULT_REGION") ?? "ap-south-1",
});

const makeTrustPolicy = ({ accountId, githubEnvironment, githubOrg, githubRepo }: OidcPolicyConfig): unknown => ({
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: {
        Federated: `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`,
      },
      Action: "sts:AssumeRoleWithWebIdentity",
      Condition: {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": `repo:${githubOrg}/${githubRepo}:environment:${githubEnvironment}`,
        },
      },
    },
  ],
});

const makePermissionPolicy = ({ accountId, region }: OidcPolicyConfig): unknown => ({
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "AssumeCdkBootstrapRoles",
      Effect: "Allow",
      Action: "sts:AssumeRole",
      Resource: [
        `arn:aws:iam::${accountId}:role/cdk-hnb659fds-deploy-role-${accountId}-${region}`,
        `arn:aws:iam::${accountId}:role/cdk-hnb659fds-file-publishing-role-${accountId}-${region}`,
        `arn:aws:iam::${accountId}:role/cdk-hnb659fds-image-publishing-role-${accountId}-${region}`,
        `arn:aws:iam::${accountId}:role/cdk-hnb659fds-lookup-role-${accountId}-${region}`,
      ],
    },
  ],
});

const main = (): void => {
  const config = readConfig();
  const roleArn = `arn:aws:iam::${config.accountId}:role/my-caffe-dev-github-deploy`;

  console.log("GitHub OIDC deploy role policy inputs:");
  console.log(`- AWS account: ${config.accountId}`);
  console.log(`- AWS region: ${config.region}`);
  console.log(`- GitHub subject: repo:${config.githubOrg}/${config.githubRepo}:environment:${config.githubEnvironment}`);
  console.log(`- Role ARN for DEV_AWS_DEPLOY_ROLE_ARN: ${roleArn}`);
  console.log("");
  console.log("trust-policy.json");
  console.log(JSON.stringify(makeTrustPolicy(config), null, 2));
  console.log("");
  console.log("permission-policy.json");
  console.log(JSON.stringify(makePermissionPolicy(config), null, 2));
};

main();
