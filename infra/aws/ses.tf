# ══════════════════════════════════════════════════════════════════════════════
# SES — OUTBOUND + INBOUND EMAIL
# Outbound: magic link emails, call summaries
# Inbound: SES receipt rule → S3 bucket → Lambda → backend webhook
# ══════════════════════════════════════════════════════════════════════════════

# ── Inbound S3 bucket ────────────────────────────────────────────────────────

resource "aws_s3_bucket" "inbound_emails" {
  bucket = "${local.name}-inbound-emails-${random_id.bucket_suffix.hex}"
  tags   = { Name = "${local.name}-inbound-emails", Purpose = "ses-inbound" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "inbound_emails" {
  bucket = aws_s3_bucket.inbound_emails.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "inbound_emails" {
  bucket                  = aws_s3_bucket.inbound_emails.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "inbound_emails" {
  bucket = aws_s3_bucket.inbound_emails.id
  rule {
    id     = "expire-raw-emails"
    status = "Enabled"
    filter { prefix = "" }
    expiration { days = 365 } # HIPAA: 1-year minimum retention (NEA-111)
  }
}

# Allow SES to write into the bucket
resource "aws_s3_bucket_policy" "inbound_emails_ses" {
  bucket = aws_s3_bucket.inbound_emails.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSESPuts"
        Effect    = "Allow"
        Principal = { Service = "ses.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.inbound_emails.arn}/emails/*"
        Condition = {
          StringEquals = { "aws:Referer" = data.aws_caller_identity.current.account_id }
        }
      },
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.inbound_emails.arn,
          "${aws_s3_bucket.inbound_emails.arn}/*",
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      },
    ]
  })
}

# ── SES receipt rules ────────────────────────────────────────────────────────

resource "aws_ses_receipt_rule_set" "main" {
  rule_set_name = "${local.name}-receipt-rules"
}

resource "aws_ses_active_receipt_rule_set" "main" {
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
}

resource "aws_ses_receipt_rule" "inbound" {
  name          = "${local.name}-inbound-email"
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
  enabled       = true
  scan_enabled  = true

  recipients = ["care@${var.domain}", "support@${var.domain}"]

  s3_action {
    bucket_name       = aws_s3_bucket.inbound_emails.id
    object_key_prefix = "emails/"
    position          = 1
  }

  depends_on = [aws_s3_bucket_policy.inbound_emails_ses]
}

# ══════════════════════════════════════════════════════════════════════════════

resource "aws_ses_domain_identity" "main" {
  domain = var.domain
}

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

resource "aws_ses_configuration_set" "main" {
  name = "${local.name}-ses"
}

# ── Route53 DNS records for email deliverability ───────────────────────────────

# DKIM — proves emails are sent by an authorised server for sloopquest.app
resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = aws_route53_zone.main.zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain}"
  type    = "CNAME"
  ttl     = 300
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# SES domain verification TXT record
resource "aws_route53_record" "ses_verification" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_amazonses.${var.domain}"
  type    = "TXT"
  ttl     = 300
  records = [aws_ses_domain_identity.main.verification_token]
}

resource "aws_ses_domain_identity_verification" "main" {
  domain     = aws_ses_domain_identity.main.domain
  depends_on = [aws_route53_record.ses_verification]
}

# MX — routes inbound mail for the domain to SES's receiving endpoints
resource "aws_route53_record" "ses_mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain
  type    = "MX"
  ttl     = 300
  records = ["10 inbound-smtp.${var.aws_region}.amazonaws.com"]
}

# SPF — tells receiving servers that SES is allowed to send from sloopquest.app
resource "aws_route53_record" "ses_spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:amazonses.com ~all"]
}

# DMARC — policy for handling emails that fail SPF/DKIM checks
resource "aws_route53_record" "ses_dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.${var.domain}"
  type    = "TXT"
  ttl     = 300
  records = ["v=DMARC1; p=none; rua=mailto:dmarc@${var.domain}"]
}
