export class VASTClient {
  get(url: string): Promise<VASTResponse>;
  parseVAST(xml: Document): Promise<VASTResponse>;
}

export type VASTResponse = {
  ads: VASTAd[];
};

export type VASTAd = {
  id: string;
  creatives: VASTCreative[];
  impressionURLTemplates?: VASTURLValue[];
  errorURLTemplates?: string[];
};

export type VASTCreative = {
  trackingEvents: Record<string, string[]>;
  universalAdIds: string[];
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
export type VASTURLValue = {
  id?: string;
  url: string;
};
