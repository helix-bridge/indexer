import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HistoryRecord, Prisma, PrismaClient } from '@prisma/client';
import { HistoryRecords, LnBridgeRelayInfo, LnBridgeRelayInfos } from '../graphql';
// export lnbridge service configure
import { TransferService as Lnv2Service } from '../lnv2/transfer.service';
import { TransferService as Lnv3Service } from '../lnv3/transfer.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class AggregationService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('aggregation');

  async onModuleInit() {
    await this.$connect();
  }

  constructor(
    private lnv2Service: Lnv2Service,
    private lnv3Service: Lnv3Service,
    private tasksService: TasksService
  ) {
    super();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }

  async createHistoryRecord(data: Prisma.HistoryRecordCreateInput): Promise<HistoryRecord> {
    return this.historyRecord.create({
      data,
    });
  }

  async deleteHistoryRecord(data: Prisma.HistoryRecordWhereUniqueInput): Promise<HistoryRecord> {
    return this.historyRecord.delete({
      where: data,
    });
  }

  async updateHistoryRecord(params: {
    where: Prisma.HistoryRecordWhereUniqueInput;
    data: Prisma.HistoryRecordUpdateInput;
  }): Promise<HistoryRecord> {
    const { where, data } = params;
    return this.historyRecord.update({
      data,
      where,
    });
  }

  async queryLnBridgeRelayInfoFirst(
    lnBridgeRelayInfoWhereInput: Prisma.LnBridgeRelayInfoWhereInput,
    orderBy?: Prisma.Enumerable<Prisma.LnBridgeRelayInfoOrderByWithRelationAndSearchRelevanceInput>
  ): Promise<LnBridgeRelayInfo | null> {
    return this.lnBridgeRelayInfo.findFirst({
      where: lnBridgeRelayInfoWhereInput,
      orderBy,
    });
  }

  async createLnBridgeRelayInfo(
    data: Prisma.LnBridgeRelayInfoCreateInput
  ): Promise<LnBridgeRelayInfo> {
    return this.lnBridgeRelayInfo.create({
      data,
    });
  }

  async queryLnBridgeRelayInfoById(
    lnBridgeRelayInfoWhereUniqueInput: Prisma.LnBridgeRelayInfoWhereUniqueInput
  ): Promise<LnBridgeRelayInfo | null> {
    return this.lnBridgeRelayInfo.findUnique({
      where: lnBridgeRelayInfoWhereUniqueInput,
    });
  }

  async updateLnBridgeRelayInfo(params: {
    where: Prisma.LnBridgeRelayInfoWhereUniqueInput;
    data: Prisma.LnBridgeRelayInfoUpdateInput;
  }): Promise<LnBridgeRelayInfo> {
    const { where, data } = params;
    return this.lnBridgeRelayInfo.update({
      data,
      where,
    });
  }

  async queryLnBridgeRelayInfos(params: {
    skip?: number;
    take?: number;
    where?: Prisma.LnBridgeRelayInfoWhereInput;
  }): Promise<LnBridgeRelayInfos> {
    const { skip, take, where } = params;
    const records = await this.lnBridgeRelayInfo.findMany({
      skip,
      take,
      where,
    });
    const total = await this.lnBridgeRelayInfo.count({ where });

    return { total, records };
  }

  async updateConfirmedBlock(params: {
    where: Prisma.HistoryRecordWhereUniqueInput;
    block: string;
  }) {
    const { where, block } = params;
    try {
      const record = await this.historyRecord.findUnique({
        where,
      });
      // tx has been redeemed
      if (record.responseTxHash !== '') {
        return;
      }
      await this.historyRecord.update({
        where,
        data: {
          confirmedBlocks: block,
        },
      });
    } catch (error) {
      this.logger.warn(`update confirmed block failed ${where}, ${block}, ${error}`);
    }
  }

  async queryHistoryRecordById(
    historyRecordWhereUniqueInput: Prisma.HistoryRecordWhereUniqueInput
  ): Promise<HistoryRecord | null> {
    return this.historyRecord.findUnique({
      where: historyRecordWhereUniqueInput,
    });
  }

  async queryHistoryRecordFirst(
    historyRecordWhereInput: Prisma.HistoryRecordWhereInput,
    orderBy?: Prisma.Enumerable<Prisma.HistoryRecordOrderByWithRelationAndSearchRelevanceInput>
  ): Promise<HistoryRecord | null> {
    return this.historyRecord.findFirst({
      where: historyRecordWhereInput,
      orderBy,
    });
  }

  async queryHistoryRecords(params: {
    skip?: number;
    take?: number;
    where?: Prisma.HistoryRecordWhereInput;
    orderBy?: Prisma.Enumerable<Prisma.HistoryRecordOrderByWithRelationAndSearchRelevanceInput>;
  }): Promise<HistoryRecords> {
    const { skip, take, where, orderBy } = params;
    const records = await this.historyRecord.findMany({
      skip,
      take,
      where,
      orderBy,
    });
    const total = await this.historyRecord.count({ where });

    return { total, records };
  }

  tasksHealthCheck() {
    return this.tasksService.queryHealthChecks();
  }

  targetAmountToSourceAmount(params: {
    amount: string;
    sourceChainId: number;
    targetChainId: number;
    sourceToken: string;
    version: string;
  }): string {
    const { amount, sourceChainId, targetChainId, sourceToken, version } = params;
    const transferDecimals = (value: string, decimals: number) => {
      if (decimals > 0) {
        return value.padEnd(value.length + decimals, '0');
      } else if (value.length + decimals > 0) {
        return value.substr(0, value.length + decimals);
      } else {
        return '0';
      }
    };

    if (version === 'lnv2') {
      const sourceNode = this.lnv2Service.transfers.find((item) => item.chainId === sourceChainId);
      const sourceTokenInfo = sourceNode?.tokens.find(
        (item) => item.fromAddress.toLowerCase() === sourceToken.toLowerCase()
      );
      if (sourceTokenInfo === undefined) {
        return '0';
      }
      const targetNode = this.lnv2Service.transfers.find((item) => item.chainId === targetChainId);
      const targetTokenInfo = targetNode?.tokens.find((item) => item.key === sourceTokenInfo.key);
      if (targetTokenInfo === undefined) {
        return '0';
      }

      return transferDecimals(amount, sourceTokenInfo.decimals - targetTokenInfo.decimals);
    } else {
      const lnv3SourceBridge = this.lnv3Service.transfers.find(
        (item) => item.chainId === sourceChainId
      );
      const sourceSymbol = lnv3SourceBridge?.symbols.find(
        (item) => item.address.toLowerCase() === sourceToken.toLowerCase()
      );
      if (sourceSymbol === undefined) {
        return '0';
      }
      const lnv3TargetBridge = this.lnv3Service.transfers.find(
        (item) => item.chainId === targetChainId
      );
      const targetSymbol = lnv3TargetBridge?.symbols.find((item) => item.key === sourceSymbol.key);

      return transferDecimals(amount, sourceSymbol.decimals - targetSymbol.decimals);
    }
  }

  checkLnBridgeConfigure(params: {
    sourceChainId: number;
    targetChainId: number;
    sourceToken: string;
    targetToken: string;
    version: string;
  }): boolean {
    const { sourceChainId, targetChainId, sourceToken, targetToken, version } = params;
    if (version === 'lnv2') {
      const bridge = this.lnv2Service.transfers.find((item) => item.chainId === sourceChainId);
      if (bridge === undefined) {
        return false;
      }
      const tokenBridge = bridge.tokens.find(
        (item) => item.fromAddress.toLowerCase() === sourceToken.toLowerCase()
      );
      if (tokenBridge === undefined) {
        return false;
      }
      const targetInfo = tokenBridge.remoteInfos.find(
        (item) =>
          item.toChain === targetChainId &&
          item.toAddress.toLowerCase() === targetToken.toLowerCase()
      );
      return targetInfo !== undefined;
    } else {
      const lnv3SourceBridge = this.lnv3Service.transfers.find(
        (item) => item.chainId === sourceChainId
      );
      if (lnv3SourceBridge === undefined) {
        return false;
      }
      const sourceSymbol = lnv3SourceBridge.symbols.find(
        (item) => item.address.toLowerCase() === sourceToken.toLowerCase()
      );
      if (sourceSymbol === undefined) {
        return false;
      }
      const lnv3TargetBridge = this.lnv3Service.transfers.find(
        (item) => item.chainId === targetChainId
      );
      if (lnv3TargetBridge === undefined) {
        return false;
      }
      const targetSymbol = lnv3TargetBridge.symbols.find(
        (item) => item.address.toLowerCase() === targetToken.toLowerCase()
      );
      return targetSymbol !== undefined;
    }
  }

  async calculateLnBridgeRelayerPoint(
    token: string,
    amount: bigint,
    decimals: number,
    relayerInfo: LnBridgeRelayInfo
  ): Promise<number | null> {
    const orderBy = { startTime: Prisma.SortOrder.desc };
    const pendingRecords = await this.queryHistoryRecords({
      where: {
        fromChain: relayerInfo.fromChain,
        toChain: relayerInfo.toChain,
        bridge: relayerInfo.bridge,
        relayer: relayerInfo.relayer,
        sendTokenAddress: token,
        endTxHash: '',
      },
      orderBy,
    });

    if (relayerInfo.version == 'lnv2') {
      let marginUsed = BigInt(0);
      for (const pendingRecord of pendingRecords.records) {
        marginUsed += BigInt(pendingRecord.sendAmount);
      }
      // margin not enough, todo add finefund
      if (BigInt(relayerInfo.margin) < marginUsed + amount) {
        this.logger.warn(
          `margin not enough, margin ${relayerInfo.margin}, used ${marginUsed}, amount ${amount}, relayer ${relayerInfo.relayer}`
        );
        return null;
      }
    }
    const F =
      BigInt(relayerInfo.baseFee) +
      BigInt(relayerInfo.protocolFee) +
      (BigInt(relayerInfo.liquidityFeeRate) * amount) / BigInt(100000);
    const R = relayerInfo.slashCount;
    const w = 1 + R * 0.1;
    return Number(F) * w;
  }
}
