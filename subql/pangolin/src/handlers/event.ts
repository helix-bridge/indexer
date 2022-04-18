import { SubstrateEvent } from '@subql/types';
import { Block, BridgeDispatchEvent, Transfer } from '../types';
import { AccountHandler } from './account';

export class EventHandler {
  private dvmKtonContract = '0x8809f9b3acef1da309f49b5ab97a4c0faa64e6ae';
  private dvmWithdrawAddress = '0x0000000000000000000000000000000000000015';
  private dvmWithdrawSS58Format = '5elrpqut7c3mwtjeo28dtksbya7pgzyrtvbrsfrue9efu7jj';

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
    if (this.section === 'bridgePangoroDispatch') {
      await this.handleBridgeDispatchEvent();
    }

    if (this.method === 'Transfer' && (this.section === 'balances' || this.section === 'kton')) {
      await this.handleMainToSmartTransfer();
    }

    if (this.section === 'ethereum') {
      await this.handleSmartToMainTransfer();
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

  private async handleTransfer(from: string, to: string, amount: number | string) {
    const sender = AccountHandler.convertToDVMAddress(from);
    const recipient = AccountHandler.convertToDVMAddress(to);

    await AccountHandler.ensureAccount(recipient);
    await AccountHandler.updateTransferStatistic(recipient);
    await AccountHandler.ensureAccount(sender);
    await AccountHandler.updateTransferStatistic(sender);

    const transfer = new Transfer(this.extrinsicHash);

    transfer.recipientId = recipient;
    transfer.senderId = sender;

    transfer.section = this.section;
    transfer.method = this.method;
    transfer.amount = BigInt(amount ?? 0);
    transfer.timestamp = this.timestamp;

    transfer.block = this.simpleBlock();

    try {
      await transfer.save();
    } catch (error) {
      console.log(error.message);
    }
  }

  private async handleMainToSmartTransfer() {
    const [from, to, amount] = JSON.parse(this.data);

    await this.handleTransfer(from, to, amount);
  }

  /**
   *  ring transfer 1 -> from: eth to
   */

  private async handleSmartToMainTransfer() {
    const [from, to, amount] = JSON.parse(this.data) as [string, string, string];
    let formattedFrom = from;
    let formattedTo = to;

    if (this.method === 'DVMTransfer') {
      if (to.toLowerCase() === this.dvmWithdrawSS58Format) {
        formattedFrom = AccountHandler.convertToEthereumFormat(from);
      }

      if (from.toLowerCase() === this.dvmWithdrawSS58Format) {
        formattedTo = AccountHandler.convertToDVMAddress(to);
      }
    }

    if (this.method === 'KtonDVMTransfer') {
      if (to.toLowerCase() === this.dvmKtonContract) {
        formattedFrom = AccountHandler.convertToEthereumFormat(from);
      }

      if (from.toLowerCase() === this.dvmKtonContract) {
        formattedTo = AccountHandler.convertToDVMAddress(to);
      }
    }

    const transfer = await Transfer.get(this.extrinsicHash);

    /**
     * transfer to wkton contract KtonDVMTransfer(who, WKTON_ADDRESS, U256)
     * withdraw from wkton contract KtonDVMTransfer(WKTON_ADDRESS, to, U256)
     */
    if (transfer && formattedFrom.toLowerCase() === this.dvmWithdrawAddress) {
      await AccountHandler.ensureAccount(formattedTo);
      await AccountHandler.updateTransferStatistic(formattedTo);

      transfer.mediatorId = transfer.recipientId;
      transfer.recipientId = formattedTo;

      await transfer.save();

      return;
    }

    if (transfer && this.method === 'Executed') {
      await AccountHandler.ensureAccount(formattedFrom);
      await AccountHandler.updateTransferStatistic(formattedFrom);

      // FIXME: if this event belongs to a cross-chain operation, the mediatorId equals to the senderId
      transfer.mediatorId = transfer.senderId;
      transfer.senderId = formattedFrom;

      await transfer.save();

      return;
    }

    if (this.method === 'DVMTransfer' || this.method === 'KtonDVMTransfer') {
      await this.handleTransfer(formattedFrom, formattedTo, amount);
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
