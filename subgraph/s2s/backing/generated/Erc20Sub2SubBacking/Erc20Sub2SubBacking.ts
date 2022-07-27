// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class DailyLimitChange extends ethereum.Event {
  get params(): DailyLimitChange__Params {
    return new DailyLimitChange__Params(this);
  }
}

export class DailyLimitChange__Params {
  _event: DailyLimitChange;

  constructor(event: DailyLimitChange) {
    this._event = event;
  }

  get token(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get dailyLimit(): BigInt {
    return this._event.parameters[1].value.toBigInt();
  }
}

export class NewErc20TokenRegistered extends ethereum.Event {
  get params(): NewErc20TokenRegistered__Params {
    return new NewErc20TokenRegistered__Params(this);
  }
}

export class NewErc20TokenRegistered__Params {
  _event: NewErc20TokenRegistered;

  constructor(event: NewErc20TokenRegistered) {
    this._event = event;
  }

  get transferId(): BigInt {
    return this._event.parameters[0].value.toBigInt();
  }

  get token(): Address {
    return this._event.parameters[1].value.toAddress();
  }
}

export class Paused extends ethereum.Event {
  get params(): Paused__Params {
    return new Paused__Params(this);
  }
}

export class Paused__Params {
  _event: Paused;

  constructor(event: Paused) {
    this._event = event;
  }

  get account(): Address {
    return this._event.parameters[0].value.toAddress();
  }
}

export class RoleAdminChanged extends ethereum.Event {
  get params(): RoleAdminChanged__Params {
    return new RoleAdminChanged__Params(this);
  }
}

export class RoleAdminChanged__Params {
  _event: RoleAdminChanged;

  constructor(event: RoleAdminChanged) {
    this._event = event;
  }

  get role(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get previousAdminRole(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }

  get newAdminRole(): Bytes {
    return this._event.parameters[2].value.toBytes();
  }
}

export class RoleGranted extends ethereum.Event {
  get params(): RoleGranted__Params {
    return new RoleGranted__Params(this);
  }
}

export class RoleGranted__Params {
  _event: RoleGranted;

  constructor(event: RoleGranted) {
    this._event = event;
  }

