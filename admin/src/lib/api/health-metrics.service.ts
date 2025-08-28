import api from '../axios';
import { toast } from 'sonner';

export const healthMetricsService = {
  getAll: async (filters?: { [key: string]: any }) => {
    try {
      const response = await api.get('/health-metrics', {
        params: filters
      });
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch health metrics.');
      throw new Error('Failed to fetch health metrics');
    }
  },

  create: async (data: any) => {
    try {
      const response = await api.post('/health-metrics', data);
      toast.success('Health metric created successfully!');
      return response.data;
    } catch (error) {
      toast.error('Failed to create health metric.');
      throw new Error('Failed to create health metric.');
    }
  },

  getHealthMetricById: async (id: number) => {
    try {
      const response = await api.get(`/health-metrics/${id}`);
      return response.data;
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch health metric.');
      throw new Error('Failed to fetch health metric.');
    }
  },

  delete: async (id: number) => {
    try {
      await api.delete(`/health-metrics/${id}`);
      toast.success('Health metric deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete health metric.');
      throw new Error('Failed to delete health metric.');
    }
  },

  update: async (id: number, data: any) => {
    try {
      const response = await api.patch(`/health-metrics/${id}`, data);
      toast.success('Health metric updated successfully!');
      return response.data;
    } catch (error) {
      toast.error('Failed to update health metric.');
      throw new Error('Failed to update health metric.');
    }
  }
};
