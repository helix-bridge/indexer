import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Accounts } from '../graphql';

@Injectable()
export class AccountService {
  async getAccounts(chain?: string): Promise<Accounts | null> {
    const subql = 'https://api.subquery.network/sq/helix-bridge/';

    const query = (chain: string) =>
      axios.post(subql + chain, {
        query: `query { accounts { totalCount } }`,
        variables: null,
      });

    if (chain) {
      const res = await query(chain);

      return { total: res.data.data.accounts.totalCount };
    } else {
      const results = await Promise.all(['darwinia', 'pangolin'].map((chain) => query(chain)));

      return { total: results.reduce((acc, cur) => acc + cur.data.data.accounts.totalCount, 0) };
    }
  }
}
