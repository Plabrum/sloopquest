output "landing_project_id" {
  description = "Vercel project ID for the landing page"
  value       = vercel_project.landing.id
}

output "web_project_id" {
  description = "Vercel project ID for the web app"
  value       = vercel_project.web.id
}
