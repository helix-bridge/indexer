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
      orderBy: orderBy ?? { startTime: Prisma.SortOrder.asc },
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
      const sourceNode = this.lnv2Service.transfers.find(
        (item) => Number(item.chainConfig.id) === sourceChainId
      );
      const sourceTokenInfo = sourceNode?.chainConfig.tokens.find(
        (item) => item.address.toLowerCase() === sourceToken.toLowerCase()
      );
      if (sourceTokenInfo === undefined) {
        return '0';
      }
      const couple = sourceNode.chainConfig.couples.find(
        (item) =>
          Number(item.chain.id) === targetChainId &&
          item.protocol.name.startsWith('lnv2') &&
          item.symbol.from === sourceTokenInfo.symbol
      );
      if (couple === undefined) {
        return '0';
      }
      const targetNode = this.lnv2Service.transfers.find(
        (item) => Number(item.chainConfig.id) === targetChainId
      );
      const targetTokenInfo = targetNode?.chainConfig.tokens.find(
        (item) => item.symbol === couple.symbol.to
      );
      if (targetTokenInfo === undefined) {
        return '0';
      }

      return transferDecimals(amount, sourceTokenInfo.decimals - targetTokenInfo.decimals);
    } else {
      const srcChainConfig = this.lnv3Service.transfers.find(
        (item) => Number(item.chainConfig.id) === sourceChainId
      )?.chainConfig;
      const dstChainConfig = this.lnv3Service.transfers.find(
        (item) => Number(item.chainConfig.id) === targetChainId
      )?.chainConfig;

      const srcToken = srcChainConfig?.tokens.find(
        (token) => token.address.toLowerCase() === sourceToken.toLowerCase()
      );
      const couple = srcChainConfig?.couples.find(
        (couple) =>
          Number(couple.chain.id) === targetChainId &&
          couple.protocol.name === 'lnv3' &&
          couple.symbol.from === srcToken.symbol
      );
      const dstTokenSymbol = couple?.symbol.to;
      const dstToken = dstChainConfig?.tokens.find((token) => token.symbol === dstTokenSymbol);

      const srcDecimals = srcToken?.decimals;
      const dstDecimals = dstToken?.decimals;
      if (srcDecimals === undefined || dstDecimals === undefined) {
        return '0';
      }

      return transferDecimals(amount, srcDecimals - dstDecimals);
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
      const sourceNode = this.lnv2Service.transfers.find(
        (item) => Number(item.chainConfig.id) === sourceChainId
      );
      if (sourceNode === undefined) {
        return false;
      }
      const sourceTokenInfo = sourceNode.chainConfig.tokens.find(
        (item) => item.address.toLowerCase() === sourceToken.toLowerCase()
      );
      if (sourceTokenInfo === undefined) {
        return false;
      }
      const couple = sourceNode.chainConfig.couples.find(
        (item) =>
          Number(item.chain.id) === targetChainId &&
          item.protocol.name.startsWith('lnv2') &&
          item.symbol.from === sourceTokenInfo.symbol
      );
      if (couple === undefined) {
        return false;
      }
      const targetNode = this.lnv2Service.transfers.find(
        (item) => Number(item.chainConfig.id) === targetChainId
      );
      if (targetNode === undefined) {
        return false;
      }
      const targetTokenInfo = targetNode.chainConfig.tokens.find(
        (item) => item.address.toLowerCase() === couple.symbol.to.toLowerCase()
      );
      return targetTokenInfo.address.toLowerCase() === targetToken.toLowerCase();
    } else {
      const srcChainConfig = this.lnv3Service.transfers.find(
        (item) => Number(item.chainConfig.id) === sourceChainId
      )?.chainConfig;
      const dstChainConfig = this.lnv3Service.transfers.find(
        (item) => Number(item.chainConfig.id) === targetChainId
      )?.chainConfig;

      if (srcChainConfig === undefined || dstChainConfig === undefined) {
        return false;
      }
      const srcToken = srcChainConfig.tokens.find(
        (token) => token.address.toLowerCase() === sourceToken.toLowerCase()
      );
      const dstToken = dstChainConfig.tokens.find(
        (token) => token.address.toLowerCase() === targetToken.toLowerCase()
      );
      if (srcToken === undefined || dstToken === undefined) {
        return false;
      }
      const srcCouple = srcChainConfig?.couples.find(
        (couple) =>
          Number(couple.chain.id) === targetChainId &&
          couple.protocol.name === 'lnv3' &&
          couple.symbol.from === srcToken.symbol &&
          couple.symbol.to === dstToken.symbol
      );
      const dstCouple = dstChainConfig?.couples.find(
        (couple) =>
          Number(couple.chain.id) === sourceChainId &&
          couple.protocol.name === 'lnv3' &&
          couple.symbol.from === dstToken.symbol &&
          couple.symbol.to === srcToken.symbol
      );
      return srcCouple !== undefined && dstCouple !== undefined;
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
