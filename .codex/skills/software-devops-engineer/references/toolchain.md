# Toolchain Reference

## Source Control

Git:
- Inspect first: `git status --short`, `git branch --show-current`, `git diff`.
- Keep commits focused and reversible.
- Avoid rewriting history unless the user explicitly requests it.

GitHub:
- Use for issues, pull requests, reviews, releases, GitHub Actions, repository settings, secrets, and branch protection.
- Prefer draft PRs for unfinished work.
- Check failing CI before changing code when the request mentions broken builds.

GitLab:
- Use for merge requests, GitLab CI, environments, protected branches, package/container registry, and approvals.
- Preserve `.gitlab-ci.yml` conventions already present in the repo.

## Learning And Enablement

Alura:
- Use as a study-planning and knowledge-organization source.
- Map courses or learning tracks to practical project tasks.
- Do not claim course availability without checking current Alura content when the user asks for a specific current course.

## CI/CD

Jenkins:
- Look for `Jenkinsfile`, shared libraries, job parameters, credentials IDs, and environment promotion stages.
- Validate pipeline syntax when possible before suggesting job changes.
- Separate build, test, scan, package, deploy, smoke test, and rollback stages.

CircleCI:
- Look for `.circleci/config.yml`.
- Validate workflow dependencies, contexts, orbs, caches, workspaces, and artifacts.
- Keep secrets in CircleCI contexts or project environment variables.

GitHub/GitLab CI:
- Keep CI minimal, deterministic, and aligned with repository scripts.
- Avoid requiring unavailable local services in baseline CI unless service containers are configured.

## Infrastructure And Configuration

Terraform:
- Look for `*.tf`, modules, backend configuration, workspaces, variables, and state references.
- Use `terraform fmt`, `terraform validate`, and `terraform plan` before any apply.
- Treat state, backend, provider credentials, and secret outputs as sensitive.

HashiCorp:
- Terraform is the default HashiCorp tool for IaC.
- Vault manages secrets; never print secret values.
- Consul manages service discovery/configuration when present.
- Packer builds machine images when present.

Ansible:
- Look for inventories, playbooks, roles, group vars, host vars, and vault files.
- Prefer idempotent tasks and handlers.
- Use check mode where possible before applying changes.

## Kubernetes

Kubernetes:
- Look for `k8s/`, `manifests/`, `helm/`, `charts/`, `kustomization.yaml`, deployments, services, ingress, configmaps, secrets, probes, resources, and HPA.
- Prefer namespace-scoped read-only checks first.
- Validate manifests before apply.
- Require approval before `kubectl apply`, `delete`, `scale`, `rollout restart`, or production context changes.
- Include rollback command such as `kubectl rollout undo deployment/<name> -n <namespace>` when changing workloads.

## Quality

SonarQube:
- Look for `sonar-project.properties`, scanner config, CI quality gate steps, coverage reports, exclusions, and project keys.
- Treat quality gate failures as release blockers unless the user says otherwise.
- Prefer fixing root causes over suppressing rules.

## Observability

Prometheus:
- Use for metrics, alert rules, service discovery, scrape configs, recording rules, and SLO signals.
- Validate alert expressions and include expected labels.

Grafana:
- Use for dashboards, panels, alerting views, and operational summaries.
- Tie dashboards to Prometheus metrics or logs/traces sources already present.

ELK Stack:
- Use Elasticsearch, Logstash, and Kibana for log ingestion, parsing, search, and dashboards.
- Protect PII, credentials, tokens, and customer data in logs.
- Prefer structured logs with correlation IDs.

## End-To-End Pipeline Pattern

For a complete delivery setup:

1. Git branch and pull/merge request workflow.
2. CI build, test, lint, and artifact creation.
3. SonarQube scan and quality gate.
4. Terraform plan for infrastructure.
5. Ansible configuration when servers are involved.
6. Kubernetes deployment with health probes and rollout checks.
7. Prometheus metrics and alert rules.
8. Grafana dashboard for service health.
9. ELK/Kibana log search for runtime investigation.
10. Release notes, rollback plan, and post-deploy verification.

