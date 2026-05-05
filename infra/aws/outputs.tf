output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for pushing Docker images"
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS API service name"
  value       = aws_ecs_service.api.name
}

output "worker_service_name" {
  description = "ECS worker service name"
  value       = aws_ecs_service.worker.name
}

output "database_endpoint" {
  description = "Aurora cluster write endpoint"
  value       = aws_rds_cluster.main.endpoint
  sensitive   = true
}

output "database_reader_endpoint" {
  description = "Aurora cluster reader endpoint"
  value       = aws_rds_cluster.main.reader_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "s3_audio_bucket" {
  description = "S3 bucket name for call recordings"
  value       = aws_s3_bucket.audio.bucket
}

output "s3_transcripts_bucket" {
  description = "S3 bucket name for STT transcripts"
  value       = aws_s3_bucket.transcripts.bucket
}

output "s3_documents_bucket" {
  description = "S3 bucket name for patient documents (NEA-123)"
  value       = aws_s3_bucket.documents.bucket
}

output "app_secrets_arn" {
  description = "Secrets Manager ARN — set APP_SECRETS_ARN in ECS task"
  value       = aws_secretsmanager_secret.app.arn
  sensitive   = true
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "route53_nameservers" {
  description = "Nameservers to set at your domain registrar"
  value       = aws_route53_zone.main.name_servers
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "ses_configuration_set" {
  description = "SES configuration set name"
  value       = aws_ses_configuration_set.main.name
}
