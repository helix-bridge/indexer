import Web3 from 'web3';
import * as ethUtil from 'ethereumjs-util';

class GuardInfo {
  fromChain: string;
  toChain: string;
  bridge: string;
  chainId: number;
  depositor: string;
  contract: string;
}

export class GuardService {
  private readonly web3 = new Web3(Web3.givenProvider);

  private readonly guardConfig: GuardInfo[] = [
    {
      fromChain: 'crab-dvm',
      toChain: 'sepolia',
      bridge: 'xtoken-crab-dvm',
      chainId: 11155111,
      depositor: '0xf22D0bb66b39745Ae6e3fEa3E5859d7f0b367Fd1',
      contract: '0xcc357d5A8E5dBD52bC508E0FE491137d912F6bc8',
    },
  ];

  recoverPubkey(
    fromChain: string,
    toChain: string,
    bridge: string,
    transferId: string,
    timestamp: string,
    token: string,
    recipient: string,
    amount: string,
    sig: string
  ): string | null {
    const info = this.guardConfig.find((info) => {
      return info.fromChain === fromChain && info.toChain === toChain && info.bridge === bridge;
    });
    if (!info) {
      return null;
    }
    const dataHash = this.generateDataHash(
      info.depositor,
      transferId,
      timestamp,
      token,
      recipient,
      amount,
      info.chainId,
      info.contract
    );
    return this.ecrecover(dataHash, sig);
  }

  private generateDataHash(
    depositor: string,
    transferId: string,
    timestamp: string,
    token: string,
    recipient: string,
    amount: string,
    chainId: number,
    contractAddress: string
  ): string {
    const claimSign = this.web3.eth.abi.encodeFunctionSignature(
      'claim(address,uint256,uint256,address,address,uint256,bytes[])'
    );
    const param = this.web3.eth.abi.encodeParameters(
      ['address', 'uint256', 'uint256', 'address', 'address', 'uint256'],
      [depositor, transferId, timestamp, token, recipient, amount]
    );
    const message = this.web3.eth.abi.encodeParameters(['bytes4', 'bytes'], [claimSign, param]);
    const structHash = this.web3.utils.keccak256(message);
    const DOMAIN_SEPARATOR_TYPEHASH = this.web3.utils.keccak256(
      'EIP712Domain(uint256 chainId,address verifyingContract)'
    );
    const domainSeparator = this.web3.utils.keccak256(
      this.web3.eth.abi.encodeParameters(
        ['bytes32', 'uint256', 'address'],
        [DOMAIN_SEPARATOR_TYPEHASH, chainId, contractAddress]
      )
    );
    return this.web3.utils.keccak256(
      '0x1901' + domainSeparator.substring(2) + structHash.substring(2)
    );
  }

  private ecrecover(hash: string, sig: string): string {
    const sigObj = ethUtil.fromRpcSig(sig);
    const pubkey = ethUtil.ecrecover(
      Buffer.from(hash.substr(2), 'hex'),
      sigObj.v,
      sigObj.r,
      sigObj.s
    );
    return ethUtil.bufferToHex(ethUtil.publicToAddress(pubkey)).toLowerCase();
  }
}
