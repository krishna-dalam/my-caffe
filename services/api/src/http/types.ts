export interface ApiGatewayHttpEvent {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  isBase64Encoded?: boolean;
  path?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
  rawPath?: string;
  requestContext?: {
    authorizer?: {
      jwt?: {
        claims?: Record<string, string | number | boolean | string[] | undefined>;
      };
    };
    http?: {
      method?: string;
      path?: string;
    };
    requestId?: string;
  };
}

export interface ApiGatewayHttpResponse {
  body: string;
  headers: Record<string, string>;
  statusCode: number;
}

export interface ApiRequest {
  body: unknown;
  headers: Record<string, string | undefined>;
  method: string;
  path: string;
  principal: ApiRequestPrincipal | null;
  query: Record<string, string | undefined>;
  requestId: string;
}

export interface ApiRequestPrincipal {
  customerId: string;
  displayName?: string;
  email?: string;
}
