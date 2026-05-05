variable "project_name" { type = string }
variable "environment" { type = string }
variable "aws_region" { type = string }
variable "domain" { type = string }

variable "vpc_cidr" { type = string }
variable "private_subnet_cidrs" { type = list(string) }
variable "public_subnet_cidrs" { type = list(string) }

variable "ecr_repository" { type = string }
variable "image_tag" { type = string }

variable "db_name" { type = string }
variable "db_username" { type = string }
variable "db_password" { type = string }
variable "db_min_acu" { type = number }
variable "db_max_acu" { type = number }
variable "db_auto_pause_seconds" { type = number }

variable "redis_node_type" { type = string }

variable "ecs_cpu" { type = number }
variable "ecs_memory" { type = number }
variable "ecs_desired_count" { type = number }
variable "ecs_min_capacity" { type = number }
variable "ecs_max_capacity" { type = number }
variable "worker_cpu" { type = number }
variable "worker_memory" { type = number }
variable "worker_desired_count" { type = number }

variable "extra_env" { type = map(string) }

variable "betterstack_otlp_ingesting_host" { type = string }
variable "betterstack_otlp_source_token" {
  type      = string
  sensitive = true
}
