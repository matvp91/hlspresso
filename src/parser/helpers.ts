export function mapAttributes(
  param: string,
  callback: (key: string, value: string) => void,
) {
  const items = splitByCommaWithPreservingQuotes(param);
  // biome-ignore lint/complexity/noForEach: Use forEach
  items.forEach((item) => {
    const [key, value] = item.split(/=(.+)/);
    if (key === undefined || value === undefined) {
      return;
    }
    callback(key, unquote(value));
  });
}

export function unquote(value: string) {
  return value.replace(/['"]+/g, "");
}

export function partOf<T extends readonly string[]>(
  list: T,
  value: string,
): value is T[number] {
  return list.includes(value);
}

function splitByCommaWithPreservingQuotes(str: string) {
  const list: string[] = [];

  let doParse = true;
  let start = 0;

  const prevQuotes: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const curr = str[i];

    if (doParse && curr === ",") {
      list.push(str.slice(start, i).trim());
      start = i + 1;
      continue;
    }

    if (curr === '"' || curr === "'") {
      if (doParse) {
        prevQuotes.push(curr);
        doParse = false;
      } else if (curr === prevQuotes.at(-1)) {
        prevQuotes.pop();
        doParse = true;
      } else {
        prevQuotes.push(curr);
      }
    }
  }

  list.push(str.slice(start).trim());

  return list;
}

export function hexToByteSequence(inputStr: string): Uint8Array {
  let str = inputStr;
  if (str.startsWith("0x") || str.startsWith("0X")) {
    str = str.slice(2);
  }
  const numArray = new Uint8Array(str.length / 2);
  for (let i = 0; i < str.length; i += 2) {
    numArray[i / 2] = Number.parseInt(str.slice(i, i + 2), 16);
  }
  return numArray;
}

export function byteSequenceToHex(
  sequence: Uint8Array,
  start = 0,
  end = sequence.byteLength,
) {
  if (end <= start) {
    throw new Error("End must be larger than start");
  }
  const list: string[] = [];
  for (let i = start; i < end; i++) {
    const chunk = sequence[i];
    if (chunk !== undefined) {
      list.push(`0${(chunk & 0xff).toString(16).toUpperCase()}`.slice(-2));
    }
  }
  return `0x${list.join("")}`;
}
