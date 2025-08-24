export interface CountResponse {
  total: number;
  [key: string]: any;
}

export interface ArticlesCountResponse {
  articles: CountResponse;
  categories: CountResponse;
}

export interface OverviewCounts {
  users: CountResponse;
  articles: ArticlesCountResponse;
  chatSessions: CountResponse;
  discussionRooms: CountResponse;
}

export interface OverviewApiResponse {
  success: boolean;
  data: OverviewCounts;
  error?: string;
}
