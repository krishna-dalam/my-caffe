export const chooseRequestAccessToken = ({
  devAccessToken,
  hostedUiAccessToken,
}: {
  devAccessToken: string;
  hostedUiAccessToken: string | null;
}): string | null => {
  if (hostedUiAccessToken) {
    return hostedUiAccessToken;
  }

  return devAccessToken.trim().length > 0 ? devAccessToken : null;
};
