# ══════════════════════════════════════════════════════════════════════════════
# DOCUMENTS (NEA-123) — platform-wide file upload bucket
# Stores PHI-bearing documents uploaded by staff and providers. Consumed
# through the `/documents/*` HTTP API which issues short-lived pre-signed
# URLs; the browser uploads directly to S3 and downloads through signed GETs.
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_s3_bucket" "documents" {
  bucket = "${local.name}-documents-${random_id.bucket_suffix.hex}"
  tags   = { Name = "${local.name}-documents", Purpose = "patient-documents" }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket                  = aws_s3_bucket.documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# HIPAA: deny non-HTTPS access (NEA-106 template)
resource "aws_s3_bucket_policy" "documents_https_only" {
  bucket = aws_s3_bucket.documents.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        aws_s3_bucket.documents.arn,
        "${aws_s3_bucket.documents.arn}/*",
      ]
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })
}

# CORS — browser uploads directly to S3 via pre-signed POST, downloads via
# signed GET opened in a new tab. Only the app origin is allowed.
resource "aws_s3_bucket_cors_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  cors_rule {
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = ["https://app.${var.domain}"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag", "Content-Length", "x-amz-server-side-encryption"]
    max_age_seconds = 3000
  }
}

# Lifecycle — orphan cleanup via object tagging. The upload handler returns a
# pre-signed POST whose conditions force `x-amz-meta-status=pending`; the
# /confirm handler clears or overwrites that tag. Objects that never get
# confirmed get garbage-collected after 24h. Linked documents (no pending
# tag) are retained — HIPAA minimum retention runs long past anything we'd
# enforce here.
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    id     = "expire-unconfirmed-uploads"
    status = "Enabled"
    filter {
      tag {
        key   = "status"
        value = "pending"
      }
    }
    expiration { days = 1 }
  }
}
