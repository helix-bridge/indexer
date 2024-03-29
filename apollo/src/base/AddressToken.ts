export interface Token {
  token: string;
  decimals: number;
  origin: string;
}

export interface AddressTokenMap {
  [key: string]: Token;
}

export abstract class AddressToken {
  abstract addressToTokenInfo: { [key: string]: AddressTokenMap };

  public getInfoByKey(key: string, subkey: string) {
    return this.addressToTokenInfo[key][subkey.toLowerCase()];
  }

  public findInfoByOrigin(key: string, origin: string) {
    const tokenMap = this.addressToTokenInfo[key];
    return Object.keys(tokenMap).find((k: string) => tokenMap[k].origin === origin);
  }
}
