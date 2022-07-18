import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Accounts } from '../graphql';

@Injectable()
export class AccountService {
  private readonly subql = this.configService.get<string>('SUBQL');
  private readonly subqlX = this.configService.get<string>('SUBQL_X');
  private readonly subqlS = this.configService.get<string>('SUBQL_S');

  dispatchEndPoints = {
    pangolin: this.subqlX + 'pchain',
    'pangolin-parachain': this.subqlX + 'ppchain',
    pangoro: this.subqlS + 'pochain',
    crab: this.subql + 'crab',
    'crab-parachain': this.subql + 'cpchain',
    darwinia: this.subql + 'darwinia',
  };

  constructor(private configService: ConfigService) {}

  async getAccounts(chain?: string): Promise<Accounts | null> {
    const query = (chain: string) =>
      axios.post(this.subql + chain, {
        query: `query { accounts { totalCount } }`,
        variables: null,
      });

    if (chain) {
      const res = await query(chain);

      return { total: res.data.data.accounts.totalCount };
    } else {
      const chains =
        this.configService.get<string>('CHAIN_TYPE') === 'test'
          ? ['pangoro', 'pangolin']
          : ['darwinia', 'crab'];
      const results = await Promise.all(chains.map((chain) => query(chain)));

      return { total: results.reduce((acc, cur) => acc + cur.data.data.accounts.totalCount, 0) };
    }
  }
}
