variable "project_name" {
  description = "Project name prefix for Vercel project names"
  type        = string
  default     = "sloopquest"
}

variable "domain" {
  description = "Root domain (e.g. sloopquest.app)"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository in owner/repo format (e.g. Plabrum/sloopquest)"
  type        = string
}

variable "production_branch" {
  description = "Git branch to deploy to production"
  type        = string
  default     = "main"
}

variable "vercel_team_id" {
  description = "Vercel team ID — leave blank for personal accounts"
  type        = string
  default     = ""
}
