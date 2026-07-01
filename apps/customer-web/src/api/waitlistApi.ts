import type { JoinWaitlistRequest, JoinWaitlistResponse } from "@my-caffe/shared";
import { env } from "../config/env";
import { jsonRequest } from "./httpClient";

export const joinWaitlist = (input: JoinWaitlistRequest): Promise<JoinWaitlistResponse> =>
  jsonRequest<JoinWaitlistResponse>({
    accessToken: null,
    apiBaseUrl: env.apiBaseUrl,
    init: {
      body: JSON.stringify(input),
      method: "POST",
    },
    path: "/waitlist",
  });
