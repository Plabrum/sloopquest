terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.50, != 6.14.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
    logtail = {
      source  = "BetterStackHQ/logtail"
      version = "~> 0.8"
    }
  }

  # Backend config is passed via -backend-config flags in CI (terraform.yml).
  # Bucket name is derived at runtime: tf-state-<aws-account-id>
  # Run locally: scripts/tf-init.sh (or pass flags manually)
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "sloopquest"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id != "" ? var.vercel_team_id : null
}

provider "logtail" {
  api_token = var.logtail_api_token
}

resource "logtail_source" "api" {
  name     = "${var.project_name}-${var.environment}"
  platform = "open_telemetry"
}

# ── Infrastructure module ──────────────────────────────────────────────────────

module "infrastructure" {
  source = "./aws"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region
  domain       = var.domain

  vpc_cidr             = var.vpc_cidr
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs

  ecr_repository = var.ecr_repository
  image_tag      = var.image_tag

  db_name               = var.db_name
  db_username           = var.db_username
  db_password           = var.db_password
  db_min_acu            = var.db_min_acu
  db_max_acu            = var.db_max_acu
  db_auto_pause_seconds = var.db_auto_pause_seconds

  redis_node_type = var.redis_node_type

  ecs_cpu              = var.ecs_cpu
  ecs_memory           = var.ecs_memory
  ecs_desired_count    = var.ecs_desired_count
  ecs_min_capacity     = var.ecs_min_capacity
  ecs_max_capacity     = var.ecs_max_capacity
  worker_cpu           = var.worker_cpu
  worker_memory        = var.worker_memory
  worker_desired_count = var.worker_desired_count

  extra_env = var.extra_env

  betterstack_otlp_ingesting_host = logtail_source.api.ingesting_host
  betterstack_otlp_source_token   = logtail_source.api.token
}

# ── Vercel module ──────────────────────────────────────────────────────────────

module "vercel" {
  source = "./vercel"

  project_name      = var.project_name
  domain            = var.domain
  github_repo       = var.github_repo
  production_branch = var.production_branch
  vercel_team_id    = var.vercel_team_id
}

# ── Outputs ────────────────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "ALB DNS name (use this to verify the load balancer is up)"
  value       = module.infrastructure.alb_dns_name
}

output "api_url" {
  description = "API base URL"
  value       = "https://api.${var.domain}"
}

output "ecr_repository_url" {
  description = "ECR repository URL — used in CI to push Docker images"
  value       = module.infrastructure.ecr_repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.infrastructure.ecs_cluster_name
}

output "ecs_service_name" {
  description = "ECS API service name"
  value       = module.infrastructure.ecs_service_name
}

output "worker_service_name" {
  description = "ECS worker service name"
  value       = module.infrastructure.worker_service_name
}

output "database_endpoint" {
  description = "Aurora write endpoint"
  value       = module.infrastructure.database_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.infrastructure.redis_endpoint
  sensitive   = true
}

output "s3_audio_bucket" {
  description = "S3 bucket for call recordings"
  value       = module.infrastructure.s3_audio_bucket
}

output "s3_transcripts_bucket" {
  description = "S3 bucket for STT transcripts"
  value       = module.infrastructure.s3_transcripts_bucket
}

output "app_secrets_arn" {
  description = "Secrets Manager ARN — set APP_SECRETS_ARN in ECS task"
  value       = module.infrastructure.app_secrets_arn
  sensitive   = true
}

output "route53_nameservers" {
  description = "Nameservers to configure at your domain registrar"
  value       = module.infrastructure.route53_nameservers
}

output "vercel_landing_project_id" {
  description = "Vercel project ID for the landing page"
  value       = module.vercel.landing_project_id
}

output "vercel_web_project_id" {
  description = "Vercel project ID for the web app"
  value       = module.vercel.web_project_id
}
