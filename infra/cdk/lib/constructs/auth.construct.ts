import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

interface AuthConstructProps {
  callbackUrls: string[];
  cognitoDomainPrefix?: string;
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
      userPool: this.userPool,
    });

    if (props.cognitoDomainPrefix) {
      this.userPool.addDomain("HostedUiDomain", {
        cognitoDomain: {
          domainPrefix: props.cognitoDomainPrefix,
        },
      });
    }
  }
}
