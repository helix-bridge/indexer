import { Args, Query, Resolver } from '@nestjs/graphql';
import { AccountService } from './account.service';

@Resolver('accounts')
export class AccountResolver {
  constructor(private accountService: AccountService) {}

  @Query()
  async accounts(@Args('chain') chain: string) {
    return this.accountService.getAccounts(chain);
  }
}
