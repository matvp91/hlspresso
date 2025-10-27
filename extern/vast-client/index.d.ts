export class VASTClient {
  get(url: string): Promise<VASTResponse>;
}

export type VASTResponse = {
  ads: VASTAd[];
};

export type VASTAd = {
  creatives: VASTCreative[];
};

export type VASTCreative = {
  adId: string | null;
  trackingEvents: Record<string, string[]>;
} & (VASTCreativeLinear | VASTCreativeNonLinear);

export type VASTCreativeLinear = {
  type: "linear";
  duration: number;
  mediaFiles: VASTMediaFile[];
};

export type VASTCreativeNonLinear = {
  type: "nonlinear";
};

export type VASTMediaFile = {
  mimeType?: string;
  fileURL?: string;
};
