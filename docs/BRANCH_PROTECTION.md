# Branch protection policy

## Current repository state

The GitHub branch metadata for `master` currently reports branch protection as disabled and no required status checks. The repository workflows can report failures, but GitHub does not currently use those results to block a merge.

This document defines the intended policy. Enabling it requires repository administration permissions and must be completed in GitHub Settings; a repository commit cannot activate the hosted branch rule.

## Required rules for `master`

Create a branch ruleset targeting the exact branch `master` with these settings:

- Require a pull request before merging.
- Require the branch to be up to date before merging.
- Require these status checks:
  - `Continuous Integration` — workflow `CI`.
  - `Build API Reference` — workflow `Documentation CI`.
  - `Playwright E2E` — workflow `E2E`.
- Block force pushes.
- Block branch deletion.
- Do not allow bypass by default.

Choose the matching checks from GitHub's status-check selector after at least one run has reported them. GitHub may display workflow and job names together; use the exact contexts offered by the selector rather than typing a guessed value.

For a solo-maintained repository, requiring an additional approving review is optional. For a team repository, require at least one approval and dismiss stale approvals after new commits.

## Why ECS Core Sentinel is not a global required check

`ECS Core Sentinel` is triggered only for selected paths, scheduled runs and manual dispatch. Making it globally required can leave unrelated pull requests without a corresponding check. Keep its result visible, but do not make it a repository-wide required status check until its trigger strategy guarantees a result for every pull request to `master`.

## Other branches

The same `Continuous Integration` and `Playwright E2E` checks can protect `develop`. `Documentation CI` currently targets pull requests to `main` and `master`, so it must be added to the workflow's branch filters before requiring it for `develop`.

## Merge policy

A green status is necessary, not sufficient. Reviewers must still inspect the changed API contracts, deterministic behavior, tests, generated assets and baseline diffs. A baseline update must explain the measured before/after result and must not merely silence a failing check.
