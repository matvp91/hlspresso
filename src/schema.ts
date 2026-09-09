import { z } from "@hono/zod-openapi";
import { DateTime } from "luxon";
import rison from "rison";

const httpUrlSchema = z.url({
  error: "Must be a valid HTTP or HTTPS URL.",
  protocol: /^https?$/,
});

const filterRangeSchema = z
  .string()
  .regex(
    /^(?:\d+-\d+|[<>]=?\s*\d+)$/,
    'Must be a range such as "720-1080" or a comparison such as ">= 720".',
  );

const dateTimeSchema = z.codec(
  z.string(),
  z.custom<DateTime>((val) => DateTime.isDateTime(val) && val.isValid),
  {
    decode: (value, ctx) => {
      const dateTime = DateTime.fromISO(value);
      if (!dateTime.isValid) {
        ctx.issues.push({
          code: "invalid_format",
          format: "datetime",
          input: value,
          message: "Must be a valid ISO 8601 date and time.",
        });
        return z.NEVER;
      }
      return dateTime;
    },
    encode: (dateTime) => {
      const value = dateTime.toISO();
      if (value === null) {
        throw new Error("Invalid DateTime");
      }
      return value;
    },
  },
);

const base64StringSchema = z.codec(z.string(), z.string(), {
  decode: (value) => Buffer.from(value, "base64url").toString("utf-8"),
  encode: (value) => Buffer.from(value).toString("base64url"),
});

const risonCodec = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return rison.decode(jsonString);
      } catch (err) {
        ctx.issues.push({
          code: "invalid_format",
          format: "rison",
          input: jsonString,
          message: err instanceof Error ? err.message : String(err),
        });
        return z.NEVER;
      }
    },
    encode: (value) => rison.encode(value),
  });

const jsonCodec = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString);
      } catch (err) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: jsonString,
          message: err instanceof Error ? err.message : String(err),
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });

export const filterSchema = z
  .object({
    height: filterRangeSchema.optional().openapi({
      description: "Filter rendition height.",
      examples: [">= 720", "< 1080"],
    }),
    width: filterRangeSchema.optional().openapi({
      description: "Filter rendition width.",
      examples: [">= 1920", "< 480"],
    }),
    unstable_disableForcedText: z.boolean().optional().openapi({
      description:
        "Removes DEFAULT,AUTOSELECT attributes from all text tracks.",
    }),
  })
  .openapi("Filter");

const vastConfigSchema = z.strictObject({
  url: httpUrlSchema,
});

const vmapConfigSchema = z.strictObject({
  url: httpUrlSchema,
});

export const createSessionParamsSchema = z.strictObject({
  url: httpUrlSchema.openapi({
    description: "The HLS main playlist source.",
    examples: ["https://foo.bar/main.m3u8"],
  }),
  filter: filterSchema.optional(),
  interstitials: z
    .array(
      z.strictObject({
        time: z.number().finite().nonnegative().openapi({
          description: "Relative to the media time",
        }),
        duration: z.number().finite().positive().optional().openapi({
          description:
            "For ad replacement purposes, the interstitial will be treated as a range instead of a point when provided.",
        }),
        assets: z
          .array(
            z.discriminatedUnion("type", [
              z
                .strictObject({
                  type: z.literal("STATIC"),
                  url: httpUrlSchema,
                })
                .openapi({
                  description:
                    "A static URL asset, must point to an HLS main playlist source.",
                }),
              vastConfigSchema
                .extend({
                  type: z.literal("VAST"),
                })
                .openapi({
                  description:
                    "A VAST url, will be resolved when the asset list is requested.",
                }),
            ]),
          )
          .optional()
          .openapi({
            description: "A set of assets for each interstitial.",
          }),
      }),
    )
    .optional()
    .openapi({
      description: "Manual interstitial insertion.",
    }),
  params: z.record(z.string(), z.string()).optional().openapi({
    description:
      "Custom key value pairs, to be used in URL resolving such as VAST or VMAP.",
  }),
  vmap: vmapConfigSchema.optional().openapi({
    description: "Add interstitials based on the ads defined in the VMAP.",
  }),
  vast: vastConfigSchema.optional().openapi({
    description:
      "Generic VAST configuration, typically used for live where ad signaling is used to replace linear breaks.",
  }),
  expiry: z
    .union([z.int().positive(), z.literal(false)])
    .default(60 * 60 * 48)
    .openapi({
      description: "Amount of seconds until the session is discarded.",
    }),
  group: z.string().min(1).optional().openapi({
    description:
      "Prepend the session id with a group, mainly for logging or debugging purposes.",
  }),
});

export const assetListResponseSchema = z.object({
  ASSETS: z.array(
    z.object({
      URI: z.string(),
      DURATION: z.number(),
      "X-AD-CREATIVE-SIGNALING": z.unknown().optional(),
    }),
  ),
  "X-AD-CREATIVE-SIGNALING": z.unknown().optional(),
});

export const assetListPayloadSchema = risonCodec(
  z.object({
    dateTime: dateTimeSchema,
  }),
);

export const mediaPayloadSchema = risonCodec(
  z.object({
    type: z.enum(["VIDEO", "AUDIO", "SUBTITLES"]),
    path: base64StringSchema,
  }),
);

export const assetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("STATIC"),
    url: z.string(),
    duration: z.number(),
  }),
  z.object({
    type: z.literal("VAST"),
    url: z.string(),
  }),
  z.object({
    type: z.literal("VASTDATA"),
    data: z.string(),
  }),
]);

export const interstitialSchema = z.object({
  dateTime: dateTimeSchema,
  duration: z.number().optional(),
  assets: z.array(assetSchema),
});

export const sessionSchema = jsonCodec(
  z.object({
    id: z.string(),
    startTime: dateTimeSchema,
    expiry: z.number(),
    url: z.string(),
    interstitials: z.array(interstitialSchema),
    params: z.record(z.string(), z.string()).optional(),
    vmap: vmapConfigSchema.optional(),
    vast: vastConfigSchema.optional(),
    filter: filterSchema.optional(),
  }),
);

export const defaultUrlParamsSchema = z.enum(["random"]).openapi("URLParams");
