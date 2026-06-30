import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

interface AuthConstructProps {
  callbackUrls: string[];
  cognitoDomainPrefix?: string;
  googleClientId?: string;
  googleClientSecretName?: string;
  logoutUrls: string[];
}

export class AuthConstruct extends Construct {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthConstructProps) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, "CustomerUserPool", {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
    });

    const supportedIdentityProviders = [cognito.UserPoolClientIdentityProvider.COGNITO];

    let googleProvider: cognito.UserPoolIdentityProviderGoogle | undefined;

    if (props.googleClientId && props.googleClientSecretName) {
      googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, "GoogleIdentityProvider", {
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          fullname: cognito.ProviderAttribute.GOOGLE_NAME,
        },
        clientId: props.googleClientId,
        clientSecretValue: cdk.SecretValue.secretsManager(props.googleClientSecretName),
        scopes: ["openid", "email", "profile"],
        userPool: this.userPool,
      });

      supportedIdentityProviders.push(cognito.UserPoolClientIdentityProvider.GOOGLE);
      this.userPool.registerIdentityProvider(googleProvider);
    }

    this.userPoolClient = new cognito.UserPoolClient(this, "CustomerWebClient", {
      authFlows: {
        userSrp: true,
      },
      generateSecret: false,
      oAuth: {
        callbackUrls: props.callbackUrls,
        flows: {
          authorizationCodeGrant: true,
        },
        logoutUrls: props.logoutUrls,
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
      preventUserExistenceErrors: true,
      supportedIdentityProviders,
      userPool: this.userPool,
    });

    if (googleProvider) {
      this.userPoolClient.node.addDependency(googleProvider);
    }

    if (props.cognitoDomainPrefix) {
      this.userPool.addDomain("HostedUiDomain", {
        cognitoDomain: {
          domainPrefix: props.cognitoDomainPrefix,
        },
      });
    }
  }
}
