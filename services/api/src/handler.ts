import { createRouter } from "./http/router.js";
import type { ApiGatewayHttpEvent, ApiGatewayHttpResponse } from "./http/types.js";

const router = createRouter();

export const handler = async (event: ApiGatewayHttpEvent): Promise<ApiGatewayHttpResponse> => router.handle(event);
