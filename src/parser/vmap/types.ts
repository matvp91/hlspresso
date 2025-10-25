export type VMAPAdBreak = {
  time: number;
  url?: string;
  data?: string;
};

export type VMAP = {
  adBreaks: VMAPAdBreak[];
};
