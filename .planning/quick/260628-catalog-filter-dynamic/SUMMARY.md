# Summary

The catalog page was incorrectly forced static even though category/type/search filters depend on `searchParams`. Removing `force-static` restores server-rendered filter behavior while keeping canonical/noindex metadata for query URLs.
