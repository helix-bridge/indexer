import { SubstrateEvent } from '@subql/types';
import { Block, XcmSentEvent, XcmReceivedEvent } from '../types';
import { AccountHandler } from './account';

const thisChainId = '2004';
const helixCallMethod = '0x5200';
const helixFlag = BigInt(204);

// X1
const parachainX1Assets = {
  2004: 'PHA',
  2012: 'CSM',
  2007: 'SDN',
};

// X2
const parachainX2Assets = {
  2000: {
    key: 'generalKey',
    '0x0080': 'KAR',
  },
  2023: {
    key: 'palletInstance',
    10: 'MOVR',
  },
};

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

  private xcmSendMessageId(destChainId: string): string {
    const [messageHash] = JSON.parse(this.data) as [string];
    return thisChainId + '-' + destChainId + '-' + messageHash;
  }

  private xcmRecvMessageId(sourceChainId: string): string {
    const [messageHash] = JSON.parse(this.data) as [string];
    return sourceChainId + '-' + thisChainId + '-' + messageHash;
  }

  private xcmRecvParachainId(): string {
    const extrinsicArgs = this.event.extrinsic?.extrinsic?.args?.toString();

    if (!extrinsicArgs) {
      return;
    }
    const chainIds = JSON.parse(extrinsicArgs)?.horizontalMessages;
    const sourceChainId = Object.keys(chainIds).find((id) => chainIds[id].length > 0);
    return sourceChainId;
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
    const now = Math.floor(this.timestamp.getTime() / 1000);
    const method = JSON.parse(this.event.extrinsic.extrinsic.method.toString());
    // not helix called method
    if (method.callIndex !== helixCallMethod) {
      return;
    }
    const assets = method.args.asset;
    const dest = method.args.dest;

    const destChain = dest?.interior?.x2?.[0].parachain;
    const amount = assets?.fun?.fungible;
    // filter helix tx
    const flag = BigInt(amount) % BigInt(1000);
    if (!destChain || flag !== helixFlag) {
      return;
    }
    //asset
    let index = 0;
    const messageId = this.xcmSendMessageId(destChain);
    while (true) {
      const event = await XcmSentEvent.get(messageId + '-' + index);
      if (!event) {
        break;
      }
      // if the same tx hash, don't save again
      if (event.txHash === this.extrinsicHash) {
        return;
      }
      index++;
    }

    const event = new XcmSentEvent(messageId + '-' + index);
    event.destChainId = destChain;
    event.amount = BigInt(amount).toString();
    const asset = assets?.id?.concrete?.interior;
    // local asset
    if (asset) {
      if (asset.here !== undefined) {
        event.token = 'PHA';
      } else {
        // X1
        event.token = this.event.extrinsic.extrinsic.method.toString();
        const parachainNativeToken = parachainX1Assets[asset.x1?.parachain];
        if (parachainNativeToken) {
          event.token = parachainNativeToken;
        } else {
          // X2
          event.token = asset;
          const parachainX2Chain = parachainX2Assets[asset.x2?.[0].parachain];
          if (parachainX2Chain) {
            const parachainX2Token = parachainX2Chain[asset.x2?.[1][parachainX2Chain.key]];
            if (parachainX2Token) {
              event.token = parachainX2Token;
            }
          }
        }
      }
    }

    // recipient
    let recipient = dest?.interior?.x2?.[1].accountId32?.id;
    if (!recipient) {
      recipient = dest?.interior?.x2?.[1].accountKey20?.key;
    }
    event.recipient = recipient;
    event.sender = this.event.extrinsic.extrinsic.signer.toHex();
    event.txHash = this.extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
    await event.save();
  }

  // save all the faild xcm message
  public async handleXcmMessageReceivedFailed() {
    const sourceChainId = this.xcmRecvParachainId();
    if (!sourceChainId) {
      return;
    }

    const messageId = this.xcmRecvMessageId(sourceChainId);
    const extrinsicHash = this.blockNumber.toString() + '-' + this.extrinsicIndex;
    let index = 0;
    while (true) {
      const event = await XcmReceivedEvent.get(messageId + '-' + index);
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
    const event = new XcmReceivedEvent(messageId + '-' + index);
    event.txHash = extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
    await event.save();
  }

  public async handleXcmMessageReceivedSuccessed() {
    const sourceChainId = this.xcmRecvParachainId();
    if (!sourceChainId) {
      return;
    }

    const messageId = this.xcmRecvMessageId(sourceChainId);
    const now = Math.floor(this.timestamp.getTime() / 1000);
    let totalAmount = BigInt(0);
    let recvAmount = BigInt(0);
    let recipient: string;
    let hostAccount: string;

    this.event?.extrinsic?.events.find((item, index, events) => {
      if (item.event.index === this.event.event.index) {
        for (let searchIndex = index - 2; searchIndex >= 0; searchIndex--) {
          const maybeBalanceDeposit = events[searchIndex];
          // another xcmp message
          if (maybeBalanceDeposit.event.section === 'xcmpqueue') {
            break;
          }
          if (
            (maybeBalanceDeposit.event.section === 'balances' &&
              maybeBalanceDeposit.event.method === 'Deposit') ||
            (maybeBalanceDeposit.event.section === 'assets' &&
              maybeBalanceDeposit.event.method === 'Issued')
          ) {
            if (totalAmount === BigInt(0)) {
              const feeInfos = JSON.parse(maybeBalanceDeposit.event.data.toString());
              if (feeInfos.length < 2) {
                break;
              }
              const [account, fee] = feeInfos.slice(-2);
              totalAmount += BigInt(fee);
              hostAccount = AccountHandler.formatAddress(account);
            } else {
              const transferInfos = JSON.parse(maybeBalanceDeposit.event.data.toString());
              if (transferInfos.length < 2) {
                break;
              }
              const [account, amount] = transferInfos.slice(-2);
              totalAmount += BigInt(amount);
              recipient = AccountHandler.formatAddress(account);
              recvAmount = BigInt(amount);
              break;
            }
          }
        }
      }
    });
    const flag = totalAmount % BigInt(1000);
    if (flag !== helixFlag) {
      return;
    }
    if (!recipient) {
      // special treatment, for KAR, can't calculate fee
      recvAmount = totalAmount;
      recipient = hostAccount;
    }

    const extrinsicHash = this.blockNumber.toString() + '-' + this.extrinsicIndex;
    let index = 0;
    while (true) {
      const event = await XcmReceivedEvent.get(messageId + '-' + index);
      if (!event) {
        break;
      }
      // if the same tx hash, don't save again
      if (event.txHash === extrinsicHash) {
        return;
      }
      index++;
    }
    const event = new XcmReceivedEvent(messageId + '-' + index);
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
