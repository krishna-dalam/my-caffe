interface RequestAccessTokenOptions {
  devAccessToken: string;
  hostedUiAccessToken: string | null;
}

export const chooseRequestAccessToken = ({
  devAccessToken,
  hostedUiAccessToken,
}: RequestAccessTokenOptions): string | null => {
  if (hostedUiAccessToken) {
    return hostedUiAccessToken;
  }

  return devAccessToken.trim().length > 0 ? devAccessToken : null;
};

export const hasRequestAccessToken = (tokens: RequestAccessTokenOptions): boolean =>
  chooseRequestAccessToken(tokens) !== null;
