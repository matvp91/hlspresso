import { z } from "@hono/zod-openapi";
import { DateTime } from "luxon";
import rison from "rison";
import { ApiError } from "./error";

const dateTimeSchema = z.codec(
  z.string(),
  z.custom<DateTime>((val) => DateTime.isDateTime(val) && val.isValid),
  {
    decode: (value) => {
      const dateTime = DateTime.fromISO(value);
      if (!dateTime.isValid) {
        throw new ApiError("PARSE_ERROR", `Invalid ISO string ${value}`);
      }
      return dateTime;
    },
    encode: (dateTime) => {
      const value = dateTime.toISO();
      if (value === null) {
        throw new ApiError("PARSE_ERROR", "Invalid DateTime");
      }
      return value;
    },
  },
);

const uriStringSchema = z.codec(z.string(), z.string(), {
  decode: (enc) => decodeURIComponent(enc),
  encode: (dec) => encodeURIComponent(dec),
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
    path: uriStringSchema,
  }),
);