  get role(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get account(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get sender(): Address {
    return this._event.parameters[2].value.toAddress();
  }
}

export class RoleRevoked extends ethereum.Event {
  get params(): RoleRevoked__Params {
    return new RoleRevoked__Params(this);
  }
}

export class RoleRevoked__Params {
  _event: RoleRevoked;

  constructor(event: RoleRevoked) {
    this._event = event;
  }

  get role(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get account(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get sender(): Address {
    return this._event.parameters[2].value.toAddress();
  }
}

export class TokenLocked extends ethereum.Event {
  get params(): TokenLocked__Params {
    return new TokenLocked__Params(this);
  }
}

export class TokenLocked__Params {
  _event: TokenLocked;

  constructor(event: TokenLocked) {
    this._event = event;
  }

  get transferId(): BigInt {
    return this._event.parameters[0].value.toBigInt();
  }

  get hash(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }

  get token(): Address {
    return this._event.parameters[2].value.toAddress();
  }

  get sender(): Address {
    return this._event.parameters[3].value.toAddress();
  }

  get recipient(): Address {
    return this._event.parameters[4].value.toAddress();
  }

  get amount(): BigInt {
    return this._event.parameters[5].value.toBigInt();
  }

  get fee(): BigInt {
    return this._event.parameters[6].value.toBigInt();
  }
}

export class TokenUnlocked extends ethereum.Event {
  get params(): TokenUnlocked__Params {
    return new TokenUnlocked__Params(this);
  }
}

export class TokenUnlocked__Params {
  _event: TokenUnlocked;

  constructor(event: TokenUnlocked) {
    this._event = event;
  }

  get token(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get recipient(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get amount(): BigInt {
    return this._event.parameters[2].value.toBigInt();
  }
}

export class TokenUnlockedForFailed extends ethereum.Event {
  get params(): TokenUnlockedForFailed__Params {
    return new TokenUnlockedForFailed__Params(this);
  }
}

export class TokenUnlockedForFailed__Params {
  _event: TokenUnlockedForFailed;

  constructor(event: TokenUnlockedForFailed) {
    this._event = event;
  }

  get transferId(): BigInt {
    return this._event.parameters[0].value.toBigInt();
  }

  get token(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get recipient(): Address {
    return this._event.parameters[2].value.toAddress();
  }

  get amount(): BigInt {
    return this._event.parameters[3].value.toBigInt();
  }
}

export class Unpaused extends ethereum.Event {
  get params(): Unpaused__Params {
    return new Unpaused__Params(this);
  }
}

export class Unpaused__Params {
  _event: Unpaused;

  constructor(event: Unpaused) {
    this._event = event;
  }

  get account(): Address {
    return this._event.parameters[0].value.toAddress();
  }
}

export class Erc20Sub2SubBacking extends ethereum.SmartContract {
  static bind(address: Address): Erc20Sub2SubBacking {
    return new Erc20Sub2SubBacking("Erc20Sub2SubBacking", address);
  }

  CALLER_ROLE(): Bytes {
    let result = super.call("CALLER_ROLE", "CALLER_ROLE():(bytes32)", []);

    return result[0].toBytes();
  }

  try_CALLER_ROLE(): ethereum.CallResult<Bytes> {
    let result = super.tryCall("CALLER_ROLE", "CALLER_ROLE():(bytes32)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBytes());
  }

  DAO_ADMIN_ROLE(): Bytes {
    let result = super.call("DAO_ADMIN_ROLE", "DAO_ADMIN_ROLE():(bytes32)", []);

    return result[0].toBytes();
  }

  try_DAO_ADMIN_ROLE(): ethereum.CallResult<Bytes> {
    let result = super.tryCall(
      "DAO_ADMIN_ROLE",
      "DAO_ADMIN_ROLE():(bytes32)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBytes());
  }

  DEFAULT_ADMIN_ROLE(): Bytes {
    let result = super.call(
      "DEFAULT_ADMIN_ROLE",
      "DEFAULT_ADMIN_ROLE():(bytes32)",
      []
    );

    return result[0].toBytes();
  }

  try_DEFAULT_ADMIN_ROLE(): ethereum.CallResult<Bytes> {
    let result = super.tryCall(
      "DEFAULT_ADMIN_ROLE",
      "DEFAULT_ADMIN_ROLE():(bytes32)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBytes());
  }

  ERC20_TOKEN_TYPE(): BigInt {
    let result = super.call(
      "ERC20_TOKEN_TYPE",
      "ERC20_TOKEN_TYPE():(uint32)",
      []
    );

    return result[0].toBigInt();
  }

  try_ERC20_TOKEN_TYPE(): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "ERC20_TOKEN_TYPE",
      "ERC20_TOKEN_TYPE():(uint32)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  NATIVE_TOKEN_TYPE(): BigInt {
    let result = super.call(
      "NATIVE_TOKEN_TYPE",
      "NATIVE_TOKEN_TYPE():(uint32)",
      []
    );

    return result[0].toBigInt();
  }

  try_NATIVE_TOKEN_TYPE(): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "NATIVE_TOKEN_TYPE",
      "NATIVE_TOKEN_TYPE():(uint32)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  OPERATOR_ROLE(): Bytes {
    let result = super.call("OPERATOR_ROLE", "OPERATOR_ROLE():(bytes32)", []);

    return result[0].toBytes();
  }

  try_OPERATOR_ROLE(): ethereum.CallResult<Bytes> {
    let result = super.tryCall(
      "OPERATOR_ROLE",
      "OPERATOR_ROLE():(bytes32)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBytes());
  }

  calcMaxWithdraw(token: Address): BigInt {
    let result = super.call(
      "calcMaxWithdraw",
      "calcMaxWithdraw(address):(uint256)",
      [ethereum.Value.fromAddress(token)]
    );

    return result[0].toBigInt();
  }

  try_calcMaxWithdraw(token: Address): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "calcMaxWithdraw",
      "calcMaxWithdraw(address):(uint256)",
      [ethereum.Value.fromAddress(token)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  chainName(): string {
    let result = super.call("chainName", "chainName():(string)", []);

    return result[0].toString();
  }

  try_chainName(): ethereum.CallResult<string> {
    let result = super.tryCall("chainName", "chainName():(string)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toString());
  }

  dailyLimit(param0: Address): BigInt {
    let result = super.call("dailyLimit", "dailyLimit(address):(uint256)", [
      ethereum.Value.fromAddress(param0)
    ]);

    return result[0].toBigInt();
  }

  try_dailyLimit(param0: Address): ethereum.CallResult<BigInt> {
    let result = super.tryCall("dailyLimit", "dailyLimit(address):(uint256)", [
      ethereum.Value.fromAddress(param0)
    ]);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  fee(): BigInt {
    let result = super.call("fee", "fee():(uint256)", []);

    return result[0].toBigInt();
  }

  try_fee(): ethereum.CallResult<BigInt> {
    let result = super.tryCall("fee", "fee():(uint256)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  getRoleAdmin(role: Bytes): Bytes {
    let result = super.call("getRoleAdmin", "getRoleAdmin(bytes32):(bytes32)", [
      ethereum.Value.fromFixedBytes(role)
    ]);

    return result[0].toBytes();
  }

  try_getRoleAdmin(role: Bytes): ethereum.CallResult<Bytes> {
    let result = super.tryCall(
      "getRoleAdmin",
      "getRoleAdmin(bytes32):(bytes32)",
      [ethereum.Value.fromFixedBytes(role)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBytes());
  }

  getRoleMember(role: Bytes, index: BigInt): Address {
    let result = super.call(
      "getRoleMember",
      "getRoleMember(bytes32,uint256):(address)",
      [
        ethereum.Value.fromFixedBytes(role),
        ethereum.Value.fromUnsignedBigInt(index)
      ]
    );

    return result[0].toAddress();
  }

  try_getRoleMember(role: Bytes, index: BigInt): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "getRoleMember",
      "getRoleMember(bytes32,uint256):(address)",
      [
        ethereum.Value.fromFixedBytes(role),
        ethereum.Value.fromUnsignedBigInt(index)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  getRoleMemberCount(role: Bytes): BigInt {
    let result = super.call(
      "getRoleMemberCount",
      "getRoleMemberCount(bytes32):(uint256)",
      [ethereum.Value.fromFixedBytes(role)]
    );

    return result[0].toBigInt();
  }

  try_getRoleMemberCount(role: Bytes): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "getRoleMemberCount",
      "getRoleMemberCount(bytes32):(uint256)",
      [ethereum.Value.fromFixedBytes(role)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  guard(): Address {
    let result = super.call("guard", "guard():(address)", []);

    return result[0].toAddress();
  }

  try_guard(): ethereum.CallResult<Address> {
    let result = super.tryCall("guard", "guard():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  hasRole(role: Bytes, account: Address): boolean {
    let result = super.call("hasRole", "hasRole(bytes32,address):(bool)", [
      ethereum.Value.fromFixedBytes(role),
      ethereum.Value.fromAddress(account)
    ]);

    return result[0].toBoolean();
  }

  try_hasRole(role: Bytes, account: Address): ethereum.CallResult<boolean> {
    let result = super.tryCall("hasRole", "hasRole(bytes32,address):(bool)", [
      ethereum.Value.fromFixedBytes(role),
      ethereum.Value.fromAddress(account)
    ]);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBoolean());
  }

  hash(value: Bytes): Bytes {
    let result = super.call("hash", "hash(bytes):(bytes32)", [
      ethereum.Value.fromBytes(value)
    ]);

    return result[0].toBytes();
  }

  try_hash(value: Bytes): ethereum.CallResult<Bytes> {
    let result = super.tryCall("hash", "hash(bytes):(bytes32)", [
      ethereum.Value.fromBytes(value)
    ]);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBytes());
  }

  helixFee(): BigInt {
    let result = super.call("helixFee", "helixFee():(uint256)", []);

    return result[0].toBigInt();
  }

  try_helixFee(): ethereum.CallResult<BigInt> {
    let result = super.tryCall("helixFee", "helixFee():(uint256)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  lastDay(param0: Address): BigInt {
    let result = super.call("lastDay", "lastDay(address):(uint256)", [
      ethereum.Value.fromAddress(param0)
    ]);

    return result[0].toBigInt();
  }

  try_lastDay(param0: Address): ethereum.CallResult<BigInt> {
    let result = super.tryCall("lastDay", "lastDay(address):(uint256)", [
      ethereum.Value.fromAddress(param0)
    ]);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  messageEndpoint(): Address {
    let result = super.call(
      "messageEndpoint",
      "messageEndpoint():(address)",
      []
    );

    return result[0].toAddress();
  }

  try_messageEndpoint(): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "messageEndpoint",
      "messageEndpoint():(address)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  paused(): boolean {
    let result = super.call("paused", "paused():(bool)", []);

    return result[0].toBoolean();
  }

  try_paused(): ethereum.CallResult<boolean> {
    let result = super.tryCall("paused", "paused():(bool)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBoolean());
  }

  remoteMappingTokenFactory(): Address {
    let result = super.call(
      "remoteMappingTokenFactory",
      "remoteMappingTokenFactory():(address)",
      []
    );

    return result[0].toAddress();
  }

  try_remoteMappingTokenFactory(): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "remoteMappingTokenFactory",
      "remoteMappingTokenFactory():(address)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  spentToday(param0: Address): BigInt {
    let result = super.call("spentToday", "spentToday(address):(uint256)", [
      ethereum.Value.fromAddress(param0)
    ]);

    return result[0].toBigInt();
  }

  try_spentToday(param0: Address): ethereum.CallResult<BigInt> {
    let result = super.tryCall("spentToday", "spentToday(address):(uint256)", [
      ethereum.Value.fromAddress(param0)
    ]);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  supportsInterface(interfaceId: Bytes): boolean {
    let result = super.call(
      "supportsInterface",
      "supportsInterface(bytes4):(bool)",
      [ethereum.Value.fromFixedBytes(interfaceId)]
    );

    return result[0].toBoolean();
  }

  try_supportsInterface(interfaceId: Bytes): ethereum.CallResult<boolean> {
    let result = super.tryCall(
      "supportsInterface",
      "supportsInterface(bytes4):(bool)",
      [ethereum.Value.fromFixedBytes(interfaceId)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBoolean());
  }
}

export class ChangeDailyLimitCall extends ethereum.Call {
  get inputs(): ChangeDailyLimitCall__Inputs {
    return new ChangeDailyLimitCall__Inputs(this);
  }

  get outputs(): ChangeDailyLimitCall__Outputs {
    return new ChangeDailyLimitCall__Outputs(this);
  }
}

export class ChangeDailyLimitCall__Inputs {
  _call: ChangeDailyLimitCall;

  constructor(call: ChangeDailyLimitCall) {
    this._call = call;
  }

  get mappingToken(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get amount(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }
}

export class ChangeDailyLimitCall__Outputs {
  _call: ChangeDailyLimitCall;

  constructor(call: ChangeDailyLimitCall) {
    this._call = call;
  }
}

export class GrantRoleCall extends ethereum.Call {
  get inputs(): GrantRoleCall__Inputs {
    return new GrantRoleCall__Inputs(this);
  }

  get outputs(): GrantRoleCall__Outputs {
    return new GrantRoleCall__Outputs(this);
  }
}

export class GrantRoleCall__Inputs {
  _call: GrantRoleCall;

  constructor(call: GrantRoleCall) {
    this._call = call;
  }

  get role(): Bytes {
    return this._call.inputValues[0].value.toBytes();
  }

  get account(): Address {
    return this._call.inputValues[1].value.toAddress();
  }
}

export class GrantRoleCall__Outputs {
  _call: GrantRoleCall;

  constructor(call: GrantRoleCall) {
    this._call = call;
  }
}

export class HandleUnlockFailureFromRemoteCall extends ethereum.Call {
  get inputs(): HandleUnlockFailureFromRemoteCall__Inputs {
    return new HandleUnlockFailureFromRemoteCall__Inputs(this);
  }

  get outputs(): HandleUnlockFailureFromRemoteCall__Outputs {
    return new HandleUnlockFailureFromRemoteCall__Outputs(this);
  }
}

export class HandleUnlockFailureFromRemoteCall__Inputs {
  _call: HandleUnlockFailureFromRemoteCall;

  constructor(call: HandleUnlockFailureFromRemoteCall) {
    this._call = call;
  }

  get transferId(): BigInt {
    return this._call.inputValues[0].value.toBigInt();
  }

  get token(): Address {
    return this._call.inputValues[1].value.toAddress();
  }

  get origin_sender(): Address {
    return this._call.inputValues[2].value.toAddress();
  }

  get amount(): BigInt {
    return this._call.inputValues[3].value.toBigInt();
  }
}

export class HandleUnlockFailureFromRemoteCall__Outputs {
  _call: HandleUnlockFailureFromRemoteCall;

  constructor(call: HandleUnlockFailureFromRemoteCall) {
    this._call = call;
  }
}

export class InitializeCall extends ethereum.Call {
  get inputs(): InitializeCall__Inputs {
    return new InitializeCall__Inputs(this);
  }

  get outputs(): InitializeCall__Outputs {
    return new InitializeCall__Outputs(this);
  }
}

export class InitializeCall__Inputs {
  _call: InitializeCall;

  constructor(call: InitializeCall) {
    this._call = call;
  }

  get _messageEndpoint(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class InitializeCall__Outputs {
  _call: InitializeCall;

  constructor(call: InitializeCall) {
    this._call = call;
  }
}

export class LockAndRemoteIssuingCall extends ethereum.Call {
  get inputs(): LockAndRemoteIssuingCall__Inputs {
    return new LockAndRemoteIssuingCall__Inputs(this);
  }

  get outputs(): LockAndRemoteIssuingCall__Outputs {
    return new LockAndRemoteIssuingCall__Outputs(this);
  }
}

export class LockAndRemoteIssuingCall__Inputs {
  _call: LockAndRemoteIssuingCall;

  constructor(call: LockAndRemoteIssuingCall) {
    this._call = call;
  }

  get remoteSpecVersion(): BigInt {
    return this._call.inputValues[0].value.toBigInt();
  }

  get remoteReceiveGasLimit(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }

  get token(): Address {
    return this._call.inputValues[2].value.toAddress();
  }

  get recipient(): Address {
    return this._call.inputValues[3].value.toAddress();
  }

  get amount(): BigInt {
    return this._call.inputValues[4].value.toBigInt();
  }
}

export class LockAndRemoteIssuingCall__Outputs {
  _call: LockAndRemoteIssuingCall;

  constructor(call: LockAndRemoteIssuingCall) {
    this._call = call;
  }
}

export class PauseCall extends ethereum.Call {
  get inputs(): PauseCall__Inputs {
    return new PauseCall__Inputs(this);
  }

  get outputs(): PauseCall__Outputs {
    return new PauseCall__Outputs(this);
  }
}

export class PauseCall__Inputs {
  _call: PauseCall;

  constructor(call: PauseCall) {
    this._call = call;
  }
}

export class PauseCall__Outputs {
  _call: PauseCall;

  constructor(call: PauseCall) {
    this._call = call;
  }
}

export class RegisterCall extends ethereum.Call {
  get inputs(): RegisterCall__Inputs {
    return new RegisterCall__Inputs(this);
  }

  get outputs(): RegisterCall__Outputs {
    return new RegisterCall__Outputs(this);
  }
}

export class RegisterCall__Inputs {
  _call: RegisterCall;

  constructor(call: RegisterCall) {
    this._call = call;
  }

  get remoteSpecVersion(): BigInt {
    return this._call.inputValues[0].value.toBigInt();
  }

  get remoteReceiveGasLimit(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }

  get token(): Address {
    return this._call.inputValues[2].value.toAddress();
  }

  get name(): string {
    return this._call.inputValues[3].value.toString();
  }

  get symbol(): string {
    return this._call.inputValues[4].value.toString();
  }

  get decimals(): i32 {
    return this._call.inputValues[5].value.toI32();
  }

  get dailyLimit(): BigInt {
    return this._call.inputValues[6].value.toBigInt();
  }
}

export class RegisterCall__Outputs {
  _call: RegisterCall;

  constructor(call: RegisterCall) {
    this._call = call;
  }
}

export class RemoteIssuingFailureCall extends ethereum.Call {
  get inputs(): RemoteIssuingFailureCall__Inputs {
    return new RemoteIssuingFailureCall__Inputs(this);
  }

  get outputs(): RemoteIssuingFailureCall__Outputs {
    return new RemoteIssuingFailureCall__Outputs(this);
  }
}

export class RemoteIssuingFailureCall__Inputs {
  _call: RemoteIssuingFailureCall;

  constructor(call: RemoteIssuingFailureCall) {
    this._call = call;
  }

  get remoteSpecVersion(): BigInt {
    return this._call.inputValues[0].value.toBigInt();
  }

  get remoteReceiveGasLimit(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }

  get transferId(): BigInt {
    return this._call.inputValues[2].value.toBigInt();
  }

  get mappingToken(): Address {
    return this._call.inputValues[3].value.toAddress();
  }

  get originalSender(): Address {
    return this._call.inputValues[4].value.toAddress();
  }

  get amount(): BigInt {
    return this._call.inputValues[5].value.toBigInt();
  }
}

export class RemoteIssuingFailureCall__Outputs {
  _call: RemoteIssuingFailureCall;

  constructor(call: RemoteIssuingFailureCall) {
    this._call = call;
  }
}

export class RenounceRoleCall extends ethereum.Call {
  get inputs(): RenounceRoleCall__Inputs {
    return new RenounceRoleCall__Inputs(this);
  }

  get outputs(): RenounceRoleCall__Outputs {
    return new RenounceRoleCall__Outputs(this);
  }
}

export class RenounceRoleCall__Inputs {
  _call: RenounceRoleCall;

  constructor(call: RenounceRoleCall) {
    this._call = call;
  }

  get role(): Bytes {
    return this._call.inputValues[0].value.toBytes();
  }

  get account(): Address {
    return this._call.inputValues[1].value.toAddress();
  }
}

export class RenounceRoleCall__Outputs {
  _call: RenounceRoleCall;

  constructor(call: RenounceRoleCall) {
    this._call = call;
  }
}

export class RescueFundsCall extends ethereum.Call {
  get inputs(): RescueFundsCall__Inputs {
    return new RescueFundsCall__Inputs(this);
  }

  get outputs(): RescueFundsCall__Outputs {
    return new RescueFundsCall__Outputs(this);
  }
}

export class RescueFundsCall__Inputs {
  _call: RescueFundsCall;

  constructor(call: RescueFundsCall) {
    this._call = call;
  }

  get token(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get recipient(): Address {
    return this._call.inputValues[1].value.toAddress();
  }

  get amount(): BigInt {
    return this._call.inputValues[2].value.toBigInt();
  }
}

export class RescueFundsCall__Outputs {
  _call: RescueFundsCall;

  constructor(call: RescueFundsCall) {
    this._call = call;
  }
}

export class RevokeRoleCall extends ethereum.Call {
  get inputs(): RevokeRoleCall__Inputs {
    return new RevokeRoleCall__Inputs(this);
  }

  get outputs(): RevokeRoleCall__Outputs {
    return new RevokeRoleCall__Outputs(this);
  }
}

export class RevokeRoleCall__Inputs {
  _call: RevokeRoleCall;

  constructor(call: RevokeRoleCall) {
    this._call = call;
  }

  get role(): Bytes {
    return this._call.inputValues[0].value.toBytes();
  }

  get account(): Address {
    return this._call.inputValues[1].value.toAddress();
  }
}

export class RevokeRoleCall__Outputs {
  _call: RevokeRoleCall;

  constructor(call: RevokeRoleCall) {
    this._call = call;
  }
}

export class SetChainNameCall extends ethereum.Call {
  get inputs(): SetChainNameCall__Inputs {
    return new SetChainNameCall__Inputs(this);
  }

  get outputs(): SetChainNameCall__Outputs {
    return new SetChainNameCall__Outputs(this);
  }
}

export class SetChainNameCall__Inputs {
  _call: SetChainNameCall;

  constructor(call: SetChainNameCall) {
    this._call = call;
  }

  get _chainName(): string {
    return this._call.inputValues[0].value.toString();
  }
}

export class SetChainNameCall__Outputs {
  _call: SetChainNameCall;

  constructor(call: SetChainNameCall) {
    this._call = call;
  }
}

export class SetHelixFeeCall extends ethereum.Call {
  get inputs(): SetHelixFeeCall__Inputs {
    return new SetHelixFeeCall__Inputs(this);
  }

  get outputs(): SetHelixFeeCall__Outputs {
    return new SetHelixFeeCall__Outputs(this);
  }
}

export class SetHelixFeeCall__Inputs {
  _call: SetHelixFeeCall;

  constructor(call: SetHelixFeeCall) {
    this._call = call;
  }

  get _helixFee(): BigInt {
    return this._call.inputValues[0].value.toBigInt();
  }
}

export class SetHelixFeeCall__Outputs {
  _call: SetHelixFeeCall;

  constructor(call: SetHelixFeeCall) {
    this._call = call;
  }
}

export class SetMessageEndpointCall extends ethereum.Call {
  get inputs(): SetMessageEndpointCall__Inputs {
    return new SetMessageEndpointCall__Inputs(this);
  }

  get outputs(): SetMessageEndpointCall__Outputs {
    return new SetMessageEndpointCall__Outputs(this);
  }
}

export class SetMessageEndpointCall__Inputs {
  _call: SetMessageEndpointCall;

  constructor(call: SetMessageEndpointCall) {
    this._call = call;
  }

  get _messageEndpoint(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class SetMessageEndpointCall__Outputs {
  _call: SetMessageEndpointCall;

  constructor(call: SetMessageEndpointCall) {
    this._call = call;
  }
}

export class SetRemoteMappingTokenFactoryCall extends ethereum.Call {
  get inputs(): SetRemoteMappingTokenFactoryCall__Inputs {
    return new SetRemoteMappingTokenFactoryCall__Inputs(this);
  }

  get outputs(): SetRemoteMappingTokenFactoryCall__Outputs {
    return new SetRemoteMappingTokenFactoryCall__Outputs(this);
  }
}

export class SetRemoteMappingTokenFactoryCall__Inputs {
  _call: SetRemoteMappingTokenFactoryCall;

  constructor(call: SetRemoteMappingTokenFactoryCall) {
    this._call = call;
  }

  get _remoteMappingTokenFactory(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class SetRemoteMappingTokenFactoryCall__Outputs {
  _call: SetRemoteMappingTokenFactoryCall;

  constructor(call: SetRemoteMappingTokenFactoryCall) {
    this._call = call;
  }
}

export class UnlockFromRemoteCall extends ethereum.Call {
  get inputs(): UnlockFromRemoteCall__Inputs {
    return new UnlockFromRemoteCall__Inputs(this);
  }

  get outputs(): UnlockFromRemoteCall__Outputs {
    return new UnlockFromRemoteCall__Outputs(this);
  }
}

export class UnlockFromRemoteCall__Inputs {
  _call: UnlockFromRemoteCall;

  constructor(call: UnlockFromRemoteCall) {
    this._call = call;
  }

  get token(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get recipient(): Address {
    return this._call.inputValues[1].value.toAddress();
  }

  get amount(): BigInt {
    return this._call.inputValues[2].value.toBigInt();
  }
}

export class UnlockFromRemoteCall__Outputs {
  _call: UnlockFromRemoteCall;

  constructor(call: UnlockFromRemoteCall) {
    this._call = call;
  }
}

export class UnpauseCall extends ethereum.Call {
  get inputs(): UnpauseCall__Inputs {
    return new UnpauseCall__Inputs(this);
  }

  get outputs(): UnpauseCall__Outputs {
    return new UnpauseCall__Outputs(this);
  }
}

export class UnpauseCall__Inputs {
  _call: UnpauseCall;

  constructor(call: UnpauseCall) {
    this._call = call;
  }
}

export class UnpauseCall__Outputs {
  _call: UnpauseCall;

  constructor(call: UnpauseCall) {
    this._call = call;
  }
}

export class UpdateGuardCall extends ethereum.Call {
  get inputs(): UpdateGuardCall__Inputs {
    return new UpdateGuardCall__Inputs(this);
  }

  get outputs(): UpdateGuardCall__Outputs {
    return new UpdateGuardCall__Outputs(this);
  }
}

export class UpdateGuardCall__Inputs {
  _call: UpdateGuardCall;

  constructor(call: UpdateGuardCall) {
    this._call = call;
  }

  get newGuard(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class UpdateGuardCall__Outputs {
  _call: UpdateGuardCall;

  constructor(call: UpdateGuardCall) {
    this._call = call;
  }
}

export class WithdrawFeeCall extends ethereum.Call {
  get inputs(): WithdrawFeeCall__Inputs {
    return new WithdrawFeeCall__Inputs(this);
  }

  get outputs(): WithdrawFeeCall__Outputs {
    return new WithdrawFeeCall__Outputs(this);
  }
}

export class WithdrawFeeCall__Inputs {
  _call: WithdrawFeeCall;

  constructor(call: WithdrawFeeCall) {
    this._call = call;
  }

  get recipient(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get amount(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }
}

export class WithdrawFeeCall__Outputs {
  _call: WithdrawFeeCall;

  constructor(call: WithdrawFeeCall) {
    this._call = call;
  }
}
