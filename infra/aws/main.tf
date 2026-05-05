data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" { state = "available" }

locals {
  name     = "${var.project_name}-${var.environment}"
  az_count = min(length(data.aws_availability_zones.available.names), length(var.public_subnet_cidrs))

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# VPC & NETWORKING
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = "${local.name}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-igw" }
}

# Public subnets — ALB + ECS tasks (saves NAT Gateway cost ~$87/mo)
resource "aws_subnet" "public" {
  count                   = local.az_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "${local.name}-public-${count.index + 1}" }
}

# Private subnets — Aurora + ElastiCache only
resource "aws_subnet" "private" {
  count             = local.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "${local.name}-private-${count.index + 1}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "${local.name}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = local.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-private-rt" }
}

resource "aws_route_table_association" "private" {
  count          = local.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ── VPC Endpoints (enables ECS Exec via Session Manager without NAT) ──────────

resource "aws_vpc_endpoint" "ssm" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ssm"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.public[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
  tags                = { Name = "${local.name}-ssm-endpoint" }
}

resource "aws_vpc_endpoint" "ssm_messages" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ssmmessages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.public[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
  tags                = { Name = "${local.name}-ssmmessages-endpoint" }
}

resource "aws_vpc_endpoint" "ec2_messages" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ec2messages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.public[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
  tags                = { Name = "${local.name}-ec2messages-endpoint" }
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.public.id, aws_route_table.private.id]
  tags              = { Name = "${local.name}-s3-endpoint" }
}

# ══════════════════════════════════════════════════════════════════════════════
# SECURITY GROUPS
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb-sg"
  description = "ALB - allow HTTP/HTTPS from internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${local.name}-alb-sg" }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "${local.name}-ecs-tasks-sg"
  description = "ECS tasks - allow traffic from ALB on port 8000"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${local.name}-ecs-tasks-sg" }
}

resource "aws_security_group" "database" {
  name        = "${local.name}-database-sg"
  description = "Aurora - allow PostgreSQL from ECS tasks only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
  tags = { Name = "${local.name}-database-sg" }
}

resource "aws_security_group" "vpc_endpoints" {
  name        = "${local.name}-vpc-endpoints-sg"
  description = "VPC endpoints - allow HTTPS from ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${local.name}-vpc-endpoints-sg" }
}

# ══════════════════════════════════════════════════════════════════════════════
# ECR REPOSITORY
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_ecr_repository" "app" {
  name                 = var.ecr_repository
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = { Name = var.ecr_repository }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# ══════════════════════════════════════════════════════════════════════════════
# S3 STORAGE
# ══════════════════════════════════════════════════════════════════════════════

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Audio recordings (call recordings uploaded during/after calls)
resource "aws_s3_bucket" "audio" {
  bucket = "${local.name}-audio-${random_id.bucket_suffix.hex}"
  tags   = { Name = "${local.name}-audio", Purpose = "call-recordings" }
}

resource "aws_s3_bucket_versioning" "audio" {
  bucket = aws_s3_bucket.audio.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "audio" {
  bucket                  = aws_s3_bucket.audio.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# HIPAA: deny non-HTTPS access (NEA-106)
resource "aws_s3_bucket_policy" "audio_https_only" {
  bucket = aws_s3_bucket.audio.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        aws_s3_bucket.audio.arn,
        "${aws_s3_bucket.audio.arn}/*",
      ]
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id
  rule {
    id     = "archive-old-recordings"
    status = "Enabled"
    filter { prefix = "" }
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# Transcripts (STT output from Deepgram)
resource "aws_s3_bucket" "transcripts" {
  bucket = "${local.name}-transcripts-${random_id.bucket_suffix.hex}"
  tags   = { Name = "${local.name}-transcripts", Purpose = "stt-transcripts" }
}

resource "aws_s3_bucket_versioning" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "transcripts" {
  bucket                  = aws_s3_bucket.transcripts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# HIPAA: deny non-HTTPS access (NEA-106)
resource "aws_s3_bucket_policy" "transcripts_https_only" {
  bucket = aws_s3_bucket.transcripts.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        aws_s3_bucket.transcripts.arn,
        "${aws_s3_bucket.transcripts.arn}/*",
      ]
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })
}

# ══════════════════════════════════════════════════════════════════════════════
# AURORA SERVERLESS V2
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.name}-db-subnet-group" }
}

# HIPAA: enforce TLS on all database connections (NEA-108)
resource "aws_rds_cluster_parameter_group" "main" {
  name        = "${local.name}-aurora-params"
  family      = "aurora-postgresql17"
  description = "Sloopquest Aurora PostgreSQL - HIPAA-compliant parameters"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = { Name = "${local.name}-aurora-params" }
}

