import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AggregationService } from '../aggregation/aggregation.service';
import { BridgeChain } from '../base/BridgeTransferService';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';

@Injectable()
export class CbridgeService implements OnModuleInit {
  private readonly logger = new Logger('cBridge');
  protected isSyncingHistory = new Array(this.transferService.transfers.length).fill(false);
  protected fetchSendDataInterval = 30000;
  private readonly latestNonce = new Array(this.transferService.transfers.length).fill(-1);

  private readonly takeEachTime = 3;
  private skip = new Array(this.transferService.transfers.length).fill(0);

  private readonly sgnUrl = this.configService.get<string>('CBRIDGE_SGN_URL');

  private readonly statusTransferCompleted = 5;
  private readonly statusTransferRefunded = 10;

  private readonly xferStatus = [
      "unknown",
      "ok_to_relay",
      "success",
      "bad_liquidity",
      "bad_slippage",
      "bad_token",
      "refund_requested",
      "refund_done",
      "bad_xfer_disabled",
      "bad_dest_chain"
  ];

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {
  }

  // all chains need to fetch it's send event and receive event
  async onModuleInit() {
    this.transferService.transfers.forEach((item, index) => {
      this.taskService.addInterval(
        `${item.chain}-cbridge-fetch_history_data`,
        this.fetchSendDataInterval,
        async () => {
          if (this.isSyncingHistory[index]) {
            return;
          }
          this.isSyncingHistory[index] = true;
          await this.fetchSendRecords(item, index);
          await this.fetchStatus(item, index);
          this.isSyncingHistory[index] = false;
        }
      );
    });
  }

  protected genID(transfer: BridgeChain, identifier: string): string {
    return `${transfer.chain.split('-')[0]}-cbridge-${identifier}`;
  }

  private getDestChainName(id: number): BridgeChain | null {
      for (const chain of this.transferService.transfers) {
          if (chain.chainId == id) {
              return chain;
          }
      }
      return null;
  }

  async fetchSendRecords(transfer: BridgeChain, index: number) {
    // the nonce of cBridge message is not increased
    try {
      if (this.latestNonce[index] === -1) {
          const firstRecord = await this.aggregationService
          .queryHistoryRecordFirst({
              fromChain: transfer.chain,
              bridge: 'cBridge',
          });
          this.latestNonce[index] = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const query = `query { transferRecords(first: 10, orderBy: start_timestamp, orderDirection: asc, skip: ${this.latestNonce[index]}) { id, sender, receiver, token, amount, dst_chainid, request_transaction, start_timestamp } }`;
      const records = await axios
        .post(transfer.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.transferRecords);

      if (records && records.length > 0) {
        for (const record of records) {
          const toChain = this.getDestChainName(Number(record.dst_chainid));
          if (toChain == null) {
            this.latestNonce[index] += 1;
            continue;
          }
          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, record.id),
            fromChain: transfer.chain,
            toChain: toChain.chain,
            bridge: 'cBridge',
            laneId: '',
            nonce: this.latestNonce[index] + 1,
            requestTxHash: record.request_transaction,
            responseTxHash: '',
            sender: record.sender,
            recipient: record.receiver,
            token: transfer.token,
            amount: record.amount,
            startTime: Number(record.start_timestamp),
            endTime: 0,
            result: 0,
            fee: '',
            feeToken: transfer.feeToken,
            targetTxHash: '',
            bridgeDispatchError: '',
          });
          this.latestNonce[index] += 1;
        }

        this.logger.log(
          `save new send record successed ${transfer.chain}, nonce: ${this.latestNonce}, added: ${records.length}`
        );
      }
    } catch (error) {
      this.logger.warn(
          `save new send record failed ${transfer.chain}, ${this.latestNonce}, ${error}`
      );
    }
  }

  async fetchStatus(transfer: BridgeChain, index: number) {
    try {
      const uncheckedRecords = await this.aggregationService.queryHistoryRecords({
        skip: this.skip[index],
        take: this.takeEachTime,
        where: {
          fromChain: transfer.chain,
          bridge: 'cBridge',
          targetTxHash: '',
        },
      }).then((result) => result.records);
      if (uncheckedRecords.length < this.takeEachTime) {
        this.skip[index] = 0;
      } else {
        this.skip[index] += this.takeEachTime;
      }
      for (const record of uncheckedRecords) {
        const transferId = record.id.split('-')[2];
        const response = await axios .post(this.sgnUrl, { transfer_id: transferId.substring(2) }).then((res) => res.data);
        const bridgeError = response.refund_reason;
        const targetTxHash = (response.status == this.statusTransferCompleted) ? response.dst_block_tx_link.split('/').pop() : '';
        await this.aggregationService.updateHistoryRecord({
          where: { id: record.id },
          data: {
            result: response.status,
            targetTxHash: targetTxHash,
            endTime: response.block_delay * transfer.blockTime + record.startTime,
            bridgeDispatchError: bridgeError < this.xferStatus.length ? this.xferStatus[bridgeError] : '',
          },
        });
      }
    } catch (error) {
      this.logger.warn(`fetch cbridge status failed, error ${error}`);
    }
  }
}

