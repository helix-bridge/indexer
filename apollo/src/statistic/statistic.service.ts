import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AggregationService } from '../aggregation/aggregation.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class StatisticService implements OnModuleInit {
  private readonly logger = new Logger('statistic');
  // start at 2021-12-15 00:00:00
  private readonly startDay = 1639497600;
  private readonly secondPerDay = 86400;
  private readonly fetchDailyDataInterval = 60000;
  private isWorking = false;

  private readonly bridges = [
    { from: 'crab-dvm', to: 'darwinia', bridge: 'helix-s2s', token: 'xRING', decimals: 1e18 },
    { from: 'darwinia', to: 'crab-dvm', bridge: 'helix-s2s', token: 'RING', decimals: 1e9 },
    { from: 'crab-dvm', to: 'crab', bridge: 'helix-s2dvm', token: 'CRAB', decimals: 1e18 },
    { from: 'crab', to: 'crab-dvm', bridge: 'helix-s2dvm', token: 'CRAB', decimals: 1e9 },
    { from: 'crab', to: 'crab-parachain', bridge: 'helix-s2p', token: 'CRAB', decimals: 1e9 },
    { from: 'crab-parachain', to: 'crab', bridge: 'helix-s2p', token: 'CRAB', decimals: 1e18 },
    { from: 'crab-dvm', to: 'heco', bridge: 'cBridge-crab-dvm', token: 'xRING', decimals: 1e18 },
    { from: 'heco', to: 'crab-dvm', bridge: 'cBridge-heco', token: 'RING', decimals: 1e18 },
    { from: 'crab-dvm', to: 'polygon', bridge: 'cBridge-crab-dvm', token: 'xRING', decimals: 1e18 },
    { from: 'polygon', to: 'crab-dvm', bridge: 'cBridge-polygon', token: 'RING', decimals: 1e18 },
    { from: 'ethereum', to: 'polygon', bridge: 'cBridge-ethereum', token: 'RING', decimals: 1e18 },
    { from: 'polygon', to: 'ethereum', bridge: 'cBridge-polygon', token: 'RING', decimals: 1e18 },
    { from: 'heco', to: 'ethereum', bridge: 'cBridge-heco', token: 'RING', decimals: 1e18 },
    { from: 'ethereum', to: 'heco', bridge: 'cBridge-ethereum', token: 'RING', decimals: 1e18 },
    {
      from: 'crab-dvm',
      to: 'ethereum',
      bridge: 'cBridge-crab-dvm',
      token: 'xRING',
      decimals: 1e18,
    },
    { from: 'ethereum', to: 'crab-dvm', bridge: 'cBridge-ethereum', token: 'RING', decimals: 1e18 },
  ];
  private lastDays = new Array(this.bridges.length).fill(0);

  constructor(private aggregationService: AggregationService, private taskService: TasksService) {}

  async onModuleInit() {
    this.taskService.addInterval(`daily-statistic`, this.fetchDailyDataInterval, async () => {
      if (this.isWorking) {
        return;
      }
      this.isWorking = true;
      this.bridges.forEach(async (item, index) => {
        await this.refreshStatistic(
          item.from,
          item.to,
          item.bridge,
          item.token,
          global.BigInt(item.decimals),
          index
        );
      });
      this.isWorking = false;
    });
  }

  async refreshStatistic(
    from: string,
    to: string,
    bridge: string,
    token: string,
    decimals: bigint,
    index: number
  ) {
    try {
      let lastStatisticDay = this.lastDays[index];
      if (lastStatisticDay === 0) {
        lastStatisticDay = await this.aggregationService
          .queryDailyStatisticsFirst({
            fromChain: from,
            toChain: to,
            bridge: bridge,
            token: token,
          })
          .then((firstRecord) => (firstRecord ? firstRecord.timestamp : this.startDay));
      }

      const latestRecordDay = await this.aggregationService
        .queryHistoryRecordFirst({
          fromChain: from,
          toChain: to,
          bridge: bridge,
          token: token,
        })
        .then((firstRecord) => (firstRecord ? firstRecord.startTime : this.startDay));
      let nextStartTimestamp = lastStatisticDay + this.secondPerDay;
      let nextEndTimestamp = nextStartTimestamp + this.secondPerDay;
      const records = await this.aggregationService.queryHistoryRecords({
        where: {
          fromChain: from,
          toChain: to,
          bridge: bridge,
          token: token,
          startTime: {
            gt: nextStartTimestamp,
            lt: nextEndTimestamp,
          },
        },
      });
      let count = records.total;
      let volume = global.BigInt(0);
      for (const record of records.records) {
        volume = volume + global.BigInt(record.sendAmount);
      }
      volume = volume / decimals;
      if (nextStartTimestamp < latestRecordDay) {
        this.lastDays[index] = nextStartTimestamp;
        if (count === 0) {
          return;
        }
        await this.aggregationService.createDailyStatistics({
          fromChain: from,
          toChain: to,
          bridge: bridge,
          timestamp: nextStartTimestamp,
          token: token,
          dailyVolume: volume,
          dailyCount: global.BigInt(count),
        });
        this.logger.log(
          `add new statistics record, from ${from}, to ${to}, bridge ${bridge}, token ${token}, time ${nextStartTimestamp}`
        );
      } else {
        if (this.startDay !== lastStatisticDay) {
          await this.aggregationService.updateDailyStatistics({
            where: {
              daily_statistics_id: {
                fromChain: from,
                toChain: to,
                bridge: bridge,
                token: token,
                timestamp: lastStatisticDay,
              },
            },
            data: {
              dailyVolume: volume,
              dailyCount: global.BigInt(count),
            },
          });
        }
      }
    } catch (e) {
      this.logger.warn('[Statistics] update daily statistics failed', 'err', e);
    }
  }
}
