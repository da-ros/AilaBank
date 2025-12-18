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
      const { data: corridors, error: corridorError } = await supabase
        .from('route_executions')
        .select('corridor, status')
        .not('corridor', 'is', null);

      if (corridorError) {
        console.error('⚠️ Error fetching corridor data:', corridorError);
      }

      const uniqueCorridors = new Set((corridors || []).map((c: any) => c.corridor));
      const corridorStatus = this.calculateCorridorStatus(corridors || []);

      // Get PSP statistics
      const { data: pspData, error: pspError } = await supabase
        .from('route_executions')
        .select('psp_id, status')
        .not('psp_id', 'is', null);

      if (pspError) {
        console.error('⚠️ Error fetching PSP data:', pspError);
      }

      const uniquePSPs = new Set((pspData || []).map((p: any) => p.psp_id));
      const pspStatus = this.calculatePSPStatus(pspData || []);

      // Calculate uptime (simplified - would need more data in production)
      const uptime = this.calculateUptime(corridors || []);

      // Get last incident (would come from incident tracking in production)
      const lastIncident = await this.getLastIncident();

      const totalExecutions = (corridors || []).length;
      const overallStatus = this.determineOverallStatus(
        corridorStatus, 
        pspStatus, 
        uptime,
        totalExecutions
      );

      return {
        status: overallStatus,
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
      // Return default status on error - assume operational if we can't determine
      return {
        status: 'operational',
        uptime: 100,
        corridors: { total: 0, operational: 0, degraded: 0, down: 0 },
        psp: { total: 0, operational: 0, degraded: 0, down: 0 },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Calculate corridor status
   * Only counts completed executions (excludes pending)
   */
  private calculateCorridorStatus(executions: any[]): {
    operational: number;
    degraded: number;
    down: number;
  } {
    // Group by corridor
    const corridorMap = new Map<string, { success: number; total: number }>();

    executions.forEach((exec: any) => {
      // Only count completed executions (exclude pending)
      if (exec.status === 'pending') return;
      
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

    // If no completed executions for any corridor, assume all are operational
    if (corridorMap.size === 0) {
      const uniqueCorridors = new Set(executions.map((e: any) => e.corridor).filter(Boolean));
      return { operational: uniqueCorridors.size, degraded: 0, down: 0 };
    }

    return { operational, degraded, down };
  }

  /**
   * Calculate PSP status
   * Only counts completed executions (excludes pending)
   */
  private calculatePSPStatus(executions: any[]): {
    operational: number;
    degraded: number;
    down: number;
  } {
    // Group by PSP
    const pspMap = new Map<string, { success: number; total: number }>();

    executions.forEach((exec: any) => {
      // Only count completed executions (exclude pending)
      if (exec.status === 'pending') return;
      
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

    // If no completed executions for any PSP, assume all are operational
    if (pspMap.size === 0) {
      const uniquePSPs = new Set(executions.map((e: any) => e.psp_id).filter(Boolean));
      return { operational: uniquePSPs.size, degraded: 0, down: 0 };
    }

    return { operational, degraded, down };
  }

  /**
   * Calculate uptime percentage
   * Only counts completed executions (success or failed), excludes pending
   */
  private calculateUptime(executions: any[]): number {
    if (executions.length === 0) return 100;

    // Only count completed executions (exclude pending)
    const completed = executions.filter((e: any) => 
      e.status === 'success' || e.status === 'failed'
    );
    
    // If no completed executions yet, assume 100% (system is operational but no transactions completed)
    if (completed.length === 0) return 100;

    const successful = completed.filter((e: any) => e.status === 'success').length;
    return (successful / completed.length) * 100;
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(
    corridorStatus: { operational: number; degraded: number; down: number },
    pspStatus: { operational: number; degraded: number; down: number },
    uptime: number,
    totalExecutions: number = 0
  ): 'operational' | 'degraded' | 'down' {
    // If there's no data yet (new system), assume operational
    if (totalExecutions === 0) {
      console.log('ℹ️ No execution data yet - defaulting to operational');
      return 'operational';
    }

    // If there are down corridors or PSPs, system is down
    if (corridorStatus.down > 0 || pspStatus.down > 0) {
      return 'down';
    }

    // If uptime is excellent and no down services, operational
    if (uptime >= 99 && corridorStatus.down === 0 && pspStatus.down === 0) {
      return 'operational';
    }

    // If uptime is good and no down corridors, degraded
    if (uptime >= 95 && corridorStatus.down === 0) {
      return 'degraded';
    }

    // If uptime is below 95%, system is down
    if (uptime < 95) {
      return 'down';
    }

    // Default to operational if we can't determine
    return 'operational';
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

