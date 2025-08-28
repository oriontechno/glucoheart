import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '../session';
import api from '../axios';

export class HealthMetricsServerService {
  private static async getAuthenticatedRequest() {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || !session.access_token) {
      throw new Error('Not authenticated');
    }

    return {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    };
  }

  static async getHealthMetricById(id: number) {
    try {
      const authConfig = await this.getAuthenticatedRequest();
      const response = await api.get(`/health-metrics/${id}`, authConfig);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching health metric:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch health metric'
      };
    }
  }

  static async getAdminHealthMetrics(filters: {
    page?: number;
    limit?: number;
    roles?: string;
    actives?: string;
    search?: string;
    sort?: string;
  }) {
    try {
      const authConfig = await this.getAuthenticatedRequest();
      const response = await api.get('/health-metrics', {
        params: filters,
        ...authConfig
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch health metrics',
        data: {
          metrics: [],
          total_metrics: 0
        }
      };
    }
  }
}
