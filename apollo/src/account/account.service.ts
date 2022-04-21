import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Accounts } from '../graphql';

@Injectable()
export class AccountService {
  constructor(private configService: ConfigService) {}

  async getAccounts(chain?: string): Promise<Accounts | null> {
    const subql = this.configService.get<string>('SUBQL');

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
