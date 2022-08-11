import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { last } from 'lodash';
import { AggregationService } from '../aggregation/aggregation.service';
import { PartnerT2 } from '../base/TransferServiceT2';
import { RecordStatus } from '../base/RecordsService';
import { HistoryRecord } from '../graphql';
import { TasksService } from '../tasks/tasks.service';
import { TransferService } from './transfer.service';

export enum CBridgeRecordStatus {
  unknown, // 0
  submitting, // 0 dispatchError: submitting
  failed, // drop 4 理论上不应该出现
  waitingForSgnConfirmation, // 0 dispatchError
  waitingForFundRelease, // 0 dispatchError
  completed, // 3
  toBeRefunded, // 1
  requestingRefund, // 1 dispatchError
  refundToBeConfirmed, // 0
  confirmingYourRefund, // 0
  refunded, // 4
}

/**
 * explain the reason for CBridgeRecordStatus.toBeRefunded
 * @see https://cbridge-docs.celer.network/developer/api-reference/gateway-gettransferstatus
 */
export enum XferStatus {
  unknown,
  okToRelay,
  success,
  badLiquidity,
  badSlippage,
  badToken,
  refundRequested,
  refundDone,
  badXferDisabled,
  badDestChain,
}

@Injectable()
export class CbridgeService implements OnModuleInit {
  private readonly logger = new Logger('cBridge');
  protected isSyncingHistory = new Array(this.transferService.transfers.length).fill(false);
  protected fetchSendDataInterval = 30000;
  private readonly latestNonce = new Array(this.transferService.transfers.length).fill(-1);

  private readonly takeEachTime = 3;
  private skip = new Array(this.transferService.transfers.length).fill(0);

  private readonly sgnUrl = this.configService.get<string>('CBRIDGE_SGN_URL');

