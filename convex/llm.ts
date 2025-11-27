"use node";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { action } from "./_generated/server";
import { v } from "convex/values";
import * as z from "zod";
import type { Schema as GeminiSchema } from "@google/generative-ai";
import { internal } from "./_generated/api";

const MODEL = "gemini-2.0-flash-lite";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // This error is only thrown in internal actions, so it's safe to be descriptive
    // It won't be exposed to clients, only logged server-side
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. " +
      "Please set it in your Convex dashboard under Settings > Environment Variables."
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Convert JSON Schema (from Zod) to Gemini's Schema format.
 * Gemini uses OpenAPI 3.0-style schemas with a `type` field using SchemaType enum.
 */
function jsonSchemaToGemini(jsonSchema: Record<string, unknown>): GeminiSchema {
  const type = jsonSchema.type as string;

  const base: Record<string, unknown> = {};
  if (jsonSchema.description) {
    base.description = jsonSchema.description;
  }
  if (jsonSchema.nullable) {
    base.nullable = true;
  }

  switch (type) {
    case "string": {
      if (jsonSchema.enum) {
        return {
          ...base,
          type: SchemaType.STRING,
          format: "enum",
          enum: jsonSchema.enum as string[],
        } as GeminiSchema;
      }
      return { ...base, type: SchemaType.STRING };
    }
    case "number":
      return { ...base, type: SchemaType.NUMBER };
    case "integer":
      return { ...base, type: SchemaType.INTEGER };
    case "boolean":
      return { ...base, type: SchemaType.BOOLEAN };
    case "array": {
      const items = jsonSchema.items as Record<string, unknown>;
      return {
        ...base,
        type: SchemaType.ARRAY,
        items: jsonSchemaToGemini(items),
      };
    }
    case "object": {
      const properties = jsonSchema.properties as Record<
        string,
        Record<string, unknown>
      >;
      const required = jsonSchema.required as string[] | undefined;

      const geminiProperties: Record<string, GeminiSchema> = {};
      for (const [key, value] of Object.entries(properties)) {
        geminiProperties[key] = jsonSchemaToGemini(value);
      }

      return {
        ...base,
        type: SchemaType.OBJECT,
        properties: geminiProperties,
        required,
      };
    }
    default:
      throw new Error(`Unsupported JSON Schema type: ${type}`);
  }
}

/**
 * Complete a prompt with Gemini, returning a typed response based on the provided Zod schema.
 * This is a low-level function - prefer using the action wrappers that include rate limiting.
 */
export async function completeWithGemini<T extends z.ZodType>(
  prompt: string,
  schema: T
): Promise<z.infer<T>> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: jsonSchemaToGemini(
        z.toJSONSchema(schema) as Record<string, unknown>
      ),
    },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  const parsed = JSON.parse(text) as unknown;
  return schema.parse(parsed);
}

// Schema for AI recommendations response
const recommendationsResponseSchema = z.object({
  recommendations: z.array(
    z.object({
      userId: z.string().describe("The _id of the recommended user"),
      score: z
        .number()
        .describe("Match score from 0-100, higher is better match"),
      reason: z
        .string()
        .describe(
          "Brief explanation of why this person is a good match (1-2 sentences)"
        ),
    })
  ),
});

export type RecommendationsResponse = z.infer<
  typeof recommendationsResponseSchema
>;

export const getAIRecommendations = action({
  args: {
    currentUserProfile: v.object({
      name: v.string(),
      bio: v.optional(v.string()),
      role: v.optional(v.string()),
      company: v.optional(v.string()),
      interests: v.optional(v.array(v.string())),
      canHelpWith: v.optional(v.string()),
      needsHelpWith: v.optional(v.string()),
    }),
    candidateUsers: v.array(
      v.object({
        _id: v.string(),
        name: v.string(),
        bio: v.optional(v.string()),
        role: v.optional(v.string()),
        company: v.optional(v.string()),
        interests: v.optional(v.array(v.string())),
        canHelpWith: v.optional(v.string()),
        needsHelpWith: v.optional(v.string()),
      })
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RecommendationsResponse> => {
    // Check rate limit
    const rateCheck = await ctx.runQuery(internal.llmRateLimit.checkRateLimit);
    if (!rateCheck.allowed) {
      console.warn("Rate limit exceeded:", rateCheck.reason);
      // Return empty recommendations instead of throwing
      return { recommendations: [] };
    }

    // Increment usage before making the request
    await ctx.runMutation(internal.llmRateLimit.incrementUsage);

    const limit = args.limit ?? 5;

    // Build the prompt
    const prompt = `You are a conference networking assistant. Your job is to recommend the best people for someone to meet based on mutual benefit.

## Current User Profile
Name: ${args.currentUserProfile.name}
${args.currentUserProfile.role ? `Role: ${args.currentUserProfile.role}` : ""}
${args.currentUserProfile.company ? `Company: ${args.currentUserProfile.company}` : ""}
${args.currentUserProfile.bio ? `Bio: ${args.currentUserProfile.bio}` : ""}
${args.currentUserProfile.interests?.length ? `Interests: ${args.currentUserProfile.interests.join(", ")}` : ""}
${args.currentUserProfile.canHelpWith ? `Can help others with: ${args.currentUserProfile.canHelpWith}` : ""}
${args.currentUserProfile.needsHelpWith ? `Looking for help with: ${args.currentUserProfile.needsHelpWith}` : ""}

## Candidate Users to Consider
${args.candidateUsers
  .map(
    (u, i) => `
### Candidate ${i + 1} (ID: ${u._id})
Name: ${u.name}
${u.role ? `Role: ${u.role}` : ""}
${u.company ? `Company: ${u.company}` : ""}
${u.bio ? `Bio: ${u.bio}` : ""}
${u.interests?.length ? `Interests: ${u.interests.join(", ")}` : ""}
${u.canHelpWith ? `Can help others with: ${u.canHelpWith}` : ""}
${u.needsHelpWith ? `Looking for help with: ${u.needsHelpWith}` : ""}
`
  )
  .join("\n")}

## Instructions
Analyze the current user's profile and find the ${limit} best matches from the candidates.
Prioritize matches where:
1. The candidate can help with what the current user needs (needsHelpWith ↔ canHelpWith)
2. The current user can help with what the candidate needs (canHelpWith ↔ needsHelpWith)
3. They share common interests or complementary expertise
4. There's potential for meaningful professional connection

Return the top ${limit} recommendations with scores and brief, specific reasons.
If there are fewer good matches, return fewer recommendations.
Only recommend people who would genuinely benefit from meeting.`;

    const response = await completeWithGemini(
      prompt,
      recommendationsResponseSchema
    );
    return response;
  },
});
