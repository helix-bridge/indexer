import { SubstrateEvent } from '@subql/types';
import { Block, XcmSentEvent, XcmReceivedEvent } from '../types';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const hostAccount = '0x6d6f646C70792f74727372790000000000000000';
const xcmStartTimestamp = 1659888000;
const secondPerDay = 3600 * 24;

// X2
const parachainX2Assets = {
    2000: {
        'key': 'generalKey',
        '0x0080': 'KAR',
        '0x0081': 'xcAUSD',
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

  // it's a ethereum tx, we parse the event of TransferredMultiAssets, it's behind sent event
  public async handleXcmMessageSent() {
    const [messageHash] = JSON.parse(this.data) as [string];
    const now = Math.floor(this.timestamp.getTime() / 1000);
    let nonce: number;
    var transferredMultiAssetsEvent;
    this.event?.extrinsic?.events.find((item, index, events) => {
        if (item.event.index === this.event.event.index) {
            transferredMultiAssetsEvent = events[index+1];
        }
    });
    if (!transferredMultiAssetsEvent) {
        return;
    }
    const [sender, assets, _fee, dest] = JSON.parse(transferredMultiAssetsEvent.event.data.toString());
    // get evm transaction hash
    const evmExecuteEvent = this.event?.extrinsic?.events.find((item) => {
      return item.event.method === 'Executed';
    });
    // filter no evm transactions
    if (!evmExecuteEvent) {
      return;
    }

    // get the evm txhash
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

    const assetId = assets?.[0].id?.concrete?.interior?.x2;
    if (!assetId) {
        return;
    }

    const parachainX2Chain = parachainX2Assets[assetId[0].parachain]
    if (!parachainX2Chain) {
        return;
    }
    const parachainX2Token = parachainX2Chain[assetId[1][parachainX2Chain.key]];

    const event = new XcmSentEvent(messageHash + '-' + index);
    event.sender = u8aToHex(decodeAddress(sender));
    event.recipient = dest.interior?.x2[1]?.accountId32?.id;
    event.amount = assets?.[0].fun?.fungible;
    event.txHash = transaction_hash;
    event.timestamp = now;
    event.token = parachainX2Token;
    event.nonce = nonce;
    event.destChainId = dest.interior?.x2[0]?.parachain;
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

    this.event?.extrinsic?.events.find((item, index, events) => {
        if (item.event.index === this.event.event.index) {
            let feeEvent = events[index-1];
            if (feeEvent?.event.method === 'Issued') {
                const transferEvent = events[index-2];
                const [_feeCurrencyId, _feeAccount, fee] = JSON.parse(feeEvent.event.data.toString());
                const [_currencyId, account, amount] = JSON.parse(transferEvent.event.data.toString());
                totalAmount = BigInt(fee) + BigInt(amount);
                recipient = account;
                recvAmount = BigInt(amount);
            // deposit
            } else {
                feeEvent = events[index-2];
                const transferEvent = events[index-3];
                const [_feeAccount, fee] = JSON.parse(feeEvent.event.data.toString());
                const [account, amount] = JSON.parse(transferEvent.event.data.toString());
                totalAmount = BigInt(fee) + BigInt(amount);
                recipient = account;
                recvAmount = BigInt(amount);
            }
        }
    });
    // filter helix tx
    //let flag = BigInt(amount) % BigInt(1000);
    //if (flag !== helixFlag) {
        //return;
    //}
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
