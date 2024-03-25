import Web3 from 'web3';
import * as ethUtil from 'ethereumjs-util';

class GuardInfo {
  fromChain: string;
  toChain: string;
  bridge: string;
  chainId: number;
  depositor: string | null;
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
      depositor: '0x3B36c2Db4CC5E92Af015Eb572A1C95C95599a8bF',
      contract: '0x4CA75992d2750BEC270731A72DfDedE6b9E71cC7',
    },
    {
      fromChain: 'sepolia',
      toChain: 'pangolin-dvm',
      bridge: 'xtoken-sepolia',
      chainId: 43,
      depositor: '0x7E3105E3A13D55d824b6322cbD2049f098a097F6',
      contract: '0x4CA75992d2750BEC270731A72DfDedE6b9E71cC7',
    },
    {
      fromChain: 'darwinia-dvm',
      toChain: 'ethereum',
      bridge: 'helix-sub2ethv2(lock)',
      chainId: 1,
      depositor: null,
      contract: '0x61B6B8c7C00aA7F060a2BEDeE6b11927CC9c3eF1',
    }
  ];

  recoverPubkey(
    fromChain: string,
    toChain: string,
    bridge: string,
    transferId: string,
    timestamp: string,
    token: string,
    amount: string,
    extData: string,
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
      amount,
      extData,
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
    amount: string,
    extData: string,
    chainId: number,
    contractAddress: string
  ): string {
    const claimSign = this.web3.eth.abi.encodeFunctionSignature(
      'claim(address,uint256,uint256,address,uint256,bytes,bytes[])'
    );
    const param = this.web3.eth.abi.encodeParameters(
      ['address', 'uint256', 'uint256', 'address', 'uint256', 'bytes'],
      [depositor, transferId, timestamp, token, amount, extData]
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
