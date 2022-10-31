import { SubstrateEvent } from '@subql/types';
import { Block, BridgeDispatchEvent, S2SEvent, S2sUnlocked, Transfer } from '../types';
import { AccountHandler } from './account';
import { S2sDailyStatisticsHandler } from './daily';

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

  get timestamp() {
    return this.event.block.timestamp;
  }

  public async save() {
    if (this.section === 'toCrabBacking') {
      await this.handleS2SEvent();
    }

    if (this.section === 'bridgeCrabDispatch') {
      await this.handleBridgeDispatchEvent();
    }

    // darwinia <> darwinia smart chain
    if (this.method === 'Transfer') {
      await this.handleProcessTransferUsingDispatchCall();
    }
  }

  public async handleBridgeDispatchEvent() {
    const [_, [laneId, nonce], result] = JSON.parse(this.data);
    const event = new BridgeDispatchEvent(this.s2sEventId(laneId, nonce));

    event.index = this.index;
    event.method = this.method;
    event.data = this.data;
    event.block = this.simpleBlock();
    event.timestamp = this.timestamp;
    if (this.method === 'MessageDispatched' && result.ok === undefined) {
        event.method = 'MessageDispatched(Err)'
    }

    await event.save();
  }

  public async handleS2SEvent() {
    // data structure: https://github.com/darwinia-network/darwinia-common/blob/master/frame/wormhole/backing/s2s/src/lib.rs
    if (this.method === 'TokenLocked') {
      await this.handleTokenLocked();
    }

    if (this.method === 'TokenLockedConfirmed') {
      await this.handleTokenLockedConfirmed();
    }

    if (this.method == 'TokenUnlocked') {
      await this.handleTokenUnlocked();
    }
  }

  private async handleProcessTransferUsingDispatchCall() {
    const [from, to, amount] = JSON.parse(this.data);
    const sender = AccountHandler.formatAddress(from);
    const recipient = AccountHandler.formatAddress(to);
    const senderIsDvm = AccountHandler.isDvmAddress(sender);
    const recipientIsDvm = AccountHandler.isDvmAddress(recipient);

    if (!senderIsDvm && recipientIsDvm) {
      const recipientDvm = AccountHandler.truncateToDvmAddress(recipient);

      await this.handleTransfer('darwinia', 'darwinia-dvm', sender, recipientDvm, amount);
    } else if (senderIsDvm && !recipientIsDvm) {
      const senderDvm = AccountHandler.truncateToDvmAddress(sender);

      // @see https://crab.subscan.io/extrinsic/11451549-0 治理或 evm 发出的交易可能没有extrinsics
      const executedEvent = this.event.extrinsic?.events.find(
        (item) => item.event.method === 'Executed'
      );

      if (executedEvent) {
        const [_from, _to, txHash] = JSON.parse(executedEvent.event.data.toString());

        await this.handleTransfer(
          'darwinia-dvm',
          'darwinia',
          senderDvm,
          recipient,
          amount * 1e9,
          txHash
        );
      }
    }
  }

  private async handleTransfer(
    fromChain: string,
    toChain: string,
    sender: string,
    recipient: string,
    amount: number,
    txHash?: string
  ) {
    await AccountHandler.ensureAccount(recipient);
    await AccountHandler.updateTransferStatistic(recipient);
    await AccountHandler.ensureAccount(sender);
    await AccountHandler.updateTransferStatistic(sender);

    const transfer = new Transfer(txHash ?? this.extrinsicHash);

    transfer.recipientId = recipient;
    transfer.senderId = sender;

    transfer.section = this.section;
    transfer.method = this.method;
    transfer.amount = BigInt(amount ?? 0);
    transfer.timestamp = this.timestamp;
    transfer.fromChain = fromChain;
    transfer.toChain = toChain;

    const block = this.simpleBlock();

    transfer.block = txHash ? { ...block, extrinsicHash: txHash } : block;

    try {
      await transfer.save();
    } catch (error) {
      logger.warn(error.message);
    }
  }

  private async handleTokenLocked() {
    // [lane_id, message_nonce, token address, sender, recipient, amount]
    const [laneId, nonce, token, from, to, value] = JSON.parse(this.data) as [
      string,
      bigint,
      string | Record<string, any>,
      string,
      string,
      number
    ];
    const event = new S2SEvent(this.s2sEventId(laneId, nonce));
    const sender = AccountHandler.formatAddress(from);
    const recipient = AccountHandler.formatAddress(to);
    const [_specVersion, _weight, _value, fee, _recipient] = this.args;

    event.laneId = laneId;
    event.nonce = nonce;
    event.requestTxHash = this.extrinsicHash;
    event.startTimestamp = this.timestamp;
    event.senderId = sender;
    event.recipient = recipient;
    event.token = typeof token === 'string' ? token : token.native.address;
    event.amount = value.toString();
    event.result = 0;
    event.endTimestamp = null;
    event.responseTxHash = null;
    event.block = this.simpleBlock();
    event.fee = fee;

    await AccountHandler.ensureAccount(sender);
    await event.save();
  }

  private async handleTokenLockedConfirmed() {
    // [lane_id, message_nonce, user, amount, result]
    const [laneId, nonce, from, amount, confirmResult] = JSON.parse(this.data) as [
      string,
      bigint,
      string,
      bigint,
      boolean
    ];
    const sender = AccountHandler.formatAddress(from);
    const event = await S2SEvent.get(this.s2sEventId(laneId, nonce));

    if (event) {
      event.responseTxHash = this.extrinsicHash;
      event.endTimestamp = this.timestamp;
      event.result = confirmResult ? 1 : 2;
      event.block = this.simpleBlock();

      await event.save();

      if (confirmResult) {
        await AccountHandler.updateS2SLockedStatistic(sender, amount);
        // 86400000 = 24 * 60 * 60
        // ms=>s
        const daily = Math.floor(event.startTimestamp.getTime() / 86400000) * 86400;
        await S2sDailyStatisticsHandler.updateS2sDailyVolume(daily.toString(), amount);
      }
    }
  }

  private async handleTokenUnlocked() {
    // [lane_id, message_nonce, token address, recipient, amount]
    const [laneId, nonce, token, to, amount] = JSON.parse(this.data) as [
      string,
      bigint,
      string | Record<string, any>,
      string,
      number
    ];
    const unlockedEvent = new S2sUnlocked(this.s2sEventId(laneId, nonce));
    const recipient = AccountHandler.formatAddress(to);

    unlockedEvent.laneId = laneId;
    unlockedEvent.nonce = nonce;
    unlockedEvent.txHash = this.extrinsicHash;
    unlockedEvent.timestamp = this.timestamp;
    unlockedEvent.recipient = recipient;
    unlockedEvent.token = typeof token === 'string' ? token : token.native.address;
    unlockedEvent.amount = amount.toString();
    unlockedEvent.block = this.simpleBlock();

    await unlockedEvent.save();
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