resource "aws_rds_cluster" "main" {
  cluster_identifier              = "${local.name}-aurora"
  engine                          = "aurora-postgresql"
  engine_mode                     = "provisioned"
  engine_version                  = "17.4"
  database_name                   = var.db_name
  master_username                 = var.db_username
  master_password                 = var.db_password
  db_subnet_group_name            = aws_db_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.database.id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name

  serverlessv2_scaling_configuration {
    min_capacity             = var.db_min_acu
    max_capacity             = var.db_max_acu
    seconds_until_auto_pause = var.db_auto_pause_seconds
  }

  backup_retention_period   = var.environment == "production" ? 7 : 1
  preferred_backup_window   = "03:00-04:00"
  storage_encrypted         = true
  deletion_protection       = var.environment == "production"
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.name}-final-snapshot" : null

  tags = { Name = "${local.name}-aurora" }
}

resource "aws_rds_cluster_instance" "main" {
  identifier         = "${local.name}-aurora-instance"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  db_subnet_group_name         = aws_db_subnet_group.main.name
  publicly_accessible          = false
  performance_insights_enabled = true

  tags = { Name = "${local.name}-aurora-instance" }
}

# ══════════════════════════════════════════════════════════════════════════════
# SECRETS MANAGER
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name}-app-secrets"
  description             = "Sloopquest application secrets - managed outside Terraform after initial creation"
  recovery_window_in_days = 7
  tags                    = { Name = "${local.name}-app-secrets" }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    PLACEHOLDER = "PLACEHOLDER"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}


# ══════════════════════════════════════════════════════════════════════════════
# IAM
# ══════════════════════════════════════════════════════════════════════════════

# Execution role — ECS control plane (pull images, write logs, read secrets)
resource "aws_iam_role" "ecs_task_execution" {
  name = "${local.name}-ecs-task-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = { Name = "${local.name}-ecs-task-execution" }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "${local.name}-execution-secrets"
  role = aws_iam_role.ecs_task_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [aws_secretsmanager_secret.app.arn]
    }]
  })
}

# Task role — application code permissions at runtime
resource "aws_iam_role" "ecs_task" {
  name = "${local.name}-ecs-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = { Name = "${local.name}-ecs-task" }
}

resource "aws_iam_role_policy" "ecs_task" {
  name = "${local.name}-task-policy"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3 — audio recordings
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.audio.arn,
          "${aws_s3_bucket.audio.arn}/*",
        ]
      },
      # S3 — transcripts
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.transcripts.arn,
          "${aws_s3_bucket.transcripts.arn}/*",
        ]
      },
      # S3 — inbound emails (worker reads raw MIME; also writes attachment uploads)
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.inbound_emails.arn,
          "${aws_s3_bucket.inbound_emails.arn}/*",
        ]
      },
      # S3 — patient documents (NEA-123): pre-signed POST uploads + signed
      # GET downloads; HeadObject to confirm uploads; tagging to clear the
      # `status=pending` lifecycle marker.
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetObjectTagging",
          "s3:PutObjectTagging",
          "s3:DeleteObjectTagging",
        ]
        Resource = [
          aws_s3_bucket.documents.arn,
          "${aws_s3_bucket.documents.arn}/*",
        ]
      },
      # Secrets Manager
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.app.arn]
      },
      # SES — outbound email
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail", "ses:SendTemplatedEmail"]
        Resource = ["*"]
      },
      # SSM Messages — ECS Exec (SSH into tasks via Session Manager)
      {
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel",
        ]
        Resource = ["*"]
      },
    ]
  })
}

# ══════════════════════════════════════════════════════════════════════════════
# ECS CLUSTER
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}"
  retention_in_days = 365 # HIPAA: 1-year minimum for audit logs (NEA-103)
  tags              = { Name = "${local.name}-api-logs" }
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/${local.name}-worker"
  retention_in_days = 365 # HIPAA: 1-year minimum for audit logs (NEA-103)
  tags              = { Name = "${local.name}-worker-logs" }
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"
  tags = { Name = "${local.name}-cluster" }
}

