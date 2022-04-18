import { S2sDailyStatistics } from '../types';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex, isHex } from '@polkadot/util';

export class S2sDailyStatisticsHandler {
  static async ensureS2sDailyStatistics(id: string) {
    const daily = await S2sDailyStatistics.get(id);

    if (!daily) {
      const daily = new S2sDailyStatistics(id);

      daily.dailyVolume = BigInt(0);
      daily.dailyCount = 0;
      await daily.save();

      return daily;
    }
  }

  static async getS2sDailyStatistics(id: string) {
    await this.ensureS2sDailyStatistics(id);

    const daily = await S2sDailyStatistics.get(id);

    return daily;
  }

  static async updateS2sDailyStatistics(id: string, data: Record<string, any>) {
    const daily = await this.getS2sDailyStatistics(id);

    Object.entries(data).forEach(([key, value]) => {
      daily[key] = value;
    });

    await daily.save();
  }

  static async updateS2sDailyVolume(id: string, amount: bigint) {
    const daily = await this.getS2sDailyStatistics(id);
    await this.updateS2sDailyStatistics(id, {
      dailyCount: daily.dailyCount + 1,
      dailyVolume: daily.dailyVolume + BigInt(amount),
    });
  }
}
