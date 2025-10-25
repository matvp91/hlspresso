import { DateTime } from "luxon";
import { registerCustom } from "superjson";
import { assert } from "../assert";

export { default as SuperJSON } from "superjson";

registerCustom<DateTime, string>(
  {
    isApplicable: (value) => DateTime.isDateTime(value),
    serialize: (dateTime) => {
      const value = dateTime.toISO();
      assert(value, "Failed to convert to ISO");
      return value;
    },
    deserialize: (value) => DateTime.fromISO(value),
  },
  "DateTime",
);
