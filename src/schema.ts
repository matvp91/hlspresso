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

export const createSessionParamsSchema = z.object({
  url: z.string(),
  interstitials: z
    .array(
      z.object({
        time: z.number(),
        duration: z.number().optional(),
        assets: z
          .array(
            z.discriminatedUnion("type", [
              z.object({
                type: z.literal("static"),
                url: z.string(),
              }),
              z.object({
                type: z.literal("vast"),
                url: z.string(),
              }),
            ]),
          )
          .optional(),
      }),
    )
    .optional(),
  vmap: z
    .object({
      url: z.string(),
    })
    .optional(),
  expiry: z.number().default(60 * 60 * 48),
});

export const assetListResponseSchema = z.object({
  ASSETS: z.array(
    z.object({
      URI: z.string(),
      DURATION: z.number(),
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
  }),
);
