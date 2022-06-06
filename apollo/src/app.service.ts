import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {
    console.log('in apps', this.configService.get('CHAIN_TYPE'));
  }
  getHello(): string {
    return 'Hello World!';
  }
}
