import { SubstrateEvent } from '@subql/types';
import { Block, XcmSentEvent, XcmReceivedEvent } from '../types';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const hostAccount = '0x6d6f646C70792f74727372790000000000000000';
const xcmStartTimestamp = 1659888000;
const secondPerDay = 3600 * 24;

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

  get args() {
    return this.event.extrinsic.extrinsic.args.toString().split(',');
  }

  get extrinsicHash() {
    const i = this.event?.extrinsic?.extrinsic?.hash?.toString();

    return i === 'null' ? undefined : i;
  }

  get extrinsicIndex() {
    return this.event?.extrinsic?.idx?.toString();
  }

  get timestamp() {
    return this.event.block.timestamp;
  }

  public async save() {
    if (this.section === 'xcmpQueue') {
      if (this.method === 'XcmpMessageSent') {
        await this.handleXcmMessageSent();
      } else if (this.method === 'Success') {
        // TODO Fail Event
        await this.handleXcmMessageReceived();
      }
    }
  }

  public async handleXcmMessageSent() {
    const [messageHash] = JSON.parse(this.data) as [string];
    const now = Math.floor(this.timestamp.getTime() / 1000);
    let nonce: number;
    const balanceTransferEvent = this.event?.extrinsic?.events.find((item) => {
      // tokens (Withdrawn)
      if (item.event.method === 'Burned') {
        const [_assetId, _sender, amount] = JSON.parse(item.event.data.toString());
        nonce = amount % 1e18;
        // allow some error for the timestamp, ignore timezone
        return nonce > xcmStartTimestamp && nonce <= now + secondPerDay;
      }
      return false;
    });
    if (!balanceTransferEvent) {
      return;
    }
    const [_1, sender, amount] = JSON.parse(balanceTransferEvent.event.data.toString());
    const xtokenEvent = this.event?.extrinsic?.events.find((item) => {
      return item.event.method === 'TransferredMultiAssets';
    });
    if (!xtokenEvent) {
      return;
    }
    const [_sender, _2, _3, dest] = JSON.parse(xtokenEvent.event.data.toString());
    // get evm transaction hash
    const evmExecuteEvent = this.event?.extrinsic?.events.find((item) => {
      return item.event.method === 'Executed';
    });
    // filter no evm transactions
    if (!evmExecuteEvent) {
      return;
    }
    const [_from, _to, transaction_hash, _exit_reason] = JSON.parse(
      evmExecuteEvent.event.data.toString()
    );

    let index = 0;
    while (true) {
      const event = await XcmSentEvent.get(messageHash + '-' + index);
      if (!event) {
        break;
      }
      // if the same tx hash, don't save again
      if (event.txHash === transaction_hash) {
        return;
      }
      index++;
    }

    const event = new XcmSentEvent(messageHash + '-' + index);
    event.sender = u8aToHex(decodeAddress(sender));
    event.recipient = dest.interior?.x2[1]?.accountId32?.id;
    event.amount = BigInt(amount).toString();
    event.txHash = transaction_hash;
    event.timestamp = now;
    event.token = 'CRAB';
    event.nonce = nonce;
    event.destChainId = dest.interior?.x2[0]?.parachain;
    event.block = this.simpleBlock();
    await event.save();
  }

  public async handleXcmMessageReceived() {
    const [messageHash] = JSON.parse(this.data) as [string];
    const now = Math.floor(this.timestamp.getTime() / 1000);
    let totalAmount = BigInt(0);
    let recvAmount = BigInt(0);
    let recipient: string;

    this.event?.extrinsic?.events.forEach((item, _index) => {
      if (item.event.method === 'Issued') {
        const [_currencyId, account, amount] = JSON.parse(item.event.data.toString());
        totalAmount = totalAmount + BigInt(amount);
        if (account !== hostAccount) {
          recipient = account;
          recvAmount = BigInt(amount);
        }
      }
    });
    const nonce = totalAmount % BigInt(1e18);
    // allow some error for the timestamp, ignore timezone
    if (nonce < xcmStartTimestamp || nonce > now + secondPerDay) {
      return;
    }
    if (!recipient) {
      return;
    }

    const extrinsicHash = this.blockNumber.toString() + '-' + this.extrinsicIndex;
    let index = 0;
    while (true) {
      const event = await XcmReceivedEvent.get(messageHash + '-' + index);
      if (!event) {
        break;
      }
      // if the same tx hash, don't save again
      if (event.txHash === extrinsicHash) {
        return;
      }
      index++;
    }
    const event = new XcmReceivedEvent(messageHash + '-' + index);
    event.recipient = recipient;
    event.amount = recvAmount.toString();
    event.txHash = extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
    await event.save();
  }

  private simpleBlock(): Block {
    return {
      blockHash: this.blockHash,
      number: this.blockNumber,
      specVersion: this.event.block.specVersion,
      extrinsicHash: this.extrinsicHash,
    };
  }
}
