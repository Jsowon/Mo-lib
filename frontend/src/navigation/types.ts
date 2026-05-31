import { NavigatorScreenParams } from "@react-navigation/native";

export type HomeStackParamList = {
  HomeMain: undefined;
  SearchResult: {
    domain: string;
    query: string;
  };
};

export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Map: { mapId?: string } | undefined;
  Archive: undefined;
};
