/**
 * System Status Service
 * Provides overall system health and status information
 */

import { supabase } from '../../db/supabase';
import { SystemStatus } from './types';

export class StatusService {
  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      // Get corridor statistics
      const { data: corridors } = await supabase
        .from('route_executions')
        .select('corridor, status')
        .not('corridor', 'is', null);

      const uniqueCorridors = new Set((corridors || []).map((c: any) => c.corridor));
      const corridorStatus = this.calculateCorridorStatus(corridors || []);

      // Get PSP statistics
      const { data: pspData } = await supabase
        .from('route_executions')
        .select('psp_id, status')
        .not('psp_id', 'is', null);

      const uniquePSPs = new Set((pspData || []).map((p: any) => p.psp_id));
      const pspStatus = this.calculatePSPStatus(pspData || []);

      // Calculate uptime (simplified - would need more data in production)
      const uptime = this.calculateUptime(corridors || []);

      // Get last incident (would come from incident tracking in production)
      const lastIncident = await this.getLastIncident();

      return {
        status: this.determineOverallStatus(corridorStatus, pspStatus, uptime),
        uptime,
        lastIncident,
        corridors: {
          total: uniqueCorridors.size,
          operational: corridorStatus.operational,
          degraded: corridorStatus.degraded,
          down: corridorStatus.down,
        },
        psp: {
          total: uniquePSPs.size,
          operational: pspStatus.operational,
          degraded: pspStatus.degraded,
          down: pspStatus.down,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('❌ Failed to get system status:', error);
      // Return default status on error
      return {
        status: 'degraded',
        uptime: 95,
        corridors: { total: 0, operational: 0, degraded: 0, down: 0 },
        psp: { total: 0, operational: 0, degraded: 0, down: 0 },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Calculate corridor status
   */
  private calculateCorridorStatus(executions: any[]): {
    operational: number;
    degraded: number;
    down: number;
  } {
    // Group by corridor
    const corridorMap = new Map<string, { success: number; total: number }>();

    executions.forEach((exec: any) => {
      const corridor = exec.corridor;
      if (!corridorMap.has(corridor)) {
        corridorMap.set(corridor, { success: 0, total: 0 });
      }
      const stats = corridorMap.get(corridor)!;
      stats.total++;
      if (exec.status === 'success') {
        stats.success++;
      }
    });

    let operational = 0;
    let degraded = 0;
    let down = 0;

    corridorMap.forEach((stats) => {
      const successRate = stats.total > 0 ? stats.success / stats.total : 0;
      if (successRate >= 0.95) {
        operational++;
      } else if (successRate >= 0.80) {
        degraded++;
      } else {
        down++;
      }
    });

    return { operational, degraded, down };
  }

  /**
   * Calculate PSP status
   */
  private calculatePSPStatus(executions: any[]): {
    operational: number;
    degraded: number;
    down: number;
  } {
    // Group by PSP
    const pspMap = new Map<string, { success: number; total: number }>();

    executions.forEach((exec: any) => {
      const pspId = exec.psp_id;
      if (!pspMap.has(pspId)) {
        pspMap.set(pspId, { success: 0, total: 0 });
      }
      const stats = pspMap.get(pspId)!;
      stats.total++;
      if (exec.status === 'success') {
        stats.success++;
      }
    });

    let operational = 0;
    let degraded = 0;
    let down = 0;

    pspMap.forEach((stats) => {
      const successRate = stats.total > 0 ? stats.success / stats.total : 0;
      if (successRate >= 0.95) {
        operational++;
      } else if (successRate >= 0.80) {
        degraded++;
      } else {
        down++;
      }
    });

    return { operational, degraded, down };
  }

  /**
   * Calculate uptime percentage
   */
  private calculateUptime(executions: any[]): number {
    if (executions.length === 0) return 100;

    const successful = executions.filter((e: any) => e.status === 'success').length;
    return (successful / executions.length) * 100;
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(
    corridorStatus: { operational: number; degraded: number; down: number },
    pspStatus: { operational: number; degraded: number; down: number },
    uptime: number
  ): 'operational' | 'degraded' | 'down' {
    if (uptime >= 99 && corridorStatus.down === 0 && pspStatus.down === 0) {
      return 'operational';
    }
    if (uptime >= 95 && corridorStatus.down === 0) {
      return 'degraded';
    }
    return 'down';
  }

  /**
   * Get last incident (mock - would come from incident tracking in production)
   */
  private async getLastIncident(): Promise<SystemStatus['lastIncident']> {
    // In production, this would query an incidents table
    // For now, return undefined (no incidents)
    return undefined;
  }
}

// Singleton instance
let statusServiceInstance: StatusService | null = null;

export function getStatusService(): StatusService {
  if (!statusServiceInstance) {
    statusServiceInstance = new StatusService();
  }
  return statusServiceInstance;
}

