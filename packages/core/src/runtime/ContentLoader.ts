import { z } from "zod";

/**
 * Custom content loading error wrapping Zod validation errors with clear, exact paths.
 * @public
 */
export class ContentValidationError extends Error {
  public readonly issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = "ContentValidationError";
    this.issues = issues;
  }
}

/**
 * Utility class for parsing and validating external JSON game content against Zod schemas.
 * @public
 */
export class ContentLoader {
  /**
   * Parses raw JSON or object data using a Zod schema.
   * Reports human-readable errors with exact property paths on validation failure.
   */
  public static load<T>(schema: z.ZodSchema<T>, data: unknown, contentId?: string): T {
    const result = schema.safeParse(data);

    if (!result.success) {
      const issues = result.error.issues;
      const formattedErrors = issues
        .map((issue) => {
          const pathStr = issue.path.length > 0 ? issue.path.join(".") : "root";
          return `${pathStr}: ${issue.message}`;
        })
        .join("; ");

      const prefix = contentId ? `Content validation error for '${contentId}'` : "Content validation error";
      throw new ContentValidationError(`${prefix}: ${formattedErrors}`, issues);
    }

    return result.data;
  }
}
