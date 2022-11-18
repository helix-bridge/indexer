import { SubstrateEvent } from '@subql/types';
import { Block, XcmSentEvent, XcmReceivedEvent } from '../types';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const hostAccount = 'qmmNufxeWaAVLMER2va1v4w2HbuU683c5gGtuxQG4fKTZSb';
const xcmStartTimestamp = 1659888000;
const secondPerDay = 3600 * 24;

// X1
const parachainX1Assets = {
    2004: 'PHA',
    2012: 'CSM',
}

// X2
const parachainX2Assets = {
    2000: {
        'key': 'generalKey',
        '0x0080': 'KAR',
    },
    2023: {
        'key': 'palletInstance',
        10: 'MOVR',
    },
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
        await this.handleXcmMessageReceivedSuccessed();
      } else if (this.method === 'Fail') {
        await this.handleXcmMessageReceivedFailed();
      }
    }
  }

  public async handleXcmMessageSent() {
    const [messageHash] = JSON.parse(this.data) as [string];
    const now = Math.floor(this.timestamp.getTime() / 1000);
    const args = '[' + this.event.extrinsic.extrinsic.args.toString() + ']';
    const [dest, beneficiary, assets, fee] = JSON.parse(args);

    let index = 0;
    while (true) {
      const event = await XcmSentEvent.get(messageHash + '-' + index);
      if (!event) {
        break;
      }
      // if the same tx hash, don't save again
      if (event.txHash === this.extrinsicHash) {
        return;
      }
      index++;
    }

    const destChain = dest.v1?.interior?.x1?.parachain;
    const amount = assets.v1?.[0].fun?.fungible;
    // filter helix tx
    let nonce = amount % 1e13;
    if (nonce < xcmStartTimestamp || nonce > now + secondPerDay) {
        return;
    }
    //asset
    const event = new XcmSentEvent(messageHash + '-' + index);
    event.destChainId = destChain;
    event.amount = amount;
    const asset = assets.v1?.[0].id?.concrete?.interior;
    // local asset
    if (asset) {
        if (asset.here !== undefined) {
            event.token = 'SDN';
        } else {
            // X1
            const parachainNativeToken = parachainX1Assets[asset.x1?.parachain];
            if (parachainNativeToken) {
                event.token = parachainNativeToken
            } else {
                // X2
                event.token = asset;
                const parachainX2Chain = parachainX2Assets[asset.x2?.[0].parachain]
                if (parachainX2Chain) {
                    const parachainX2Token = parachainX2Chain[asset.x2?.[1][parachainX2Chain.key]]
                    if (parachainX2Token) {
                        event.token = parachainX2Token
                    }
                }
            }
        }
    }

    // recipient
    const recipient = beneficiary.v1?.interior?.x1?.accountId32?.id;
    event.recipient = recipient;

    event.sender = this.event.extrinsic.extrinsic.signer.toHex();
    event.txHash = this.extrinsicHash;
    event.timestamp = now;
    //event.token = this.event.extrinsic.extrinsic.args.toString();
    event.nonce = nonce;
    //event.destChainId = dest.v1?.interior?.x2[0].parachain;
    event.block = this.simpleBlock();
    await event.save();
  }

  // save all the faild xcm message
  public async handleXcmMessageReceivedFailed() {
    const [messageHash] = JSON.parse(this.data) as [string];
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
    const now = Math.floor(this.timestamp.getTime() / 1000);
    const event = new XcmReceivedEvent(messageHash + '-' + index);
    event.txHash = extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
    await event.save();
  }

  public async handleXcmMessageReceivedSuccessed() {
    const [messageHash] = JSON.parse(this.data) as [string];
    const now = Math.floor(this.timestamp.getTime() / 1000);
    let totalAmount = BigInt(0);
    let recvAmount = BigInt(0);
    let recipient: string;

    this.event?.extrinsic?.events.forEach((item, _index) => {
      if (item.event.method === 'Deposited') {
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
