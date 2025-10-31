SELECT
  id,
  provider,
  value,
  cost,
  currency,
  is_available,
  image_url AS imageUrl
FROM voucher_catalog
WHERE id = $1
  AND school_id = $2
  AND is_available = TRUE;
