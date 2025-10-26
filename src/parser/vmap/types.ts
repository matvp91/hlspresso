export type VMAPAdBreak = {
  time: number;
  adTagUri?: string;
  vastAdData?: string;
};

export type VMAP = {
  adBreaks: VMAPAdBreak[];
};
