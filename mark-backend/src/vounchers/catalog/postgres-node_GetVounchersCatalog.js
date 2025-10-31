SELECT
  id,
  provider,
  value,
  cost,
  currency,
  is_available AS "isAvailable",
  image_url AS "imageUrl"
FROM voucher_catalog
WHERE school_id = $1
  AND is_available = TRUE
ORDER BY cost ASC;
