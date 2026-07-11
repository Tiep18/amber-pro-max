export function selectActiveAdminHref(pathname: string, hrefs: string[]) {
  return hrefs
    .filter((href) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`)))
    .sort((left, right) => right.length - left.length)[0];
}
