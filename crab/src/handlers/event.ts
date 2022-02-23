import { SubstrateEvent } from '@subql/types';
import { Block, BridgeDispatchEvent, Transfer } from '../types';
import { AccountHandler } from './account';
import { TokenHandler } from './token';

enum FeePosition {
  'DepositRing',
  'Deposit',
}


export class EventHandler {
  private event: SubstrateEvent;

  constructor(event: SubstrateEvent) {
    this.event = event;
  }

  get index() {
    return this.event.idx;
  }

  get blockNumber() {
    return this.event.block.block.header.number.toNumber();
  }

  get blockHash() {
    return this.event.block.block.hash.toString();
  }

  get events() {
    return this.event.block.events;
  }

  get section() {
    return this.event.event.section;
  }

  get method() {
    return this.event.event.method;
  }

  get data() {
    return this.event.event.data.toString();
  }

  get extrinsicHash() {
    const i = this.event?.extrinsic?.extrinsic?.hash?.toString();

    return i === 'null' ? undefined : i;
  }

  get eventHash() {
    return this.event.event.hash.toString();
  }

  get timestamp() {
    return this.event.block.timestamp;
  }

  public async save() {
    if (this.section === 'bridgeDarwiniaDispatch') {
      await this.handleBridgeDispatchEvent();
    }
    
    if (this.method === 'Transfer') {
      await this.handleTransfer();
    }
  }

  public async handleBridgeDispatchEvent() {
    const [_, [laneId, nonce]] = JSON.parse(this.data) as [string, [string, bigint]];
    const event = new BridgeDispatchEvent(this.s2sEventId(laneId, nonce));

    event.index = this.index;
    event.method = this.method;
    event.data = this.data;
    event.block = this.simpleBlock();

    await event.save();
  }

  private async handleTransfer() { 
    const [from, to, amount] = JSON.parse(this.data);

    await AccountHandler.ensureAccount(to);
    await AccountHandler.updateTransferStatistic(to);
    await AccountHandler.ensureAccount(from);
    await AccountHandler.updateTransferStatistic(from);
    await TokenHandler.ensureToken(this.section);

    const transfer = new Transfer(this.eventHash);

    transfer.toId = to;
    transfer.fromId = from;
    transfer.tokenId = this.section;
    transfer.amount = BigInt(amount);
    transfer.timestamp = this.timestamp;
    transfer.block = this.simpleBlock();
    transfer.fee = this.events.reduce((total, cur) => {
      const method = cur.event.method;
      let fee = BigInt(0);

      if ([FeePosition[0], FeePosition[1]].includes(method)) {
        try {
          fee = BigInt(
            parseInt(JSON.parse(cur.event.data.toString())[FeePosition[cur.event.method]])
          );
        } catch (err) {}

        return total + BigInt(fee);
      }

      return total;
    }, BigInt(0));

    try {
      await transfer.save();
    } catch (error) {
      console.log(error.message);
    }
  }

  private simpleBlock(): Block {
    return {
      blockHash: this.blockHash,
      number: this.blockNumber,
      specVersion: this.event.block.specVersion,
      extrinsicHash: this.extrinsicHash,
    };
  }

  private s2sEventId(laneId: string, nonce: bigint): string {
    return `${laneId}0x${nonce.toString(16)}`;
  }
}
