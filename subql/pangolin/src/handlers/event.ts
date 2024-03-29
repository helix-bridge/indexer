/* eslint-disable @typescript-eslint/no-unused-vars */
import { SubstrateEvent } from '@subql/types';
import { Block, BridgeDispatchEvent, S2SEvent, Transfer } from '../types';
import { AccountHandler } from './account';

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
    if (
      this.section === 'bridgePangoroDispatch' ||
      this.section === 'bridgePangolinParachainDispatch'
    ) {
      await this.handleBridgeDispatchEvent();
    }

    if (this.method === 'DVMTransfer' && this.section === 'ethereum') {
      await this.handleDvmToSubstrateOldVersion();
    }

    if (this.method === 'Transfer') {
      await this.handleProcessTransferUsingDispatchCall();
    }

    if (this.method === 'TokenLocked') {
      await this.handleTokenLocked();
    }

    if (this.method === 'TokenLockedConfirmed') {
      await this.handleTokenLockedConfirmed();
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
      event.method = 'MessageDispatched(Err)';
    }

    // the call is message_call, and reverted
    if (this.method === 'MessageDispatched') {
      if (this.index > 1) {
        const maybeEthereumExecuteEvent = this.event?.extrinsic?.events[this.index - 2];
        if (
          maybeEthereumExecuteEvent &&
          maybeEthereumExecuteEvent.event.method === 'Executed' &&
          maybeEthereumExecuteEvent.event.section === 'ethereum'
        ) {
          const [_from, _to, _transactionHash, exitReason] = JSON.parse(
            maybeEthereumExecuteEvent.event.data.toString()
          );
          if (exitReason.revert) {
            event.method = 'MessageDispatched(Revert)';
          }
        }
      }
    }
    await event.save();
  }

  // Dvm -> 15 -> Substrate
  private findDvmToSubstrate(router: string, count: number) {
    const dvmTransferEvent = this.event?.extrinsic?.events.find((item) => {
      if (item.event.method === 'DVMTransfer') {
        const [_1, to, amount] = JSON.parse(item.event.data.toString());

        return count === amount && to === router;
      }

      return false;
    });

    const executedEvent = this.event.extrinsic.events.find(
      (item) => item.event.method === 'Executed'
    );

    return { dvmTransferEvent, executedEvent };
  }

  private async handleDvmToSubstrateOldVersion() {
    const [from, to, amount] = JSON.parse(this.data);
    let sender = AccountHandler.formatAddress(from);
    const recipient = AccountHandler.formatAddress(to);
    const senderIsDvm = AccountHandler.isDvmAddress(sender);
    const recipientIsDvm = AccountHandler.isDvmAddress(recipient);

    if (senderIsDvm && !recipientIsDvm) {
      const { dvmTransferEvent, executedEvent } = this.findDvmToSubstrate(from, amount);

      if (!dvmTransferEvent) {
        return;
      }

      const [iFrom] = JSON.parse(dvmTransferEvent.event.data.toString());
      const [_from, _to, txHash] = JSON.parse(executedEvent.event.data.toString());

      sender = AccountHandler.formatAddress(iFrom);

      const senderDvm = AccountHandler.truncateToDvmAddress(sender);

      await this.handleTransfer('pangolin-dvm', 'pangolin', senderDvm, recipient, amount, txHash);
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

      await this.handleTransfer('pangolin', 'pangolin-dvm', sender, recipientDvm, amount);
    } else if (senderIsDvm && !recipientIsDvm) {
      const senderDvm = AccountHandler.truncateToDvmAddress(sender);

      const executedEvent = this.event.extrinsic.events.find(
        (item) => item.event.method === 'Executed'
      );

      if (executedEvent) {
        const [_from, _to, txHash] = JSON.parse(executedEvent.event.data.toString());

        await this.handleTransfer(
          'pangolin-dvm',
          'pangolin',
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
    // [lane_id, message_nonce, sender, recipient, amount]
    const [laneId, nonce, from, to, value] = JSON.parse(this.data) as [
      string,
      bigint,
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
      }
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
