import { ContentItem } from "../types";

export type HomeStackParamList = {
  HomeMain: undefined;
  SearchResult: {
    domain: string;
    query: string;
  };
  Recommendation: {
    item: ContentItem;
  };
};
