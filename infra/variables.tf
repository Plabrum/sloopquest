variable "project_name" {
  description = "Project name — used as a prefix for all resource names"
  type        = string
  default     = "sloopquest"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Must be staging or production."
  }
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "domain" {
  description = "Root domain. Used for ACM cert, Route53 zone, CORS, SES."
  type        = string
  default     = "sloopquest.app"
}

# ── Networking ─────────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.10.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs (database only)"
  type        = list(string)
  default     = ["10.10.1.0/24", "10.10.2.0/24"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs (ALB + ECS tasks)"
  type        = list(string)
  default     = ["10.10.100.0/24", "10.10.101.0/24"]
}

# ── ECR / image ────────────────────────────────────────────────────────────────

variable "ecr_repository" {
  description = "ECR repository name"
  type        = string
  default     = "sloopquest-api"
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# ── Database (Aurora Serverless v2) ────────────────────────────────────────────

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "sloopquest"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "PostgreSQL master password — rotate via Secrets Manager after first deploy"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "db_min_acu" {
  description = "Aurora Serverless v2 minimum capacity (0 = auto-pause when idle)"
  type        = number
  default     = 0
}

variable "db_max_acu" {
  description = "Aurora Serverless v2 maximum capacity"
  type        = number
  default     = 4.0
}

variable "db_auto_pause_seconds" {
  description = "Seconds of inactivity before Aurora pauses (minimum 300)"
  type        = number
  default     = 300
}

# ── Redis ──────────────────────────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}

# ── ECS — API ──────────────────────────────────────────────────────────────────

variable "ecs_cpu" {
  description = "API task CPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "ecs_memory" {
  description = "API task memory in MB"
  type        = number
  default     = 512
}

variable "ecs_desired_count" {
  description = "Number of running API task replicas"
  type        = number
  default     = 1
}

variable "ecs_min_capacity" {
  description = "Auto-scaling minimum API tasks"
  type        = number
  default     = 1
}

variable "ecs_max_capacity" {
  description = "Auto-scaling maximum API tasks"
  type        = number
  default     = 4
}

# ── ECS — Worker ───────────────────────────────────────────────────────────────

variable "worker_cpu" {
  description = "Worker task CPU units"
  type        = number
  default     = 256
}

variable "worker_memory" {
  description = "Worker task memory in MB"
  type        = number
  default     = 512
}

variable "worker_desired_count" {
  description = "Number of running worker task replicas"
  type        = number
  default     = 1
}

# ── Vercel ─────────────────────────────────────────────────────────────────────

variable "vercel_api_token" {
  description = "Vercel API token — generate at vercel.com/account/tokens"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team ID — leave blank for personal accounts"
  type        = string
  default     = ""
}

variable "github_repo" {
  description = "GitHub repository in owner/repo format"
  type        = string
  default     = "Plabrum/sloopquest"
}

variable "production_branch" {
  description = "Git branch to deploy to production"
  type        = string
  default     = "main"
}

# ── BetterStack ────────────────────────────────────────────────────────────────

variable "logtail_api_token" {
  description = "BetterStack personal API token — from account settings, used by the logtail Terraform provider"
  type        = string
  sensitive   = true
}

# ── Misc ───────────────────────────────────────────────────────────────────────

variable "extra_env" {
  description = "Additional environment variables injected into ECS task definitions"
  type        = map(string)
  default     = {}
}