  constructor(
    public configService: ConfigService,
    private aggregationService: AggregationService,
    private taskService: TasksService,
    private transferService: TransferService
  ) {}

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
          await this.fetchRecords(item, index);
          await this.fetchStatus(item, index);
          this.isSyncingHistory[index] = false;
        }
      );
    });
  }

  protected genID(transfer: PartnerT2, toChainId: string, transferId: string): string {
    return `${transfer.chain.split('-')[0]}-${toChainId}-cbridge-${transferId}`;
  }

  private getDestChain(id: number): PartnerT2 | null {
    return this.transferService.transfers.find((transfer) => transfer.chainId === id) ?? null;
  }

  async fetchRecords(transfer: PartnerT2, index: number) {
    // the nonce of cBridge message is not increased
    try {
      if (this.latestNonce[index] === -1) {
        const firstRecord = await this.aggregationService.queryHistoryRecordFirst({
          fromChain: transfer.chain,
          bridge: 'cBridge-' + transfer.chain,
        });
        this.latestNonce[index] = firstRecord ? Number(firstRecord.nonce) : 0;
      }

      const query = `query { transferRecords(first: 10, orderBy: start_timestamp, orderDirection: asc, skip: ${this.latestNonce[index]}) { id, sender, receiver, token, amount, dst_chainid, request_transaction, start_timestamp, nonce } }`;
      const records = await axios
        .post(transfer.url, {
          query: query,
          variables: null,
        })
        .then((res) => res.data?.data?.transferRecords);

      if (records && records.length > 0) {
        for (const record of records) {
          const toChain = this.getDestChain(Number(record.dst_chainid));

          if (toChain === null) {
            this.latestNonce[index] += 1;
            continue;
          }

          await this.aggregationService.createHistoryRecord({
            id: this.genID(transfer, toChain.chainId.toString(), record.id),
            fromChain: transfer.chain,
            toChain: toChain.chain,
            bridge: 'cBridge-' + transfer.chain,
            messageNonce: record.nonce,
            nonce: this.latestNonce[index] + 1,
            requestTxHash: record.request_transaction,
            sender: record.sender,
            recipient: record.receiver,
            token: transfer.token,
            sendAmount: record.amount,
            recvAmount: '0',
            startTime: Number(record.start_timestamp),
            endTime: 0,
            result: 0,
            fee: '',
            feeToken: transfer.feeToken,
            responseTxHash: '',
            reason: '',
          });
          this.latestNonce[index] += 1;
        }

        this.logger.log(
          `save new send record succeeded ${transfer.chain}, nonce: ${this.latestNonce}, added: ${records.length}`
        );
      }
    } catch (error) {
      this.logger.warn(
        `save new send record failed ${transfer.chain}, ${this.latestNonce}, ${error}`
      );
    }
  }

  async queryRelay(transfer: PartnerT2, srcChainId: string, srcTransferId: string) {
    const query = `query { relayRecords(first: 1, where: { src_chainid: "${srcChainId}", src_transferid:"${srcTransferId}"}) { id, amount, timestamp, transaction_hash }}`;
    return await axios
      .post(transfer.url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.relayRecords);
  }

  async queryTransfer(transfer: PartnerT2, srcTransferId: string) {
    const query = `query { transferRecord(id: "${srcTransferId}") {withdraw_id, withdraw_timestamp, withdraw_transaction}}`;

    return await axios
      .post(transfer.url, {
        query: query,
        variables: null,
      })
      .then((res) => res.data?.data?.transferRecord);
  }

  async fetchStatus(transfer: PartnerT2, index: number) {
    try {
      const uncheckedRecords = await this.aggregationService
        .queryHistoryRecords({
          skip: this.skip[index],
          take: this.takeEachTime,
          where: {
            fromChain: transfer.chain,
            bridge: 'cBridge-' + transfer.chain,
            responseTxHash: '',
          },
        })
        .then((result) => result.records);

      if (uncheckedRecords.length < this.takeEachTime) {
        this.skip[index] = 0;
      } else {
        this.skip[index] += this.takeEachTime;
      }

      for (const record of uncheckedRecords) {
        const recordSplitted = record.id.split('-');
        const transferId = last(recordSplitted);
        const dstChainId = recordSplitted[1];

        const response = await axios
          .post(this.sgnUrl, { transfer_id: transferId.substring(2) })
          .then((res) => res.data);

        const refundReason = response.refund_reason;
        const { result, reason } = this.toRecordStatus(response.status);

        const updateData = {
          result,
          responseTxHash: '',
          endTime: 0,
          fee: '',
          reason: record.reason,
          recvAmount: '0',
        };

        if (response.status !== CBridgeRecordStatus.refunded) {
          updateData.reason = reason;
        }

        if (response.status === CBridgeRecordStatus.toBeRefunded) {
          updateData.reason = XferStatus[refundReason];
        }

        if (response.status === CBridgeRecordStatus.completed) {
          const dstChain = this.getDestChain(Number(dstChainId));

          if (dstChain === null) {
            continue;
          }

          const relayInfo = await this.queryRelay(
            dstChain,
            transfer.chainId.toString(),
            transferId
          );

          if (relayInfo.length === 0) {
            continue;
          }

          const firstRelay = relayInfo[0];

          updateData.responseTxHash = firstRelay.transaction_hash;
          updateData.endTime = Number(firstRelay.timestamp);
          updateData.recvAmount = firstRelay.amount;

          const sendAmount = global.BigInt(record.sendAmount);
          const recvAmount = global.BigInt(firstRelay.amount);

          if (transfer.feeDecimals > dstChain.feeDecimals) {
            updateData.fee = (
              sendAmount -
              recvAmount * global.BigInt(transfer.feeDecimals / dstChain.feeDecimals)
            ).toString();
          } else {
            updateData.fee = (
              sendAmount -
              recvAmount / global.BigInt(dstChain.feeDecimals / transfer.feeDecimals)
            ).toString();
          }
        } else if (response.status === CBridgeRecordStatus.refunded) {
          const withdrawInfo = await this.queryTransfer(transfer, transferId);

          if (withdrawInfo) {
            updateData.responseTxHash = withdrawInfo.withdraw_transaction;
            updateData.endTime = Number(withdrawInfo.withdraw_timestamp);
            updateData.fee = '0';
            updateData.recvAmount = record.sendAmount;
          }
        }

        await this.aggregationService.updateHistoryRecord({
          where: { id: record.id },
          data: updateData,
        });
      }
    } catch (error) {
      this.logger.warn(`fetch cbridge status failed, error ${error}`);
    }
  }

  private toRecordStatus(status: CBridgeRecordStatus): Pick<HistoryRecord, 'result' | 'reason'> {
    switch (status) {
      case CBridgeRecordStatus.unknown:
        return { result: RecordStatus.pending, reason: '' };
      case CBridgeRecordStatus.submitting:
        return { result: RecordStatus.pending, reason: CBridgeRecordStatus[1] };
      case CBridgeRecordStatus.failed:
        return { result: RecordStatus.refunded, reason: CBridgeRecordStatus[2] };
      case CBridgeRecordStatus.waitingForSgnConfirmation:
        return { result: RecordStatus.pending, reason: CBridgeRecordStatus[3] };
      case CBridgeRecordStatus.waitingForFundRelease:
        return { result: RecordStatus.pending, reason: CBridgeRecordStatus[4] };
      case CBridgeRecordStatus.completed:
        return { result: RecordStatus.success, reason: '' };
      case CBridgeRecordStatus.toBeRefunded:
        return { result: RecordStatus.pendingToRefund, reason: CBridgeRecordStatus[6] };
      case CBridgeRecordStatus.requestingRefund:
        return { result: RecordStatus.pendingToRefund, reason: CBridgeRecordStatus[7] };
      case CBridgeRecordStatus.refundToBeConfirmed:
        return { result: RecordStatus.pendingToRefund, reason: CBridgeRecordStatus[8] };
      case CBridgeRecordStatus.confirmingYourRefund:
        return { result: RecordStatus.pending, reason: CBridgeRecordStatus[9] };
      case CBridgeRecordStatus.refunded:
        return { result: RecordStatus.refunded, reason: 'refunded' };
      default:
        return { result: RecordStatus.pending, reason: 'unknown status' };
    }
  }
}
