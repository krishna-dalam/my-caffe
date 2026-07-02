export type AdminRoute =
  | { name: "authCallback" }
  | { name: "cafeDetail"; cafeId: string }
  | { name: "cafeList" }
  | { name: "cafeNew" };

export const parseAdminRoute = (pathname: string): AdminRoute => {
  if (pathname === "/auth/callback") {
    return { name: "authCallback" };
  }

  if (pathname === "/admin/cafes/new") {
    return { name: "cafeNew" };
  }

  const detailMatch = pathname.match(/^\/admin\/cafes\/([^/]+)$/);
  if (detailMatch?.[1]) {
    return { name: "cafeDetail", cafeId: decodeURIComponent(detailMatch[1]) };
  }

  return { name: "cafeList" };
};

