terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
  }
}

# Landing page — sloopquest.app (Next.js)
resource "vercel_project" "landing" {
  name           = "${var.project_name}-landing"
  framework      = "nextjs"
  root_directory = "landing"
  ignore_command = "git diff HEAD^ HEAD --quiet"

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.production_branch
  }

  team_id = var.vercel_team_id != "" ? var.vercel_team_id : null
}

resource "vercel_project_domain" "landing_root" {
  project_id = vercel_project.landing.id
  domain     = var.domain
  team_id    = var.vercel_team_id != "" ? var.vercel_team_id : null
}

resource "vercel_project_domain" "landing_www" {
  project_id = vercel_project.landing.id
  domain     = "www.${var.domain}"
  team_id    = var.vercel_team_id != "" ? var.vercel_team_id : null
}

resource "vercel_project_environment_variable" "landing_api_url" {
  project_id = vercel_project.landing.id
  team_id    = var.vercel_team_id != "" ? var.vercel_team_id : null
  key        = "NEXT_PUBLIC_API_URL"
  value      = "https://api.${var.domain}"
  target     = ["production", "preview", "development"]
}

# Web app — app.sloopquest.app (Vite)
resource "vercel_project" "web" {
  name           = "${var.project_name}-web"
  framework      = "vite"
  root_directory = "web"
  ignore_command = "git diff HEAD^ HEAD --quiet"

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.production_branch
  }

  team_id = var.vercel_team_id != "" ? var.vercel_team_id : null
}

resource "vercel_project_domain" "web_app" {
  project_id = vercel_project.web.id
  domain     = "app.${var.domain}"
  team_id    = var.vercel_team_id != "" ? var.vercel_team_id : null
}

resource "vercel_project_environment_variable" "web_api_url" {
  project_id = vercel_project.web.id
  team_id    = var.vercel_team_id != "" ? var.vercel_team_id : null
  key        = "VITE_API_URL"
  value      = "https://api.${var.domain}"
  target     = ["production", "preview", "development"]
}
