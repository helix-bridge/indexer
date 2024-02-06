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
      fromChain: 'pangolin-dvm',
      toChain: 'sepolia',
      bridge: 'xtoken-pangolin-dvm',
      chainId: 11155111,
      depositor: '0x371019523b25Ff4F26d977724f976566b08bf741',
      contract: '0x3f200d3b6DA62bcA2F8a93F663b172A7f1AaE9ba',
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