# ── API Task Definition ────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_cpu
  memory                   = var.ecs_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "app"
    image = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
    portMappings = [{
      containerPort = 8000
      protocol      = "tcp"
    }]
    environment = concat([
      { name = "ENV", value = var.environment },
      { name = "DB_ENDPOINT", value = aws_rds_cluster.main.endpoint },
      { name = "DB_NAME", value = var.db_name },
      { name = "DB_USER", value = var.db_username },
      { name = "DB_PASSWORD", value = var.db_password },
      { name = "REDIS_URL", value = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379" },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "S3_AUDIO_BUCKET", value = aws_s3_bucket.audio.bucket },
      { name = "S3_TRANSCRIPTS_BUCKET", value = aws_s3_bucket.transcripts.bucket },
      { name = "S3_INBOUND_EMAIL_BUCKET", value = aws_s3_bucket.inbound_emails.bucket },
      { name = "S3_DOCUMENTS_BUCKET", value = aws_s3_bucket.documents.bucket },
      { name = "APP_SECRETS_ARN", value = aws_secretsmanager_secret.app.arn },
      { name = "SES_CONFIGURATION_SET", value = aws_ses_configuration_set.main.name },
      { name = "SES_FROM_EMAIL", value = "noreply@${var.domain}" },
      { name = "SES_REPLY_TO_EMAIL", value = "support@${var.domain}" },
      { name = "FRONTEND_ORIGIN", value = "https://app.${var.domain}" },
      { name = "SUCCESS_REDIRECT_URL", value = "https://app.${var.domain}" },
      { name = "API_BASE_URL", value = "https://api.${var.domain}" },
      { name = "BETTERSTACK_OTLP_INGESTING_HOST", value = var.betterstack_otlp_ingesting_host },
      { name = "BETTERSTACK_OTLP_SOURCE_TOKEN", value = var.betterstack_otlp_source_token },
    ], [for k, v in var.extra_env : { name = k, value = v }])
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${local.name}-api-task" }
}

# ── API ECS Service ────────────────────────────────────────────────────────────

resource "aws_ecs_service" "api" {
  name            = "${local.name}-api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  enable_execute_command = true # ECS Exec via Session Manager

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "app"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.https]
  tags       = { Name = "${local.name}-api-service" }
}

# ── API Auto Scaling ───────────────────────────────────────────────────────────

resource "aws_appautoscaling_target" "api" {
  max_capacity       = var.ecs_max_capacity
  min_capacity       = var.ecs_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "${local.name}-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

# ── Worker Task Definition ─────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "worker" {
  family                   = "${local.name}-worker-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.worker_cpu
  memory                   = var.worker_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name        = "worker"
    image       = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
    command     = ["./scripts/start-worker.sh"]
    stopTimeout = 60
    environment = concat([
      { name = "ENV", value = var.environment },
      { name = "DB_ENDPOINT", value = aws_rds_cluster.main.endpoint },
      { name = "DB_NAME", value = var.db_name },
      { name = "DB_USER", value = var.db_username },
      { name = "DB_PASSWORD", value = var.db_password },
      { name = "REDIS_URL", value = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379" },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "S3_AUDIO_BUCKET", value = aws_s3_bucket.audio.bucket },
      { name = "S3_TRANSCRIPTS_BUCKET", value = aws_s3_bucket.transcripts.bucket },
      { name = "S3_INBOUND_EMAIL_BUCKET", value = aws_s3_bucket.inbound_emails.bucket },
      { name = "S3_DOCUMENTS_BUCKET", value = aws_s3_bucket.documents.bucket },
      { name = "APP_SECRETS_ARN", value = aws_secretsmanager_secret.app.arn },
      { name = "SES_FROM_EMAIL", value = "noreply@${var.domain}" },
      { name = "SES_REPLY_TO_EMAIL", value = "support@${var.domain}" },
      { name = "BETTERSTACK_OTLP_INGESTING_HOST", value = var.betterstack_otlp_ingesting_host },
      { name = "BETTERSTACK_OTLP_SOURCE_TOKEN", value = var.betterstack_otlp_source_token },
    ], [for k, v in var.extra_env : { name = k, value = v }])
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.worker.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${local.name}-worker-task" }
}

# ── Worker ECS Service ─────────────────────────────────────────────────────────

resource "aws_ecs_service" "worker" {
  name            = "${local.name}-worker-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = var.worker_desired_count
  launch_type     = "FARGATE"

  enable_execute_command = true

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  tags = { Name = "${local.name}-worker-service" }
}

# ══════════════════════════════════════════════════════════════════════════════
# APPLICATION LOAD BALANCER
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_lb" "main" {
  name               = "${local.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production"

  tags = { Name = "${local.name}-alb" }
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name}-api-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  deregistration_delay = 30

  health_check {
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = { Name = "${local.name}-api-tg" }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.api.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# ACM CERTIFICATE + ROUTE53
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${local.name}-api-cert" }
}

resource "aws_route53_zone" "main" {
  name = var.domain
  tags = { Name = "${local.name}-zone" }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

# DNS records
# NOTE: Vercel values below are standard — verify in your Vercel project dashboard
# after connecting the domain (Project → Settings → Domains)

resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain
  type    = "A"
  ttl     = 300
  records = ["76.76.21.21"] # Vercel anycast IP — standard for all Vercel projects
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain}"
  type    = "CNAME"
  ttl     = 300
  records = ["cname.vercel-dns.com"] # Vercel CNAME — standard
}

resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.${var.domain}"
  type    = "CNAME"
  ttl     = 300
  records = ["cname.vercel-dns.com"] # Vercel CNAME — standard
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain}"
  type    = "A"
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
