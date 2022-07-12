import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AggregationService } from '../aggregation/aggregation.service';
import { BridgeChain } from '../base/BridgeTransferService';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';
import { GetTransferStatusRequest } from 'cbridge-typescript-client/ts-proto/gateway/gateway_pb';
import { WebClient } from 'cbridge-typescript-client/ts-proto/gateway/GatewayServiceClientPb';

@Injectable()
export class CbridgeService implements OnModuleInit {
  private readonly logger = new Logger('cBridge');
  protected isSyncingHistory = new Array(this.transferService.transfers.length).fill(false);
  protected fetchSendDataInterval = 10000;
  private readonly latestNonce = new Array(this.transferService.transfers.length).fill(-1);

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

      const query = `query { transferRecords(first: 10, orderBy: start_timestamp, orderDirection: asc, skip: 0) { id, sender, receiver, token, amount, dst_chainid, request_transaction, start_timestamp } }`;
      const records = await axios
        .post(transfer.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.transferRecords);

      if (records && records.length > 0) {
        for (const record of records) {
          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, record.id),
            fromChain: transfer.chain,
            toChain: '',
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
            feeToken: '',
            targetTxHash: '',
            bridgeDispatchError: '',
          });
        }

        this.logger.log(
          `save new send record successed ${transfer.chain}, ${this.latestNonce}, added: ${records.length}`
        );
      }
    } catch (error) {
      this.logger.warn(
          `save new send record failed ${transfer.chain}, ${this.latestNonce}, ${error}`
      );
    }
  }

  async fetchStatus(transfer: BridgeChain, index: number) {
    const uncheckedRecords = await this.aggregationService
      .queryHistoryRecords({
        take: 10,
        where: {
            fromChain: transfer.chain,
            bridge: 'cBridge',
            targetTxHash: '',
        },
      })
      .then((result) =>
        result.records
      );
    const request = new GetTransferStatusRequest();
    const client = new WebClient(`https://cbridge-prod2.celer.network`, null, null);
      /*
    for (const record of uncheckedRecords) {
        const transferId = record.id.split('-')[2];
        console.log(transferId);
        request.setTransferId(transferId.substring(2));
        const response = await client.getTransferStatus(request, null);
        console.log(response);
    }
    */
  }
}

