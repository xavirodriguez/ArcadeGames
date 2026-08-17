import { StoryPackage, StoryGraph } from "./StoryTypes";
import { StoryGraphValidator } from "./StoryGraphValidator";

/**
 * Validation result descriptor produced by `StoryPackageValidator`.
 *
 * @public
 */
export interface StoryPackageValidationResult {
  /** True if zero critical structural or reference errors were discovered. */
  valid: boolean;
  /** List of critical semantic or structural validation errors. */
  errors: string[];
  /** List of non-critical semantic warnings. */
  warnings: string[];
}

/**
 * Package-level static linter performing structural and semantic reference checks across a `StoryPackage`.
 *
 * @remarks
 * Verifies manifest metadata, graph integrity via `StoryGraphValidator`, and cross-package
 * entity references (characters, evidence, deductions, variables, and flags).
 *
 * @public
 */
export class StoryPackageValidator {
  /**
   * Performs semantic cross-reference validation across a complete `StoryPackage`.
   *
   * @param pkg - The story package instance to validate.
   * @returns Package validation result containing validity status, errors, and warnings.
   */
  public static validate(pkg: StoryPackage): StoryPackageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!pkg) {
      return { valid: false, errors: ["StoryPackage is null or undefined."], warnings };
    }

    if (!pkg.manifest) {
      errors.push("StoryPackage is missing required 'manifest' metadata.");
      return { valid: false, errors, warnings };
    }

    const { id, title, contentVersion, schemaVersion, entryGraph } = pkg.manifest;

    if (!id) errors.push("Manifest missing package 'id'.");
    if (!title) warnings.push("Manifest missing human-readable 'title'.");
    if (!contentVersion) errors.push("Manifest missing 'contentVersion'.");
    if (typeof schemaVersion !== "number" || schemaVersion <= 0) {
      errors.push(`Manifest specifies invalid 'schemaVersion': ${schemaVersion}.`);
    }

    if (!pkg.graphs || Object.keys(pkg.graphs).length === 0) {
      errors.push("StoryPackage contains no graph definitions in 'graphs'.");
      return { valid: false, errors, warnings };
    }

    if (!entryGraph || !pkg.graphs[entryGraph]) {
      errors.push(`Manifest entryGraph '${entryGraph}' does not exist in package graphs.`);
    }

    const registeredCharacterIds = new Set<string>(
      pkg.characters ? Object.keys(pkg.characters) : []
    );
    const registeredEvidenceIds = new Set<string>(
      pkg.evidence ? Object.keys(pkg.evidence) : []
    );

    // Validate each graph semantically and structurally
    for (const [graphId, graph] of Object.entries(pkg.graphs)) {
      if (graph.id !== graphId) {
        warnings.push(`Graph key '${graphId}' does not match graph internal ID '${graph.id}'.`);
      }

      // Add graph local characters to registered set
      if (graph.characters) {
        for (const charId of Object.keys(graph.characters)) {
          registeredCharacterIds.add(charId);
        }
      }

      const graphResult = StoryGraphValidator.validate(graph);
      for (const err of graphResult.errors) {
        errors.push(`[Graph '${graphId}'] ${err.message}`);
      }
      for (const warn of graphResult.warnings) {
        warnings.push(`[Graph '${graphId}'] ${warn.message}`);
      }

      // Semantic reference checks for dialogue characters and evidence effects/conditions
      for (const node of Object.values(graph.nodes)) {
        if (node.dialogue?.lines) {
          for (const line of node.dialogue.lines) {
            if (line.characterId && registeredCharacterIds.size > 0 && !registeredCharacterIds.has(line.characterId)) {
              warnings.push(
                `Node '${node.id}' in graph '${graphId}' references unregistered characterId '${line.characterId}'.`
              );
            }
          }
        }

        const inspectEvidenceRef = (evidenceId: string, context: string) => {
          if (registeredEvidenceIds.size > 0 && !registeredEvidenceIds.has(evidenceId)) {
            warnings.push(
              `Node '${node.id}' in graph '${graphId}' ${context} references unregistered evidenceId '${evidenceId}'.`
            );
          }
        };

        if (node.effects) {
          for (const eff of node.effects) {
            if (eff.type === "discoverEvidence") {
              inspectEvidenceRef(eff.evidenceId, "effect");
            }
          }
        }

        if (node.choices) {
          for (const choice of node.choices) {
            if (choice.effects) {
              for (const eff of choice.effects) {
                if (eff.type === "discoverEvidence") {
                  inspectEvidenceRef(eff.evidenceId, "choice effect");
                }
              }
            }
            if (choice.condition?.type === "evidence" && choice.condition.key) {
              inspectEvidenceRef(choice.condition.key, "choice condition");
            }
          }
        }
      }
    }

    // Validate Deduction rules cross-references
    if (pkg.deductions) {
      for (const [ruleId, rule] of Object.entries(pkg.deductions)) {
        if (!rule.requires || rule.requires.length === 0) {
          errors.push(`Deduction rule '${ruleId}' defines no required evidence in 'requires'.`);
        } else if (registeredEvidenceIds.size > 0) {
          for (const reqEv of rule.requires) {
            if (!registeredEvidenceIds.has(reqEv)) {
              errors.push(
                `Deduction rule '${ruleId}' requires unregistered evidenceId '${reqEv}'.`
              );
            }
          }
        }

        if (
          registeredEvidenceIds.size > 0 &&
          rule.resultEvidenceId &&
          !registeredEvidenceIds.has(rule.resultEvidenceId)
        ) {
          warnings.push(
            `Deduction rule '${ruleId}' produces resultEvidenceId '${rule.resultEvidenceId}' not listed in package evidence registry.`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
