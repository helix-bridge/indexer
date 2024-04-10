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
      bridge: 'xtoken-pangolin-sepolia',
      chainId: 11155111,
      depositor: '0x1aeC008Af5c604be3525d0bB70fFcc4D7281f30C',
      contract: '0x4CA75992d2750BEC270731A72DfDedE6b9E71cC7',
    },
    {
      fromChain: 'sepolia',
      toChain: 'pangolin-dvm',
      bridge: 'xtoken-pangolin-sepolia',
      chainId: 43,
      depositor: '0x24f8a04F0cA0730F4b8eC3241F15aCc6b3f8Da0a',
      contract: '0x4CA75992d2750BEC270731A72DfDedE6b9E71cC7',
    },
    {
      fromChain: 'darwinia-dvm',
      toChain: 'ethereum',
      bridge: 'xtoken-darwinia-ethereum',
      chainId: 1,
      depositor: '0xDc0C760c0fB4672D06088515F6446a71Df0c64C1',
      contract: '0x4CA75992d2750BEC270731A72DfDedE6b9E71cC7',
    },
    {
      fromChain: 'ethereum',
      toChain: 'darwinia-dvm',
      bridge: 'xtoken-darwinia-ethereum',
      chainId: 46,
      depositor: '0x2B496f19A420C02490dB859fefeCCD71eDc2c046',
      contract: '0x4CA75992d2750BEC270731A72DfDedE6b9E71cC7',
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
