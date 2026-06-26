export interface ApiGatewayHttpEvent {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  isBase64Encoded?: boolean;
  path?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
  rawPath?: string;
  requestContext?: {
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
  query: Record<string, string | undefined>;
  requestId: string;
}
