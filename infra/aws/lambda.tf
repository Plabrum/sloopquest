# ══════════════════════════════════════════════════════════════════════════════
# LAMBDA — Inbound email S3→webhook forwarder
# Triggered by S3 ObjectCreated on the inbound-emails bucket.
# Forwards {bucket, s3_key} + HMAC signature to the backend webhook endpoint.
# No VPC needed — calls the public ALB URL.
# ══════════════════════════════════════════════════════════════════════════════

# Zip the handler automatically — Terraform regenerates when handler.py changes
data "archive_file" "email_webhook_zip" {
  type        = "zip"
  source_file = "${path.module}/../lambda/handler.py"
  output_path = "${path.module}/../lambda/email_webhook.zip"
}

# ── IAM ───────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "email_webhook_lambda" {
  name = "${local.name}-email-webhook-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = { Name = "${local.name}-email-webhook-lambda" }
}

resource "aws_iam_role_policy_attachment" "email_webhook_lambda_basic" {
  role       = aws_iam_role.email_webhook_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "email_webhook_lambda_s3" {
  name = "${local.name}-email-webhook-s3"
  role = aws_iam_role.email_webhook_lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "${aws_s3_bucket.inbound_emails.arn}/emails/*"
    }]
  })
}

# ── Lambda function ───────────────────────────────────────────────────────────

# Read WEBHOOK_SECRET from the shared app secrets at apply time.
# Add WEBHOOK_SECRET to the ${local.name}-app-secrets secret in the AWS console
# before the first terraform apply — it won't be overwritten (ignore_changes).
data "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
}

resource "aws_lambda_function" "email_webhook" {
  function_name    = "${local.name}-email-webhook"
  filename         = data.archive_file.email_webhook_zip.output_path
  source_code_hash = data.archive_file.email_webhook_zip.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.13"
  role             = aws_iam_role.email_webhook_lambda.arn
  timeout          = 30

  environment {
    variables = {
      WEBHOOK_URL    = "https://api.${var.domain}/webhooks/comms/email/inbound"
      WEBHOOK_SECRET = jsondecode(data.aws_secretsmanager_secret_version.app.secret_string)["WEBHOOK_SECRET"]
    }
  }

  tags = { Name = "${local.name}-email-webhook" }
}

resource "aws_cloudwatch_log_group" "email_webhook_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.email_webhook.function_name}"
  retention_in_days = 365 # HIPAA: 1-year minimum for audit logs (NEA-103)
  tags              = { Name = "${local.name}-email-webhook-logs" }
}

# ── S3 → Lambda trigger ───────────────────────────────────────────────────────

resource "aws_lambda_permission" "s3_invoke_email_webhook" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.email_webhook.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.inbound_emails.arn
}

resource "aws_s3_bucket_notification" "inbound_emails" {
  bucket = aws_s3_bucket.inbound_emails.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.email_webhook.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "emails/"
  }

  depends_on = [aws_lambda_permission.s3_invoke_email_webhook]
}
