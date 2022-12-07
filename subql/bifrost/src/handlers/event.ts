import { SubstrateEvent } from '@subql/types';
import { Block, XcmSentEvent, XcmReceivedEvent } from '../types';
import { AccountHandler } from './account';

const thisChainId = '2001';
const helixFlag = BigInt(204);

// X1
const parachainX1Assets = {
    10: 'MOVR',
    2007: 'SDN',
    2004: 'PHA',
}

// X2
const parachainX2Assets = {
    2000: {
        'key': 'generalKey',
        '0x0080': 'KAR',
        '0x0081': 'KUSD',
    },
    2001: {
        'key': 'generalKey',
        '0x0001': 'BNC',
        '0x0207': 'ZLK',
    },
    2023: {
        'key': 'palletInstance',
        10: 'MOVR',
    },
    2105: {
        'key': 'palletInstance',
        5: 'CRAB',
    },
    2092: {
        'key': 'generalKey',
        '0x000b': 'KBTC',
        '0x000c': 'KINT',
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
      const sourceChainId = Object.keys(chainIds).find(id => chainIds[id].length > 0);
      return sourceChainId;
  }

  public async save() {
    if (this.section === 'xTokens') {
      if (this.method === 'TransferredMultiAssets') {
        await this.handleTransferredMultiAssets();
      }
    } else if (this.section === 'xcmpQueue') {
      if (this.method === 'Success') {
        await this.handleXcmMessageReceivedSuccessed();
      } else if (this.method === 'Fail') {
        await this.handleXcmMessageReceivedFailed();
      }
    }
  }

  // it's a ethereum tx, we parse the event of TransferredMultiAssets, it's behind sent event
  public async handleTransferredMultiAssets() {
    const now = Math.floor(this.timestamp.getTime() / 1000);
    let nonce: number;
    const [sender, assets, _fee, dest] = JSON.parse(this.event.event.data.toString());
    // maybe x2 or x4 format
    let destx2 = dest?.interior?.x2;
    let destx4 = dest?.interior?.x4;
    let destChainId: string;
    let destAccount: string;
    if (destx2) {
        destChainId = destx2[0].parachain
        destAccount = destx2[1].accountId32?.id;
        if (!destAccount) {
            destAccount = destx2[1].accountKey20?.key;
        }
    } else if (destx4) {
        destChainId = destx4[0].parachain;
        destAccount = destx4[3].generalKey;
    }
    // filter no evm transactions
    if (!destChainId || !destAccount) {
      return;
    }

    let index = 0;
    const messageId = this.xcmSendMessageId(destChainId);
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

    const assetId = assets?.[0].id?.concrete?.interior;
    if (!assetId) {
        return;
    }

    var token: string;
    token = assets?.[0].id?.concrete.toString();
    //local
    if (assetId.here !== undefined) {
        // TODO
        if (assets?.[0].id?.concrete?.parents === 1) {
            token = 'KSM';
        }
    } else if (assetId.x1) {
        if (assetId.x1.palletInstance) {
            token = parachainX1Assets[assetId.x1.palletInstance];
        } else {
            token = parachainX1Assets[assetId.x1.parachain];
        }
    } else if (assetId.x2) {
        const parachainX2Chain = parachainX2Assets[assetId.x2[0].parachain]
        token = parachainX2Chain?.[assetId.x2[1][parachainX2Chain?.key]];
    }

    if (!token) {
        return;
    }

    const amount = assets?.[0].fun?.fungible;
    // filter helix tx
    let flag = BigInt(amount) % BigInt(1000);
    if (flag !== helixFlag) {
        return;
    }

    const event = new XcmSentEvent(messageId + '-' + index);
    event.sender = AccountHandler.formatAddress(sender);
    event.recipient = destAccount;
    event.amount = BigInt(amount).toString();
    event.txHash = this.extrinsicHash;
    event.timestamp = now;
    event.token = token;
    event.nonce = nonce;
    event.destChainId = Number(destChainId);
    event.block = this.simpleBlock();
    await event.save();
  }

  // save all the faild xcm message
  public async handleXcmMessageReceivedFailed() {
    const sourceChainId =  this.xcmRecvParachainId();
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
    const sourceChainId =  this.xcmRecvParachainId();
    if (!sourceChainId) {
        return;
    }

    const messageId = this.xcmRecvMessageId(sourceChainId);
    const now = Math.floor(this.timestamp.getTime() / 1000);
    let totalAmount = BigInt(0);
    let recvAmount = BigInt(0);
    let recipient: string;

    this.event?.extrinsic?.events.find((item, index, events) => {
        if (item.event.index === this.event.event.index) {
            for (var searchIndex = index-2; searchIndex >= 0; searchIndex--) {
                const maybeBalanceDeposit = events[searchIndex];
                // another xcmp message
                if (maybeBalanceDeposit.event.section === 'xcmpqueue') {
                    break;
                }
                if (maybeBalanceDeposit.event.section === 'balances' && maybeBalanceDeposit.event.method === 'Deposit') {
                    if (totalAmount === BigInt(0) ) {
                        const feeInfos = JSON.parse(maybeBalanceDeposit.event.data.toString());
                        if (feeInfos.length < 2) {
                            break;
                        }
                        const [account, fee] = feeInfos.slice(-2);
                        totalAmount += BigInt(fee);
                        //hostAccount = AccountHandler.formatAddress(account); 
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
    // filter helix tx
    let flag = totalAmount % BigInt(1000);
    if (flag !== helixFlag) {
        return;
    }
    if (!recipient) {
      return;
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
