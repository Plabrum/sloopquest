# ══════════════════════════════════════════════════════════════════════════════
# ELASTICACHE REDIS
# Used for: SAQ background queue + Litestar server-side sessions
#
# HIPAA: encryption at rest + in transit enabled (NEA-100)
# NOTE: aws_elasticache_replication_group is required for encryption support.
#       aws_elasticache_cluster does not support encryption arguments.
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_security_group" "redis" {
  name        = "${local.name}-redis-sg"
  description = "ElastiCache Redis - allow port 6379 from ECS tasks only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = { Name = "${local.name}-redis-sg" }
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.name}-redis-subnet-group" }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.name}-redis-enc"
  description          = "Sloopquest Redis - sessions and background queue (encrypted)"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_clusters   = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  # HIPAA: encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  # Maintenance during low-traffic window
  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_retention_limit = var.environment == "production" ? 1 : 0

  tags = { Name = "${local.name}-redis" }
}
