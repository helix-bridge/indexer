import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountResolver } from './account.resolver';
import { AccountService } from './account.service';

@Module({
  imports: [ConfigModule],
  providers: [AccountResolver, AccountService],
})
export class AccountModule {}
