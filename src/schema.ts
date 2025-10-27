import { z } from "@hono/zod-openapi";
import { DateTime } from "luxon";
import rison from "rison";

const dateTimeSchema = z.codec(
  z.string(),
  z.custom<DateTime>((val) => DateTime.isDateTime(val) && val.isValid),
  {
    decode: (value) => {
      const dateTime = DateTime.fromISO(value);
      if (!dateTime.isValid) {
        throw new Error(`Invalid ISO string ${value}`);
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
          message: err.message,
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
          message: err.message,
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });

export const filterSchema = z.object({
  height: z.string().optional(),
  width: z.string().optional(),
  unstable_disableForcedText: z.boolean().optional(),
});

export const createSessionParamsSchema = z.strictObject({
  url: z.string().openapi({
    description: "The HLS main playlist source.",
    examples: ["https://foo.bar/main.m3u8"],
  }),
  filter: filterSchema.optional(),
  interstitials: z
    .array(
      z.strictObject({
        time: z.number().openapi({
          description: "Relative to the media time",
        }),
        duration: z.number().optional().openapi({
          description:
            "For ad replacement purposes, the interstitial will be treated as a range instead of a point when provided.",
        }),
        assets: z
          .array(
            z.discriminatedUnion("type", [
              z
                .strictObject({
                  type: z.literal("STATIC"),
                  url: z.string(),
                })
                .openapi({
                  description:
                    "A static URL asset, must point to an HLS main playlist source.",
                }),
              z
                .strictObject({
                  type: z.literal("VAST"),
                  url: z.string(),
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
  vmap: z
    .strictObject({
      url: z.string(),
    })
    .optional()
    .openapi({
      description: "Add interstitials based on the ads defined in the VMAP.",
    }),
  expiry: z.union([z.number(), z.literal(false)]).default(60 * 60 * 48),
});

export const assetListResponseSchema = z.object({
  ASSETS: z.array(
    z.object({
      URI: z.string(),
      DURATION: z.number(),
      "X-AD-CREATIVE-SIGNALING": z.unknown().optional(),
    }),
  ),
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
    vmap: z.string().optional(),
    filter: filterSchema.optional(),
  }),
);
